import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  GoogleAuthError,
  SHEETS_READONLY_SCOPE,
  fetchAccessToken,
  parseServiceAccountJson,
} from '../google/serviceAccountAuth.js';

describe('parseServiceAccountJson', () => {
  it('client_email/private_keyを含む正しいJSONを解析できる', () => {
    const raw = JSON.stringify({ client_email: 'sa@example.iam.gserviceaccount.com', private_key: 'PEM' });
    expect(parseServiceAccountJson(raw)).toEqual({
      clientEmail: 'sa@example.iam.gserviceaccount.com',
      privateKey: 'PEM',
    });
  });

  it('不正なJSON文字列はエラーを投げる', () => {
    expect(() => parseServiceAccountJson('not-json')).toThrow(/解析に失敗/);
  });

  it('client_emailが欠落している場合はエラーを投げる', () => {
    expect(() => parseServiceAccountJson(JSON.stringify({ private_key: 'PEM' }))).toThrow(
      /client_email\/private_key/,
    );
  });

  it('private_keyが欠落している場合はエラーを投げる', () => {
    expect(() => parseServiceAccountJson(JSON.stringify({ client_email: 'sa@example.com' }))).toThrow(
      /client_email\/private_key/,
    );
  });
});

/** テスト専用の使い捨てRSA鍵ペア(実際のGoogle資格情報は使わない・署名フォーマットの検証用) */
function generateTestKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}

function decodeBase64UrlJson(segment: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf-8')) as Record<string, unknown>;
}

describe('fetchAccessToken', () => {
  it('正しい形式(header.claim.signature)のJWTをGoogleトークンエンドポイントへ送信する', async () => {
    const { privateKey } = generateTestKeyPair();
    const credentials = { clientEmail: 'sa@example.iam.gserviceaccount.com', privateKey };

    let capturedAssertion = '';
    const fakeFetch = (async (_url: string, init?: RequestInit) => {
      const params = new URLSearchParams(init?.body as string);
      capturedAssertion = params.get('assertion') ?? '';
      expect(params.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
      return new Response(JSON.stringify({ access_token: 'fake-access-token' }), { status: 200 });
    }) as typeof fetch;

    const token = await fetchAccessToken(credentials, { fetchImpl: fakeFetch, nowSeconds: 1_700_000_000 });

    expect(token).toBe('fake-access-token');
    const segments = capturedAssertion.split('.');
    expect(segments).toHaveLength(3);

    const header = decodeBase64UrlJson(segments[0]);
    expect(header).toEqual({ alg: 'RS256', typ: 'JWT' });

    const claimSet = decodeBase64UrlJson(segments[1]);
    expect(claimSet).toEqual({
      iss: credentials.clientEmail,
      scope: SHEETS_READONLY_SCOPE,
      aud: 'https://oauth2.googleapis.com/token',
      iat: 1_700_000_000,
      exp: 1_700_003_600,
    });
  });

  it('scopeオプションで書き込みスコープ等に差し替えられる', async () => {
    const { privateKey } = generateTestKeyPair();
    const credentials = { clientEmail: 'sa@example.iam.gserviceaccount.com', privateKey };
    const writeScope = 'https://www.googleapis.com/auth/spreadsheets';

    let capturedAssertion = '';
    const fakeFetch = (async (_url: string, init?: RequestInit) => {
      const params = new URLSearchParams(init?.body as string);
      capturedAssertion = params.get('assertion') ?? '';
      return new Response(JSON.stringify({ access_token: 'fake' }), { status: 200 });
    }) as typeof fetch;

    await fetchAccessToken(credentials, { fetchImpl: fakeFetch, scope: writeScope, nowSeconds: 1_700_000_000 });

    const claimSet = decodeBase64UrlJson(capturedAssertion.split('.')[1]);
    expect(claimSet.scope).toBe(writeScope);
  });

  it('Googleがエラーを返した場合はGoogleAuthErrorを投げる', async () => {
    const { privateKey } = generateTestKeyPair();
    const credentials = { clientEmail: 'sa@example.iam.gserviceaccount.com', privateKey };
    const fakeFetch = (async () => new Response('invalid_grant', { status: 400 })) as typeof fetch;

    await expect(fetchAccessToken(credentials, { fetchImpl: fakeFetch })).rejects.toThrow(GoogleAuthError);
  });
});
