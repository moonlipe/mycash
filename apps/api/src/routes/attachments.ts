import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { attachments, transactions } from "@mycash/database/schema";
import { newId } from "../utils/id";
import { encodeId, decodeId } from "../utils/hashid";
import { authMiddleware, type AuthEnv } from "../middleware/auth";
import { hashidMiddleware } from "../middleware/hashid";
import {
  validateFile,
  buildFileKey,
  generatePresignedGetUrl,
  deleteFromS3,
  uploadToS3,
} from "../utils/s3";

type AttachEnv = AuthEnv;

const attachRoutes = new Hono<AttachEnv>();

attachRoutes.use("*", authMiddleware);

attachRoutes.post("/:transactionId/upload", async (c) => {
  try {
    const userId = c.get("userId");
    const transactionId = c.req.param("transactionId");
    const salt = c.env.HASHIDS_SALT;

    const decodedTxId = decodeId(transactionId, salt);

    if (decodedTxId === null) {
      return c.json({ error: "errors.invalid_id" }, 400);
    }

    const db = drizzle(c.env.DB);

    const tx = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.id, decodedTxId), eq(transactions.userId, userId), isNull(transactions.deletedAt)))
      .get();

    if (!tx) {
      return c.json({ error: "errors.transaction_not_found" }, 404);
    }

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      console.error("[upload] no file in formData");
      return c.json({ error: "errors.missing_fields" }, 400);
    }

    const validationError = validateFile(file.name, file.size);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    const fileKey = buildFileKey(userId.toString(), file.name);
    const id = newId();

    await db.insert(attachments).values({
      id,
      transactionId: decodedTxId,
      userId,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      fileKey,
      status: "pending",
      createdAt: new Date(),
    });

    const fileBuffer = await file.arrayBuffer();

    try {
      await uploadToS3({
        endpoint: c.env.S3_ENDPOINT,
        accessKey: c.env.S3_ACCESS_KEY,
        secretKey: c.env.S3_SECRET_KEY,
        bucket: c.env.S3_BUCKET,
        region: c.env.S3_REGION || "auto",
        fileKey,
        contentType: file.type || "application/octet-stream",
        body: fileBuffer,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[upload] S3 upload failed:", msg);
      await db.delete(attachments).where(eq(attachments.id, id));
      if (msg.includes("403") || msg.includes("AccessDenied")) {
        return c.json({ error: "errors.s3_access_denied" }, 403);
      }
      return c.json({ error: "errors.save_failed_retry" }, 500);
    }

    await db
      .update(attachments)
      .set({ status: "confirmed" })
      .where(eq(attachments.id, id));

    return c.json({
      attachment: {
        id: encodeId(id, salt),
        transactionId: encodeId(decodedTxId, salt),
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
        status: "confirmed",
      },
    }, 201);
  } catch (err) {
    console.error("[upload] unhandled error:", err instanceof Error ? err.message : String(err));
    return c.json({ error: "errors.save_failed_retry" }, 500);
  }
});

attachRoutes.post("/:id/confirm", hashidMiddleware, async (c) => {
  const userId = c.get("userId");
  const decodedId = c.get("decodedId");
  const salt = c.env.HASHIDS_SALT;

  if (!decodedId) {
    return c.json({ error: "errors.invalid_id" }, 400);
  }

  const db = drizzle(c.env.DB);

  const att = await db
    .select()
    .from(attachments)
    .where(and(eq(attachments.id, decodedId), eq(attachments.userId, userId), isNull(attachments.deletedAt)))
    .get();

  if (!att) {
    return c.json({ error: "errors.attachment_not_found" }, 404);
  }

  await db
    .update(attachments)
    .set({ status: "confirmed" })
    .where(eq(attachments.id, decodedId));

  return c.json({
    attachment: {
      id: encodeId(att.id, salt),
      transactionId: encodeId(att.transactionId, salt),
      fileName: att.fileName,
      contentType: att.contentType,
      size: att.size,
      status: "confirmed",
    },
  });
});

attachRoutes.get("/list/:transactionId", async (c) => {
  const userId = c.get("userId");
  const transactionId = c.req.param("transactionId");
  const salt = c.env.HASHIDS_SALT;

  const decodedTxId = decodeId(transactionId, salt);

  if (decodedTxId === null) {
    return c.json({ error: "errors.invalid_id" }, 400);
  }

  const db = drizzle(c.env.DB);

  const tx = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.id, decodedTxId), eq(transactions.userId, userId), isNull(transactions.deletedAt)))
    .get();

  if (!tx) {
    return c.json({ error: "errors.transaction_not_found" }, 404);
  }

  const rows = await db
    .select()
    .from(attachments)
    .where(
      and(
        eq(attachments.transactionId, decodedTxId),
        eq(attachments.userId, userId),
        eq(attachments.status, "confirmed"),
        isNull(attachments.deletedAt)
      )
    );

  const items = rows.map((row) => ({
    id: encodeId(row.id, salt),
    transactionId: encodeId(row.transactionId, salt),
    fileName: row.fileName,
    contentType: row.contentType,
    size: row.size,
    status: row.status,
  }));

  return c.json({ items });
});

attachRoutes.delete("/:id", hashidMiddleware, async (c) => {
  const userId = c.get("userId");
  const decodedId = c.get("decodedId");

  if (!decodedId) {
    return c.json({ error: "errors.invalid_id" }, 400);
  }

  const db = drizzle(c.env.DB);

  const att = await db
    .select()
    .from(attachments)
    .where(and(eq(attachments.id, decodedId), eq(attachments.userId, userId), isNull(attachments.deletedAt)))
    .get();

  if (!att) {
    return c.json({ error: "errors.attachment_not_found" }, 404);
  }

  const s3Opts = {
    endpoint: c.env.S3_ENDPOINT,
    accessKey: c.env.S3_ACCESS_KEY,
    secretKey: c.env.S3_SECRET_KEY,
    bucket: c.env.S3_BUCKET,
    region: c.env.S3_REGION || "auto",
    fileKey: att.fileKey,
  };

  try {
    await deleteFromS3(s3Opts);
  } catch {
    // Continue with soft delete even if S3 delete fails
  }

  await db
    .update(attachments)
    .set({ deletedAt: new Date() })
    .where(eq(attachments.id, decodedId));

  return c.json({ deleted: true });
});

attachRoutes.get("/:id/download", hashidMiddleware, async (c) => {
  const userId = c.get("userId");
  const decodedId = c.get("decodedId");

  if (!decodedId) {
    return c.json({ error: "errors.invalid_id" }, 400);
  }

  const db = drizzle(c.env.DB);

  const att = await db
    .select()
    .from(attachments)
    .where(and(eq(attachments.id, decodedId), eq(attachments.userId, userId), isNull(attachments.deletedAt)))
    .get();

  if (!att || att.status !== "confirmed") {
    return c.json({ error: "errors.attachment_not_found" }, 404);
  }

  const downloadUrl = await generatePresignedGetUrl({
    endpoint: c.env.S3_ENDPOINT,
    accessKey: c.env.S3_ACCESS_KEY,
    secretKey: c.env.S3_SECRET_KEY,
    bucket: c.env.S3_BUCKET,
    region: c.env.S3_REGION || "auto",
    fileKey: att.fileKey,
  });

  return c.json({ downloadUrl, fileName: att.fileName, contentType: att.contentType });
});

export default attachRoutes;