/**
 * Auth utilities for ipsumm.
 * Uses Web Crypto API (compatible with Cloudflare Workers).
 */

const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Use the global crypto available in Workers and Node 20+
const subtle = globalThis.crypto.subtle;

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

export function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bufferToHex(bytes.buffer);
}

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bufferToHex(bytes.buffer);
}

export function generateSalt(): string {
  const bytes = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(bytes);
  return bufferToHex(bytes.buffer);
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const derivedBits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(hexToBuffer(salt)),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  return bufferToHex(derivedBits);
}

export async function verifyPassword(
  password: string,
  salt: string,
  storedHash: string,
): Promise<boolean> {
  const hash = await hashPassword(password, salt);
  // Constant-time comparison
  if (hash.length !== storedHash.length) return false;
  let result = 0;
  for (let i = 0; i < hash.length; i++) {
    result |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return result === 0;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  return null;
}

export function sessionExpiresAt(): number {
  return Date.now() + SESSION_DURATION_MS;
}

export function isSessionExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export function setSessionCookie(token: string): string {
  const maxAge = Math.floor(SESSION_DURATION_MS / 1000);
  return `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
}

export function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  const match = cookie.match(/(?:^|;\s*)session=([a-f0-9]+)/);
  return match ? match[1] : null;
}

// AES-GCM encryption for OpenRouter API keys
const AES_ALGORITHM = 'AES-GCM';
const AES_KEY_LENGTH = 256;

async function getEncryptionKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('ipsumm-openrouter-key-encryption'),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptApiKey(apiKey: string, secret: string): Promise<{ encrypted: string; iv: string }> {
  const key = await getEncryptionKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();

  const encrypted = await subtle.encrypt(
    { name: AES_ALGORITHM, iv },
    key,
    encoder.encode(apiKey),
  );

  return {
    encrypted: bufferToHex(encrypted),
    iv: bufferToHex(iv.buffer),
  };
}

export async function decryptApiKey(encrypted: string, iv: string, secret: string): Promise<string> {
  const key = await getEncryptionKey(secret);
  const decoder = new TextDecoder();

  const decrypted = await subtle.decrypt(
    { name: AES_ALGORITHM, iv: new Uint8Array(hexToBuffer(iv)) },
    key,
    new Uint8Array(hexToBuffer(encrypted)),
  );

  return decoder.decode(decrypted);
}
