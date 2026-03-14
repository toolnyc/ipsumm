import { describe, it, expect, beforeEach } from 'vitest';
import { POST as signupHandler } from '../src/pages/api/auth/signup';
import { POST as loginHandler } from '../src/pages/api/auth/login';
import { POST as logoutHandler } from '../src/pages/api/auth/logout';
import { PUT as passwordHandler } from '../src/pages/api/auth/password';
import { DELETE as deleteHandler } from '../src/pages/api/auth/account';
import { GET as openrouterCallbackHandler } from '../src/pages/api/auth/openrouter/callback';

/**
 * Mock D1 database for testing.
 * Stores data in-memory with the same interface as D1.
 */
function createMockDB() {
  const tables: Record<string, Record<string, any>[]> = {
    users: [],
    auth_sessions: [],
    openrouter_connections: [],
  };

  function prepare(query: string) {
    let boundValues: any[] = [];

    const stmt = {
      bind(...values: any[]) {
        boundValues = values;
        return stmt;
      },
      async first<T = any>(_colName?: string): Promise<T | null> {
        const q = query.trim().toUpperCase();
        if (q.startsWith('SELECT')) {
          const table = extractTable(query);
          const rows = tables[table] || [];
          const whereMatch = query.match(/WHERE\s+(\w+)\s*=\s*\?/i);
          if (whereMatch) {
            const col = whereMatch[1];
            const val = boundValues[0];
            const found = rows.find((r) => r[col] === val);
            return (found || null) as T | null;
          }
          return (rows[0] || null) as T | null;
        }
        return null;
      },
      async run() {
        const q = query.trim().toUpperCase();
        if (q.startsWith('INSERT')) {
          const table = extractTable(query);
          const colMatch = query.match(/\(([^)]+)\)\s*VALUES/i);
          if (colMatch) {
            const cols = colMatch[1].split(',').map((c) => c.trim());
            const row: Record<string, any> = {};
            cols.forEach((col, i) => {
              row[col] = boundValues[i];
            });
            tables[table].push(row);
          }
        } else if (q.startsWith('UPDATE')) {
          const table = extractTable(query);
          const rows = tables[table] || [];
          // Simple: find by last bound value (WHERE id = ?)
          const setMatch = query.match(/SET\s+(.+?)\s+WHERE/i);
          const whereMatch = query.match(/WHERE\s+(\w+)\s*=\s*\?/i);
          if (setMatch && whereMatch) {
            const setCols = setMatch[1].split(',').map((s) => s.trim().split(/\s*=\s*\?/)[0]);
            const whereCol = whereMatch[1];
            const whereVal = boundValues[boundValues.length - 1];
            const row = rows.find((r) => r[whereCol] === whereVal);
            if (row) {
              setCols.forEach((col, i) => {
                row[col] = boundValues[i];
              });
            }
          }
        } else if (q.startsWith('DELETE')) {
          const table = extractTable(query);
          const whereMatch = query.match(/WHERE\s+(\w+)\s*=\s*\?/i);
          if (whereMatch) {
            const col = whereMatch[1];
            const val = boundValues[0];
            tables[table] = tables[table].filter((r) => r[col] !== val);
          }
        }
        return { success: true, meta: {} };
      },
      async all() {
        return { results: [], success: true, meta: {} };
      },
    };
    return stmt;
  }

  function extractTable(query: string): string {
    // Match table name from various SQL patterns
    const fromMatch = query.match(/FROM\s+(\w+)/i);
    if (fromMatch) return fromMatch[1];
    const intoMatch = query.match(/INTO\s+(\w+)/i);
    if (intoMatch) return intoMatch[1];
    const updateMatch = query.match(/UPDATE\s+(\w+)/i);
    if (updateMatch) return updateMatch[1];
    const deleteMatch = query.match(/DELETE\s+FROM\s+(\w+)/i);
    if (deleteMatch) return deleteMatch[1];
    return 'unknown';
  }

  return { prepare, _tables: tables };
}

function createContext(
  request: Request,
  db: any,
  user?: any,
  url?: URL,
) {
  return {
    request,
    locals: {
      runtime: { env: { DB: db } },
      user,
    },
    url: url || new URL(request.url),
    redirect: (path: string, status: number) =>
      new Response(null, { status, headers: { Location: path } }),
  } as any;
}

function jsonRequest(url: string, body: any, method = 'POST', cookies?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookies) headers.Cookie = cookies;
  return new Request(url, {
    method,
    headers,
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/signup', () => {
  let db: ReturnType<typeof createMockDB>;

  beforeEach(() => {
    db = createMockDB();
  });

  it('creates a user and returns session token', async () => {
    const request = jsonRequest('http://localhost/api/auth/signup', {
      email: 'test@example.com',
      password: 'password123',
    });

    const response = await signupHandler(createContext(request, db));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.status).toBe('ok');
    expect(body.data.user.email).toBe('test@example.com');
    expect(body.data.token).toMatch(/^[a-f0-9]{64}$/);
    expect(response.headers.get('Set-Cookie')).toContain('session=');
  });

  it('rejects missing fields', async () => {
    const request = jsonRequest('http://localhost/api/auth/signup', { email: 'test@example.com' });
    const response = await signupHandler(createContext(request, db));
    expect(response.status).toBe(400);
  });

  it('rejects invalid email', async () => {
    const request = jsonRequest('http://localhost/api/auth/signup', {
      email: 'notanemail',
      password: 'password123',
    });
    const response = await signupHandler(createContext(request, db));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('email');
  });

  it('rejects short password', async () => {
    const request = jsonRequest('http://localhost/api/auth/signup', {
      email: 'test@example.com',
      password: 'short',
    });
    const response = await signupHandler(createContext(request, db));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('8 characters');
  });

  it('rejects duplicate email', async () => {
    const req1 = jsonRequest('http://localhost/api/auth/signup', {
      email: 'dupe@example.com',
      password: 'password123',
    });
    await signupHandler(createContext(req1, db));

    const req2 = jsonRequest('http://localhost/api/auth/signup', {
      email: 'dupe@example.com',
      password: 'password456',
    });
    const response = await signupHandler(createContext(req2, db));
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toContain('already exists');
  });
});

describe('POST /api/auth/login', () => {
  let db: ReturnType<typeof createMockDB>;

  beforeEach(async () => {
    db = createMockDB();
    // Create a user first
    const req = jsonRequest('http://localhost/api/auth/signup', {
      email: 'user@example.com',
      password: 'password123',
    });
    await signupHandler(createContext(req, db));
  });

  it('logs in with correct credentials', async () => {
    const request = jsonRequest('http://localhost/api/auth/login', {
      email: 'user@example.com',
      password: 'password123',
    });
    const response = await loginHandler(createContext(request, db));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.data.user.email).toBe('user@example.com');
    expect(body.data.token).toMatch(/^[a-f0-9]{64}$/);
    expect(response.headers.get('Set-Cookie')).toContain('session=');
  });

  it('rejects wrong password', async () => {
    const request = jsonRequest('http://localhost/api/auth/login', {
      email: 'user@example.com',
      password: 'wrongpassword',
    });
    const response = await loginHandler(createContext(request, db));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Invalid');
  });

  it('rejects nonexistent email', async () => {
    const request = jsonRequest('http://localhost/api/auth/login', {
      email: 'nobody@example.com',
      password: 'password123',
    });
    const response = await loginHandler(createContext(request, db));
    expect(response.status).toBe(401);
  });

  it('rejects missing fields', async () => {
    const request = jsonRequest('http://localhost/api/auth/login', { email: 'user@example.com' });
    const response = await loginHandler(createContext(request, db));
    expect(response.status).toBe(400);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears session cookie', async () => {
    const db = createMockDB();
    const request = new Request('http://localhost/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: 'session=abc123' },
    });
    const response = await logoutHandler(createContext(request, db));
    expect(response.status).toBe(200);
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });
});

describe('PUT /api/auth/password', () => {
  it('rejects unauthenticated requests', async () => {
    const db = createMockDB();
    const request = jsonRequest('http://localhost/api/auth/password', {
      currentPassword: 'old',
      newPassword: 'newpassword',
    }, 'PUT');

    const response = await passwordHandler(createContext(request, db, undefined));
    expect(response.status).toBe(401);
  });

  it('changes password for authenticated user', async () => {
    const db = createMockDB();
    // Signup first
    const signupReq = jsonRequest('http://localhost/api/auth/signup', {
      email: 'pw@example.com',
      password: 'oldpassword1',
    });
    const signupRes = await signupHandler(createContext(signupReq, db));
    const signupBody = await signupRes.json();
    const user = signupBody.data.user;

    // Change password
    const request = jsonRequest('http://localhost/api/auth/password', {
      currentPassword: 'oldpassword1',
      newPassword: 'newpassword1',
    }, 'PUT');

    const response = await passwordHandler(createContext(request, db, user));
    expect(response.status).toBe(200);

    // Verify new password works for login
    const loginReq = jsonRequest('http://localhost/api/auth/login', {
      email: 'pw@example.com',
      password: 'newpassword1',
    });
    const loginRes = await loginHandler(createContext(loginReq, db));
    expect(loginRes.status).toBe(200);
  });

  it('rejects incorrect current password', async () => {
    const db = createMockDB();
    const signupReq = jsonRequest('http://localhost/api/auth/signup', {
      email: 'pw2@example.com',
      password: 'oldpassword1',
    });
    const signupRes = await signupHandler(createContext(signupReq, db));
    const user = (await signupRes.json()).data.user;

    const request = jsonRequest('http://localhost/api/auth/password', {
      currentPassword: 'wrongpassword',
      newPassword: 'newpassword1',
    }, 'PUT');

    const response = await passwordHandler(createContext(request, db, user));
    expect(response.status).toBe(401);
  });
});

describe('DELETE /api/auth/account', () => {
  it('deletes authenticated user account', async () => {
    const db = createMockDB();
    const signupReq = jsonRequest('http://localhost/api/auth/signup', {
      email: 'delete@example.com',
      password: 'password123',
    });
    const signupRes = await signupHandler(createContext(signupReq, db));
    const user = (await signupRes.json()).data.user;

    const request = new Request('http://localhost/api/auth/account', { method: 'DELETE' });
    const response = await deleteHandler(createContext(request, db, user));
    expect(response.status).toBe(200);
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');

    // User should be gone
    expect(db._tables.users.length).toBe(0);
  });

  it('rejects unauthenticated requests', async () => {
    const db = createMockDB();
    const request = new Request('http://localhost/api/auth/account', { method: 'DELETE' });
    const response = await deleteHandler(createContext(request, db));
    expect(response.status).toBe(401);
  });
});

describe('GET /api/auth/openrouter/callback', () => {
  it('redirects to login if not authenticated', async () => {
    const db = createMockDB();
    const url = new URL('http://localhost/api/auth/openrouter/callback?code=test123');
    const request = new Request(url.toString());
    const response = await openrouterCallbackHandler(createContext(request, db, undefined, url));
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login');
  });

  it('redirects to settings with error if no code', async () => {
    const db = createMockDB();
    const url = new URL('http://localhost/api/auth/openrouter/callback');
    const request = new Request(url.toString());
    const user = { id: 'user1', email: 'test@example.com' };
    const response = await openrouterCallbackHandler(createContext(request, db, user, url));
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toContain('error=missing_code');
  });
});
