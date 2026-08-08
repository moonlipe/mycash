const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "webp", "gif", "bmp", "svg",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "txt", "csv", "rtf", "odt", "ods", "odp",
]);

const BLOCKED_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "ps1", "sh", "msi", "com", "scr",
  "vbs", "js", "wsf", "hta", "jar", "app",
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function validateFile(fileName: string, size: number): string | null {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (BLOCKED_EXTENSIONS.has(ext)) return "errors.attachment_blocked_type";
  if (!ALLOWED_EXTENSIONS.has(ext)) return "errors.attachment_invalid_type";
  if (size > MAX_FILE_SIZE) return "errors.attachment_too_large";
  return null;
}

function toDatePath(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

export function buildFileKey(userId: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "bin";
  const uniqueId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${userId}/attachments/${toDatePath(new Date())}/${uniqueId}.${ext}`;
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const keyData = key instanceof Uint8Array ? new Uint8Array(key).buffer as ArrayBuffer : key as ArrayBuffer;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
}

async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getSigningKey(secretKey: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode(`AWS4${secretKey}`), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

function uriEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
}

interface PresignOptions {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
  fileKey: string;
  contentType: string;
  expiresIn?: number;
}

export async function generatePresignedPutUrl(opts: PresignOptions): Promise<string> {
  const expires = opts.expiresIn || 3600;
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").split(".")[0].slice(0, 8);
  const amzDate = dateStamp + "T" + now.toISOString().replace(/[-:]/g, "").split(".")[0].slice(9) + "Z";
  const service = "s3";

  const canonicalUri = `/${opts.bucket}/${opts.fileKey}`;
  const host = opts.endpoint.replace(/^https?:\/\//, "");

  const payloadHash = "UNSIGNED-PAYLOAD";

  const queryParams: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${opts.accessKey}/${dateStamp}/${opts.region}/${service}/aws4_request`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": "host",
    "X-Amz-Content-Sha256": payloadHash,
  };

  const sortedKeys = Object.keys(queryParams).sort();
  const canonicalQueryString = sortedKeys.map((k) => `${uriEncode(k)}=${uriEncode(queryParams[k])}`).join("&");

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = "host";

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    `${dateStamp}/${opts.region}/${service}/aws4_request`,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await getSigningKey(opts.secretKey, dateStamp, opts.region, service);
  const signature = await hmacSha256(signingKey, stringToSign);
  const signatureHex = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");

  const url = new URL(canonicalUri, opts.endpoint.startsWith("http") ? opts.endpoint : `https://${opts.endpoint}`);
  for (const k of sortedKeys) {
    url.searchParams.set(k, queryParams[k]);
  }
  url.searchParams.set("X-Amz-Signature", signatureHex);

  return url.toString();
}

interface PresignGetOptions {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
  fileKey: string;
  expiresIn?: number;
}

export async function generatePresignedGetUrl(opts: PresignGetOptions): Promise<string> {
  const expires = opts.expiresIn || 3600;
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").split(".")[0].slice(0, 8);
  const amzDate = dateStamp + "T" + now.toISOString().replace(/[-:]/g, "").split(".")[0].slice(9) + "Z";
  const service = "s3";

  const canonicalUri = `/${opts.bucket}/${opts.fileKey}`;
  const host = opts.endpoint.replace(/^https?:\/\//, "");

  const payloadHash = "UNSIGNED-PAYLOAD";

  const queryParams: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${opts.accessKey}/${dateStamp}/${opts.region}/${service}/aws4_request`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": "host",
    "X-Amz-Content-Sha256": payloadHash,
  };

  const sortedKeys = Object.keys(queryParams).sort();
  const canonicalQueryString = sortedKeys.map((k) => `${uriEncode(k)}=${uriEncode(queryParams[k])}`).join("&");

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = "host";

  const canonicalRequest = [
    "GET",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    `${dateStamp}/${opts.region}/${service}/aws4_request`,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await getSigningKey(opts.secretKey, dateStamp, opts.region, service);
  const signature = await hmacSha256(signingKey, stringToSign);
  const signatureHex = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");

  const url = new URL(canonicalUri, opts.endpoint.startsWith("http") ? opts.endpoint : `https://${opts.endpoint}`);
  for (const k of sortedKeys) {
    url.searchParams.set(k, queryParams[k]);
  }
  url.searchParams.set("X-Amz-Signature", signatureHex);

  return url.toString();
}

interface UploadOptions {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
  fileKey: string;
  contentType: string;
  body: ArrayBuffer;
}

export async function uploadToS3(opts: UploadOptions): Promise<void> {
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").split(".")[0].slice(0, 8);
  const amzDate = dateStamp + "T" + now.toISOString().replace(/[-:]/g, "").split(".")[0].slice(9) + "Z";
  const service = "s3";
  const host = opts.endpoint.replace(/^https?:\/\//, "");
  const canonicalUri = `/${opts.bucket}/${opts.fileKey}`;

  const payloadHash = await sha256HexBuffer(opts.body);

  const canonicalHeaders = `content-type:${opts.contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    `${dateStamp}/${opts.region}/${service}/aws4_request`,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await getSigningKey(opts.secretKey, dateStamp, opts.region, service);
  const signature = await hmacSha256(signingKey, stringToSign);
  const signatureHex = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");

  const url = new URL(canonicalUri, opts.endpoint.startsWith("http") ? opts.endpoint : `https://${opts.endpoint}`);

  const res = await fetch(url.toString(), {
    method: "PUT",
    body: opts.body,
    headers: {
      "Content-Type": opts.contentType,
      "Host": host,
      "X-Amz-Content-Sha256": payloadHash,
      "X-Amz-Date": amzDate,
      "Authorization": `AWS4-HMAC-SHA256 Credential=${opts.accessKey}/${dateStamp}/${opts.region}/${service}/aws4_request, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`S3 upload failed: ${res.status} ${text}`);
  }
}

async function sha256HexBuffer(data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function deleteFromS3(opts: {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
  fileKey: string;
}): Promise<void> {
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").split(".")[0].slice(0, 8);
  const amzDate = dateStamp + "T" + now.toISOString().replace(/[-:]/g, "").split(".")[0].slice(9) + "Z";
  const service = "s3";
  const host = opts.endpoint.replace(/^https?:\/\//, "");
  const canonicalUri = `/${opts.bucket}/${opts.fileKey}`;

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

  const payloadHash = "UNSIGNED-PAYLOAD";

  const canonicalRequest = [
    "DELETE",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    `${dateStamp}/${opts.region}/${service}/aws4_request`,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await getSigningKey(opts.secretKey, dateStamp, opts.region, service);
  const signature = await hmacSha256(signingKey, stringToSign);
  const signatureHex = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");

  const url = new URL(canonicalUri, opts.endpoint.startsWith("http") ? opts.endpoint : `https://${opts.endpoint}`);

  await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      "Host": host,
      "X-Amz-Date": amzDate,
      "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
      "Authorization": `AWS4-HMAC-SHA256 Credential=${opts.accessKey}/${dateStamp}/${opts.region}/${service}/aws4_request, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`,
    },
  });
}