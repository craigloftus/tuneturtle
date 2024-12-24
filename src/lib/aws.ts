import { S3Credentials, S3Service } from "./services/S3Service";

export async function validateS3Credentials(credentials: S3Credentials): Promise<{ success: boolean }> {
  const s3Service = S3Service.getInstance();
  return await s3Service.validateCredentials(credentials);
}

export function checkStoredCredentials(): S3Credentials | null {
  const s3Service = S3Service.getInstance();
  return s3Service.getCredentials();
}
