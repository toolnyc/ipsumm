/**
 * Database helper functions for D1.
 * All auth-related DB operations live here.
 */

import type { User, AuthSession } from './types';

// D1Database type for Cloudflare
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

interface D1ExecResult {
  count: number;
  duration: number;
}

// User row from D1
interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  created_at: number;
  updated_at: number;
}

interface SessionRow {
  token: string;
  user_id: string;
  created_at: number;
  expires_at: number;
}

export async function createUser(
  db: D1Database,
  id: string,
  email: string,
  passwordHash: string,
  salt: string,
): Promise<User> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare('INSERT INTO users (id, email, password_hash, salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, email, passwordHash, salt, now, now)
    .run();

  return { id, email, created_at: now, updated_at: now };
}

export async function getUserByEmail(db: D1Database, email: string): Promise<UserRow | null> {
  return db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>();
}

export async function getUserById(db: D1Database, id: string): Promise<UserRow | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
}

export async function updatePassword(
  db: D1Database,
  userId: string,
  passwordHash: string,
  salt: string,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare('UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?')
    .bind(passwordHash, salt, now, userId)
    .run();
}

export async function deleteUser(db: D1Database, userId: string): Promise<void> {
  // CASCADE will handle sessions and openrouter_connections
  await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
}

export async function createSession(
  db: D1Database,
  token: string,
  userId: string,
  expiresAt: number,
): Promise<AuthSession> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAtSec = Math.floor(expiresAt / 1000);
  await db
    .prepare('INSERT INTO auth_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(token, userId, now, expiresAtSec)
    .run();

  return { token, user_id: userId, created_at: now, expires_at: expiresAtSec };
}

export async function getSession(db: D1Database, token: string): Promise<SessionRow | null> {
  return db.prepare('SELECT * FROM auth_sessions WHERE token = ?').bind(token).first<SessionRow>();
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db.prepare('DELETE FROM auth_sessions WHERE token = ?').bind(token).run();
}

export async function deleteUserSessions(db: D1Database, userId: string): Promise<void> {
  await db.prepare('DELETE FROM auth_sessions WHERE user_id = ?').bind(userId).run();
}

export async function saveOpenRouterKey(
  db: D1Database,
  userId: string,
  encryptedKey: string,
  iv: string,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  // Upsert
  await db
    .prepare(
      `INSERT INTO openrouter_connections (user_id, encrypted_api_key, iv, connected_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET encrypted_api_key = ?, iv = ?, connected_at = ?`,
    )
    .bind(userId, encryptedKey, iv, now, encryptedKey, iv, now)
    .run();
}

export async function getOpenRouterConnection(
  db: D1Database,
  userId: string,
): Promise<{ encrypted_api_key: string; iv: string; connected_at: number } | null> {
  return db
    .prepare('SELECT encrypted_api_key, iv, connected_at FROM openrouter_connections WHERE user_id = ?')
    .bind(userId)
    .first();
}

export async function deleteOpenRouterConnection(db: D1Database, userId: string): Promise<void> {
  await db.prepare('DELETE FROM openrouter_connections WHERE user_id = ?').bind(userId).run();
}
