import { generateSnowflakeId } from "./snowflake";

export function newId(): bigint {
  return generateSnowflakeId();
}