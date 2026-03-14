import { describe, it, expect } from 'vitest';
import {
  generateId,
  generateToken,
  generateSalt,
  hashPassword,
  verifyPassword,
  validateEmail,
  validatePassword,
  sessionExpiresAt,
  isSessionExpired,
  jsonResponse,
  setSessionCookie,
  clearSessionCookie,
  getSessionToken,
  encryptApiKey,
  decryptApiKey,
} from '../src/lib/auth';

describe('auth utilities', () => {
  describe('generateId', () => {
    it('returns a 32-char hex string', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-f0-9]{32}$/);
    });

    it('generates unique values', () => {
      const ids = new Set(Array.from({ length: 10 }, () => generateId()));
      expect(ids.size).toBe(10);
    });
  });

  describe('generateToken', () => {
    it('returns a 64-char hex string', () => {
      const token = generateToken();
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('generateSalt', () => {
    it('returns a 32-char hex string', () => {
      const salt = generateSalt();
      expect(salt).toMatch(/^[a-f0-9]{32}$/);
    });
  });

  describe('hashPassword / verifyPassword', () => {
    it('hashes and verifies a password', async () => {
      const salt = generateSalt();
      const hash = await hashPassword('mypassword', salt);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(await verifyPassword('mypassword', salt, hash)).toBe(true);
    });

    it('rejects wrong password', async () => {
      const salt = generateSalt();
      const hash = await hashPassword('correct', salt);
      expect(await verifyPassword('wrong', salt, hash)).toBe(false);
    });

    it('is deterministic with same salt', async () => {
      const salt = generateSalt();
      const h1 = await hashPassword('test', salt);
      const h2 = await hashPassword('test', salt);
      expect(h1).toBe(h2);
    });
  });

  describe('validateEmail', () => {
    it('accepts valid emails', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('a@b.co')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('noatsign')).toBe(false);
      expect(validateEmail('@nodomain')).toBe(false);
      expect(validateEmail('no@dot')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('returns null for valid passwords', () => {
      expect(validatePassword('12345678')).toBeNull();
      expect(validatePassword('a long password')).toBeNull();
    });

    it('returns error for short passwords', () => {
      expect(validatePassword('short')).toContain('8 characters');
      expect(validatePassword('')).toContain('8 characters');
    });
  });

  describe('session expiry', () => {
    it('sessionExpiresAt returns future timestamp', () => {
      const exp = sessionExpiresAt();
      expect(exp).toBeGreaterThan(Date.now());
    });

    it('isSessionExpired detects expired sessions', () => {
      expect(isSessionExpired(Date.now() - 1000)).toBe(true);
      expect(isSessionExpired(Date.now() + 60000)).toBe(false);
    });
  });

  describe('jsonResponse', () => {
    it('returns proper Response with JSON', async () => {
      const res = jsonResponse({ status: 'ok' }, 201);
      expect(res.status).toBe(201);
      expect(res.headers.get('Content-Type')).toBe('application/json');
      const body = await res.json();
      expect(body.status).toBe('ok');
    });

    it('includes extra headers', () => {
      const res = jsonResponse({}, 200, { 'X-Test': 'yes' });
      expect(res.headers.get('X-Test')).toBe('yes');
    });
  });

  describe('session cookies', () => {
    it('setSessionCookie returns valid cookie string', () => {
      const cookie = setSessionCookie('abc123');
      expect(cookie).toContain('session=abc123');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain('Path=/');
    });

    it('clearSessionCookie sets Max-Age=0', () => {
      const cookie = clearSessionCookie();
      expect(cookie).toContain('Max-Age=0');
    });
  });

  describe('getSessionToken', () => {
    it('extracts session from cookie header', () => {
      const req = new Request('http://localhost', {
        headers: { Cookie: 'session=abc123def456' },
      });
      expect(getSessionToken(req)).toBe('abc123def456');
    });

    it('returns null when no cookie', () => {
      const req = new Request('http://localhost');
      expect(getSessionToken(req)).toBeNull();
    });

    it('returns null when no session cookie', () => {
      const req = new Request('http://localhost', {
        headers: { Cookie: 'other=value' },
      });
      expect(getSessionToken(req)).toBeNull();
    });

    it('extracts from multiple cookies', () => {
      const req = new Request('http://localhost', {
        headers: { Cookie: 'foo=bar; session=aabbccdd; baz=qux' },
      });
      expect(getSessionToken(req)).toBe('aabbccdd');
    });
  });

  describe('encryption', () => {
    it('encrypts and decrypts an API key', async () => {
      const secret = 'test-encryption-secret-32-chars!';
      const apiKey = 'sk-or-v1-abc123def456';
      const { encrypted, iv } = await encryptApiKey(apiKey, secret);
      expect(encrypted).not.toBe(apiKey);
      expect(iv).toMatch(/^[a-f0-9]+$/);

      const decrypted = await decryptApiKey(encrypted, iv, secret);
      expect(decrypted).toBe(apiKey);
    });

    it('different IVs produce different ciphertext', async () => {
      const secret = 'test-secret';
      const apiKey = 'sk-or-v1-abc';
      const e1 = await encryptApiKey(apiKey, secret);
      const e2 = await encryptApiKey(apiKey, secret);
      expect(e1.encrypted).not.toBe(e2.encrypted);
    });
  });
});
