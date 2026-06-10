import { NextResponse } from "next/server";

// GET /api/seed?secret=<SEED_SECRET>
// One-time endpoint to seed the production database after first deploy.
// Set SEED_SECRET in Vercel env vars. Remove or disable this route after seeding.

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (!secret || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Dynamically import seed logic so it's tree-shaken in normal builds.
  const { execSync } = await import("child_process");
  try {
    const out = execSync("npx tsx prisma/seed.ts", {
      env: { ...process.env },
      encoding: "utf8",
      timeout: 60_000,
    });
    return NextResponse.json({ ok: true, output: out });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
