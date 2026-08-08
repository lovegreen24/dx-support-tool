import { createSign } from 'node:crypto';

/**
 * Googleサービスアカウント(JWT Bearerフロー)によるアクセストークン取得。
 * 案件管理MCP(M-010)と同一のサービスアカウント資格情報を使い、`/api/case-progress`が
 * 同じ「案件進捗」スプレッドシートを直接HTTPで読むために使う(MCPゲートウェイを経由しない)。
 * バックエンドはNode.js専用(Cloudflare Workers互換性は不要)のため、`node:crypto`を用いる。
 */

export interface ServiceAccountCredentials {
  clientEmail: string;
  privateKey: string;
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
/** 読み取り専用スコープ(本番の/api/case-progressはSheetsを読むだけで書き込まない) */
export const SHEETS_READONLY_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const TOKEN_TTL_SECONDS = 3600;

export class GoogleAuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

/** GOOGLE_SERVICE_ACCOUNT_JSON(文字列)をパース・検証する */
export function parseServiceAccountJson(raw: string): ServiceAccountCredentials {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSONの解析に失敗しました(不正なJSON)');
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.client_email !== 'string' || typeof obj.private_key !== 'string') {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSONにclient_email/private_keyが含まれていません');
  }

  return { clientEmail: obj.client_email, privateKey: obj.private_key };
}

export interface FetchAccessTokenOptions {
  /** 既定は読み取り専用スコープ。テストの後始末など書き込みが必要な場合のみ上書きする */
  scope?: string;
  fetchImpl?: typeof fetch;
  nowSeconds?: number;
}

/** サービスアカウント認証情報からアクセストークンを取得する */
export async function fetchAccessToken(
  credentials: ServiceAccountCredentials,
  options: FetchAccessTokenOptions = {},
): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const scope = options.scope ?? SHEETS_READONLY_SCOPE;

  const jwt = buildSignedJwt(credentials, scope, nowSeconds);

  const response = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new GoogleAuthError(`Google OAuthトークン取得エラー(status=${response.status})`, response.status, body);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

function buildSignedJwt(credentials: ServiceAccountCredentials, scope: string, iatSeconds: number): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: credentials.clientEmail,
    scope,
    aud: TOKEN_URL,
    iat: iatSeconds,
    exp: iatSeconds + TOKEN_TTL_SECONDS,
  };

  const encodedHeader = base64UrlEncode(Buffer.from(JSON.stringify(header), 'utf-8'));
  const encodedClaimSet = base64UrlEncode(Buffer.from(JSON.stringify(claimSet), 'utf-8'));
  const signingInput = `${encodedHeader}.${encodedClaimSet}`;
  const signature = signRs256(signingInput, credentials.privateKey);
  return `${signingInput}.${signature}`;
}

function signRs256(signingInput: string, privateKeyPem: string): string {
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  return base64UrlEncode(signer.sign(privateKeyPem));
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
