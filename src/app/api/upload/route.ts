import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createUploadPresign, isStorageConfigured } from "@/lib/storage";

// GET /api/upload — config health check (booleans only, no secrets). Lets us
// confirm whether the S3 env vars are present on the server.
export function GET(): NextResponse {
  return NextResponse.json({
    storageConfigured: isStorageConfigured(),
    bucketSet: !!process.env.AWS_S3_BUCKET,
    keyIdSet: !!process.env.AWS_ACCESS_KEY_ID,
    secretSet: !!process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_S3_REGION ?? null,
  });
}

// POST /api/upload — returns a presigned S3 POST so the browser can upload directly.
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { filename, contentType, folder } = (await request.json()) as {
      filename: string;
      contentType: string;
      folder?: string;
    };

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "filename and contentType are required" },
        { status: 400 },
      );
    }

    const presign = await createUploadPresign(
      filename,
      contentType,
      folder ?? "uploads",
    );

    return NextResponse.json(presign);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
