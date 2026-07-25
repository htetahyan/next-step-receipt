'use server';

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getS3Client() {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function getPresignedUrl(fileName: string, contentType: string) {
  try {
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    if (!bucketName) throw new Error("Missing R2 Bucket Name");

    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFileName,
      ContentType: contentType,
    });

    const s3Client = getS3Client();
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    const publicDomain = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '').replace(/\/$/, '');
    const publicUrl = `${publicDomain}/${uniqueFileName}`;

    return { success: true, uploadUrl: url, publicUrl, fileKey: uniqueFileName };
  } catch (error: any) {
    console.error("Presigned URL error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteFromR2(fileKey: string) {
  try {
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    if (!bucketName) throw new Error("Missing R2 Bucket Name");

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });

    const s3Client = getS3Client();
    await s3Client.send(command);
    return { success: true };
  } catch (error: any) {
    console.error("Delete R2 error:", error);
    return { success: false, error: error.message };
  }
}
