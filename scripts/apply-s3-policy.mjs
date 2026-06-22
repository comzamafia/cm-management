// One-off: allow public read of objects so uploaded images render in the app.
// Reads AWS creds from .env. Run: node scripts/apply-s3-policy.mjs
import { readFileSync } from "fs";
import { S3Client, PutBucketPolicyCommand } from "@aws-sdk/client-s3";

for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const Bucket = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_S3_REGION || "us-east-2";

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const Policy = JSON.stringify({
  Version: "2012-10-17",
  Statement: [
    {
      Sid: "PublicReadUploads",
      Effect: "Allow",
      Principal: "*",
      Action: "s3:GetObject",
      Resource: `arn:aws:s3:::${Bucket}/*`,
    },
  ],
});

await s3.send(new PutBucketPolicyCommand({ Bucket, Policy }));
console.log(`✓ Applied public-read policy to "${Bucket}".`);
