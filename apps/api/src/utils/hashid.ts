import Hashids from "hashids";

function getHashids(salt: string): Hashids {
  return new Hashids(salt, 8);
}

export function encodeId(id: bigint, salt: string): string {
  return getHashids(salt).encode(id);
}

export function decodeId(hash: string, salt: string): bigint | null {
  try {
    const decoded = getHashids(salt).decode(hash);
    if (decoded.length === 0) return null;
    return BigInt(decoded[0]);
  } catch {
    return null;
  }
}