import { S3Credentials } from "@/types/aws";
import { CacheService } from "./services/CacheService";
import { S3Service } from "./services/S3Service";

export async function validateS3Credentials(credentials: S3Credentials): Promise<{ success: boolean }> {
  const s3Service = S3Service.getInstance();
  return await s3Service.validateCredentials(credentials);
}

export function checkStoredCredentials(): S3Credentials | null {
  const cacheService = CacheService.getInstance();
  return cacheService.getCredentials();
}
