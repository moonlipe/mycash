const EPOCH = Date.UTC(2026, 0, 1);
const MAX_SEQUENCE = 0x7ff;
let sequence = 0;
let lastTimestamp = 0;

export function generateSnowflakeId(): bigint {
  const now = Date.now();
  const timestamp = now - EPOCH;

  if (timestamp !== lastTimestamp) {
    sequence = 0;
    lastTimestamp = timestamp;
  } else {
    sequence = (sequence + 1) & MAX_SEQUENCE;
    if (sequence === 0) {
      while (Date.now() - EPOCH <= lastTimestamp) {
        // spin until next millisecond
      }
    }
  }

  lastTimestamp = timestamp;

  return (BigInt(timestamp) << 11n) | BigInt(sequence);
}
