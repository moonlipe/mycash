import { describe, it, expect } from "vitest";
import { encodeId, decodeId } from "./hashid";

const SALT = "test-salt-for-hashids";

describe("encodeId / decodeId with BigInt", () => {
  it("encodes and decodes a small BigInt ID", () => {
    const id = 1n;
    const encoded = encodeId(id, SALT);
    const decoded = decodeId(encoded, SALT);
    expect(decoded).toBe(id);
  });

  it("encodes and decodes a typical SnowflakeID (64-bit)", () => {
    const id = 18446744073709551615n;
    const encoded = encodeId(id, SALT);
    const decoded = decodeId(encoded, SALT);
    expect(decoded).toBe(id);
  });

  it("encodes and decodes a realistic SnowflakeID from generateSnowflakeId", () => {
    const id = 129487329487234879n;
    const encoded = encodeId(id, SALT);
    const decoded = decodeId(encoded, SALT);
    expect(decoded).toBe(id);
  });

  it("produces different hashids for different IDs", () => {
    const id1 = 100n;
    const id2 = 200n;
    const encoded1 = encodeId(id1, SALT);
    const encoded2 = encodeId(id2, SALT);
    expect(encoded1).not.toBe(encoded2);
  });

  it("returns null for invalid hashid", () => {
    const decoded = decodeId("invalid!hashid", SALT);
    expect(decoded).toBeNull();
  });

  it("returns null for empty string", () => {
    const decoded = decodeId("", SALT);
    expect(decoded).toBeNull();
  });

  it("produces hashids of at least 8 characters (Hashids min length)", () => {
    const id = 1n;
    const encoded = encodeId(id, SALT);
    expect(encoded.length).toBeGreaterThanOrEqual(8);
  });

  it("preserves full 64-bit precision through round-trip", () => {
    const id = 9007199254740993n;
    const encoded = encodeId(id, SALT);
    const decoded = decodeId(encoded, SALT);
    expect(decoded).toBe(id);
  });

  it("different salts produce different encodings for the same ID", () => {
    const id = 12345n;
    const encoded1 = encodeId(id, "salt-a");
    const encoded2 = encodeId(id, "salt-b");
    expect(encoded1).not.toBe(encoded2);
  });
});