// One-off: apply the CORS rules in s3-cors.json to the S3 bucket.
// Reads AWS creds from .env (gitignored). Run: node scripts/apply-s3-cors.mjs
import { readFileSync } from "fs";
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

// Minimal .env loader (no dotenv dependency needed).
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const Bucket = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_S3_REGION || "us-east-2";
if (!Bucket || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error("Missing AWS_S3_BUCKET / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in .env");
  process.exit(1);
}

const rules = JSON.parse(readFileSync(new URL("../s3-cors.json", import.meta.url), "utf8"));

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const CORSRules = rules.map((r) => ({
  AllowedHeaders: r.AllowedHeaders,
  AllowedMethods: r.AllowedMethods,
  AllowedOrigins: r.AllowedOrigins,
  ExposeHeaders: r.ExposeHeaders,
  MaxAgeSeconds: r.MaxAgeSeconds,
}));

await s3.send(new PutBucketCorsCommand({ Bucket, CORSConfiguration: { CORSRules } }));
console.log(`✓ Applied CORS to bucket "${Bucket}" (${region}).`);

const check = await s3.send(new GetBucketCorsCommand({ Bucket }));
console.log("Current CORS rules:", JSON.stringify(check.CORSRules, null, 2));
