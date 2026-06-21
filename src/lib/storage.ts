import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import crypto from "crypto";

const BUCKET = process.env.AWS_S3_BUCKET!;
const REGION = process.env.AWS_S3_REGION ?? "ap-southeast-1";

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

export type PresignedUpload = {
  url: string;
  fields: Record<string, string>;
  fileUrl: string;
};

export function isStorageConfigured(): boolean {
  return !!(process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

export async function createUploadPresign(
  filename: string,
  contentType: string,
  folder: string = "uploads",
): Promise<PresignedUpload> {
  if (!isStorageConfigured()) {
    throw new Error(
      "Storage is not configured. Set AWS_S3_BUCKET, AWS_S3_REGION, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in Vercel, then redeploy.",
    );
  }
  if (!ALLOWED_FILE_TYPES.includes(contentType)) {
    throw new Error(`File type not allowed: ${contentType}`);
  }

  const ext = filename.split(".").pop() ?? "bin";
  const key = `${folder}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;

  const { url, fields } = await createPresignedPost(s3, {
    Bucket: BUCKET,
    Key: key,
    Conditions: [
      ["content-length-range", 0, MAX_SIZE],
      ["eq", "$Content-Type", contentType],
    ],
    Fields: {
      "Content-Type": contentType,
    },
    Expires: 300, // 5 minutes
  });

  const fileUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

  return { url, fields, fileUrl };
}

export async function deleteFile(fileUrl: string): Promise<void> {
  const prefix = `https://${BUCKET}.s3.${REGION}.amazonaws.com/`;
  if (!fileUrl.startsWith(prefix)) return;
  const key = fileUrl.slice(prefix.length);
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export { ALLOWED_IMAGE_TYPES, ALLOWED_FILE_TYPES, MAX_SIZE };
