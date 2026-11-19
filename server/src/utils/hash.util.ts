import crypto from "crypto";
import { getJwtSecret } from "./authConfig";

export const resetDigest = (purpose: string, value: string) =>
  crypto.createHmac('sha256', getJwtSecret()).update(`${purpose}:${value}`).digest('hex');

export const digestMatches = (expected: string, actual: string) => {
  const expectedBytes = Buffer.from(expected, 'hex');
  const actualBytes = Buffer.from(actual, 'hex');
  return expectedBytes.length === actualBytes.length && crypto.timingSafeEqual(expectedBytes, actualBytes);
};
