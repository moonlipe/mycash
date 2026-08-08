import { createMiddleware } from "hono/factory";
import { encodeId, decodeId } from "../utils/hashid";
import type { Env } from "../env";

const ID_FIELDS = new Set(["id"]);
const ID_SUFFIXES = ["_id", "Id"];

function isIdField(key: string): boolean {
  return ID_FIELDS.has(key) || ID_SUFFIXES.some((s) => key.endsWith(s));
}

export type HashidVariables = {
  decodedId: bigint;
};

export const hashidMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: HashidVariables;
}>(async (c, next) => {
  const salt = c.env.HASHIDS_SALT;

  const idParam = c.req.param("id");
  if (idParam) {
    const decoded = decodeId(idParam, salt);
    if (decoded === null) {
      return c.json({ error: "errors.invalid_id" }, 400);
    }
    c.set("decodedId", decoded);
  }

  await next();
});

export function encodeResponseIds(data: unknown, salt: string): unknown {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map((item) => encodeResponseIds(item, salt));
  }

  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (isIdField(key) && typeof value === "bigint") {
        result[key] = encodeId(value, salt);
      } else {
        result[key] = encodeResponseIds(value, salt);
      }
    }
    return result;
  }

  return data;
}