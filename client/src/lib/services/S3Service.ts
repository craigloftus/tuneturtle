import { 
  S3Client, 
  ListObjectsV2Command, 
  GetObjectCommand,
  _Object
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Credentials, Track } from "@/types/aws";
import { CacheService } from "./CacheService";

export class S3Service {
  private static instance: S3Service;
  private s3Client: S3Client | null = null;
  private cacheService: CacheService;

  private constructor() {
    this.cacheService = CacheService.getInstance();
  }

  public static getInstance(): S3Service {
    if (!S3Service.instance) {
      S3Service.instance = new S3Service();
    }
    return S3Service.instance;
  }

  private async initializeClient(credentials: S3Credentials): Promise<S3Client> {
    this.s3Client = new S3Client({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      }
    });
    return this.s3Client;
  }

  public async validateCredentials(credentials: S3Credentials): Promise<{ success: boolean }> {
    try {
      const client = await this.initializeClient(credentials);
      const command = new ListObjectsV2Command({
        Bucket: credentials.bucket,
        MaxKeys: 1,
      });
      
      await client.send(command);
      this.cacheService.saveCredentials(credentials);
      return { success: true };
    } catch (error) {
      console.error('[S3Service] Validation error:', error);
      throw new Error(error instanceof Error ? error.message : 'Invalid AWS credentials');
    }
  }

  public async getClientAndBucket(): Promise<{ s3Client: S3Client, bucket: string }> {
    const credentials = this.cacheService.getCredentials();
    if (!credentials) {
      throw new Error('No AWS credentials found');
    }

    if (!this.s3Client) {
      await this.initializeClient(credentials);
    }

    return {
      s3Client: this.s3Client!,
      bucket: credentials.bucket
    };
  }

  public async listObjects(options: {
    continuationToken?: string;
    limit?: number;
  }): Promise<{
    objects: Objects[];
    nextContinuationToken?: string;
    isTruncated: boolean;
  }> {
    const { 
      limit = 100,
      continuationToken,
    } = options;

    const credentials = this.cacheService.getCredentials();
    if (!credentials) {
      throw new Error('No AWS credentials found');
    }

    if (!this.s3Client) {
      await this.initializeClient(credentials);
    }

    try {
      const command = new ListObjectsV2Command({
        Bucket: credentials.bucket,
        MaxKeys: limit,
        ContinuationToken: continuationToken,
      });

      const response = await this.s3Client!.send(command);

      return {
        objects: (response.Contents || []),
        nextContinuationToken: response.NextContinuationToken,
        isTruncated: response.IsTruncated || false,
      };
    } catch (error) {
      console.error('[S3Service] Error fetching tracks:', error);
      throw error;
    }
  }
}