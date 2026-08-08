import { jest } from '@jest/globals';
import { GoogleAuthError, fetchAccessToken } from '../../src/api/auth.js';

async function generateTestKeyPair(): Promise<{ pem: string; publicKey: CryptoKey }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(pkcs8)));
  const pem = `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----\n`;
  return { pem, publicKey: keyPair.publicKey };
}

function decodeJwtPart(part: string): Record<string, unknown> {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
}

describe('fetchAccessToken', () => {
  it('サービスアカウント認証情報からRS256署名済みJWTを組み立て、Google公開鍵で検証可能な署名にする', async () => {
    const { pem, publicKey } = await generateTestKeyPair();
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'ya29.test-token' }),
    });

    const token = await fetchAccessToken(
      { client_email: 'sa@example.iam.gserviceaccount.com', private_key: pem },
      mockFetch as unknown as typeof fetch,
      1_700_000_000,
    );

    expect(token).toBe('ya29.test-token');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(init.method).toBe('POST');

    const body = new URLSearchParams(init.body as string);
    expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
    const assertion = body.get('assertion') as string;
    const [headerPart, claimPart, signaturePart] = assertion.split('.');

    expect(decodeJwtPart(headerPart)).toEqual({ alg: 'RS256', typ: 'JWT' });
    const claim = decodeJwtPart(claimPart);
    expect(claim).toEqual({
      iss: 'sa@example.iam.gserviceaccount.com',
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      iat: 1_700_000_000,
      exp: 1_700_003_600,
    });

    const signatureBytes = Uint8Array.from(
      Buffer.from(signaturePart.replace(/-/g, '+').replace(/_/g, '/'), 'base64'),
    );
    const signingInput = new TextEncoder().encode(`${headerPart}.${claimPart}`);
    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      signatureBytes,
      signingInput,
    );
    expect(isValid).toBe(true);
  });

  it('Googleがエラーを返した場合はGoogleAuthErrorを投げる', async () => {
    const { pem } = await generateTestKeyPair();
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => '{"error":"invalid_grant"}',
    });

    await expect(
      fetchAccessToken(
        { client_email: 'sa@example.iam.gserviceaccount.com', private_key: pem },
        mockFetch as unknown as typeof fetch,
      ),
    ).rejects.toThrow(GoogleAuthError);
  });
});
