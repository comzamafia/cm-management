type PresignedResponse = {
  url: string;
  fields: Record<string, string>;
  fileUrl: string;
};

export async function uploadFile(
  file: File,
  folder: string = "uploads",
): Promise<string> {
  // 1. Get presigned POST from our API
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      folder,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Upload failed (${res.status})`);
  }

  const { url, fields, fileUrl } = (await res.json()) as PresignedResponse;

  // 2. Upload directly to S3 (the `file` field must be appended LAST).
  const formData = new FormData();
  Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
  formData.append("file", file);

  let s3Res: Response;
  try {
    s3Res = await fetch(url, { method: "POST", body: formData });
  } catch {
    // A network/TypeError here is almost always missing S3 CORS on the bucket.
    throw new Error("Could not reach storage — check the S3 bucket CORS configuration.");
  }

  if (!s3Res.ok && s3Res.status !== 204) {
    const detail = await s3Res.text().catch(() => "");
    const code = detail.match(/<Code>([^<]+)<\/Code>/)?.[1];
    throw new Error(`Storage rejected the upload (${s3Res.status}${code ? ` ${code}` : ""}).`);
  }

  return fileUrl;
}

export async function uploadFiles(
  files: File[],
  folder: string = "uploads",
): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    urls.push(await uploadFile(file, folder));
  }
  return urls;
}
