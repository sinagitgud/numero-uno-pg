import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';

const isR2Configured =
  process.env.CLOUDFLARE_ACCOUNT_ID &&
  process.env.CLOUDFLARE_ACCOUNT_ID !== 'REPLACE_IN_PHASE_2' &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_ACCESS_KEY_ID !== 'REPLACE_IN_PHASE_2';

let s3: S3Client | null = null;

if (isR2Configured) {
  s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export const r2Available = !!s3;

export type UploadFolder = 'aadhaar' | 'receipts' | 'agreements';

/**
 * Upload a buffer to Cloudflare R2 and return the public URL.
 * In dev mode (no credentials), returns a placeholder URL.
 */
export async function uploadToR2(
  buffer: Buffer,
  mimeType: string,
  folder: UploadFolder,
): Promise<string> {
  if (!s3) {
    return `https://dev-placeholder.r2.example.com/${folder}/${uuid()}`;
  }

  const key = `${folder}/${Date.now()}-${uuid()}`;
  const bucket = process.env.R2_BUCKET_NAME!;

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
