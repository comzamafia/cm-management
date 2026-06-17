import { createHmac } from "crypto";

function secret(): string {
  return (
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.CAL_SECRET ??
    "dev-cal-secret"
  );
}

export function makeCalToken(userId: string): string {
  return createHmac("sha256", secret()).update(userId).digest("hex").slice(0, 32);
}

export function verifyCalToken(userId: string, token: string): boolean {
  try {
    return makeCalToken(userId) === token;
  } catch {
    return false;
  }
}
