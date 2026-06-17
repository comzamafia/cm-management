import { createHmac } from "crypto";

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET ?? process.env.CAL_SECRET;
  if (!s) throw new Error("No NEXTAUTH_SECRET configured");
  return s;
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
