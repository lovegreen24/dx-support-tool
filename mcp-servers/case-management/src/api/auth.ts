import type { ServiceAccountCredentials } from '../types.js';

/**
 * サービスアカウントJWT Bearerフローによるアクセストークン取得。
 * Node.jsのcrypto固有APIには依存せず、WebCrypto(`crypto.subtle`)・`atob`/`btoa`のみを使う
 * (Cloudflare Workersランタイムでもそのまま動作させるため)。
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
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

interface TokenResponse {
  access_token: string;
}

/** サービスアカウント認証情報からアクセストークンを取得する */
export async function fetchAccessToken(
  credentials: ServiceAccountCredentials,
  fetchImpl: typeof fetch = fetch,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  const jwt = await buildSignedJwt(credentials, nowSeconds);

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

  const data = (await response.json()) as TokenResponse;
  return data.access_token;
}

async function buildSignedJwt(credentials: ServiceAccountCredentials, iatSeconds: number): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: credentials.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: iatSeconds,
    exp: iatSeconds + TOKEN_TTL_SECONDS,
  };

  const encodedHeader = base64UrlEncodeString(JSON.stringify(header));
  const encodedClaimSet = base64UrlEncodeString(JSON.stringify(claimSet));
  const signingInput = `${encodedHeader}.${encodedClaimSet}`;
  const signature = await signRs256(signingInput, credentials.private_key);
  return `${signingInput}.${signature}`;
}

async function signRs256(signingInput: string, privateKeyPem: string): Promise<string> {
  const cryptoKey = await importPrivateKey(privateKeyPem);
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );
  return base64UrlEncodeBytes(new Uint8Array(signatureBuffer));
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const der = pemToDer(pem);
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

function pemToDer(pem: string): Uint8Array {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function base64UrlEncodeString(input: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(input));
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
