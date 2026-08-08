export interface JwtPayload {
  sub: string;
  email: string;
  exp: number;
  iat: number;
}

export interface ResetTokenPayload {
  sub: string;
  email: string;
  purpose: "password-reset";
  exp: number;
  iat: number;
}

function base64UrlEncode(data: string): string {
  return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(data: string): string {
  const padded = data + "=".repeat((4 - (data.length % 4)) % 4);
  return atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
}

async function createSigningKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signJwt(
  payload: Omit<JwtPayload, "exp" | "iat">,
  secret: string,
  expiresInSeconds: number = 60 * 60 * 24 * 30
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${header}.${body}`;

  const key = await createSigningKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );

  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  const sig = sigBase64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${data}.${sig}`;
}

export async function verifyJwt(
  token: string,
  secret: string
): Promise<JwtPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, body, sig] = parts;
  const data = `${header}.${body}`;

  const key = await createSigningKey(secret);
  const sigBuf = Uint8Array.from(
    atob(sig.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBuf,
    new TextEncoder().encode(data)
  );

  if (!valid) return null;

  const payload: JwtPayload = JSON.parse(base64UrlDecode(body));

  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

export async function signResetToken(
  payload: { sub: string; email: string },
  secret: string,
  expiresInSeconds: number = 60 * 60
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: ResetTokenPayload = {
    ...payload,
    purpose: "password-reset",
    iat: now,
    exp: now + expiresInSeconds,
  };

  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${header}.${body}`;

  const key = await createSigningKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );

  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  const sig = sigBase64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${data}.${sig}`;
}

export async function verifyResetToken(
  token: string,
  secret: string
): Promise<ResetTokenPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, body, sig] = parts;
  const data = `${header}.${body}`;

  const key = await createSigningKey(secret);
  const sigBuf = Uint8Array.from(
    atob(sig.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBuf,
    new TextEncoder().encode(data)
  );

  if (!valid) return null;

  const payload: ResetTokenPayload = JSON.parse(base64UrlDecode(body));

  if (payload.purpose !== "password-reset") return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}
