import crypto from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import '../config/env.js';

const endpoint = process.env.AWS_ENDPOINT_URL_S3;
const region = process.env.AWS_REGION || 'auto';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucketName = process.env.S3_BUCKET || 'assets';

const s3Client =
  endpoint && accessKeyId && secretAccessKey
    ? new S3Client({
        region,
        endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })
    : null;

export type UploadFolder = 'avatars' | 'sushis' | 'locales';

export function isStorageConfigured(): boolean {
  return s3Client !== null;
}

export async function uploadWebpToBucket(
  dataUrl: string,
  folder: UploadFolder,
): Promise<string> {
  if (!s3Client || !endpoint) {
    throw new Error('Object Storage no configurado (faltan variables AWS_*).');
  }

  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match || !match[1] || !match[2]) {
    throw new Error('Formato de imagen inválido (se esperaba data URL base64).');
  }

  const contentType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const ext = contentType === 'image/webp' ? 'webp' : 'png';
  const key = `${folder}/${crypto.randomUUID()}.${ext}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  const cleanEndpoint = endpoint.replace(/\/+$/, '');
  return `${cleanEndpoint}/${bucketName}/${key}`;
}
