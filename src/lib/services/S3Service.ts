import { S3Client, ListObjectsV2Command, _Object } from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as s3GetSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
}

export class S3Service {
  private static instance: S3Service;
  private s3Client: S3Client | null = null;

  private constructor() {}

  private readonly AWS_CREDENTIALS_KEY = "aws_credentials";

  public saveCredentials(credentials: S3Credentials): void {
    try {
      localStorage.setItem(
        this.AWS_CREDENTIALS_KEY,
        JSON.stringify(credentials),
      );
    } catch (error) {
      console.error("[S3Service] Failed to save AWS credentials:", error);
    }
  }

  public getCredentials(): S3Credentials | null {
    try {
      const stored = localStorage.getItem(this.AWS_CREDENTIALS_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error("[S3Service] Failed to retrieve AWS credentials:", error);
      return null;
    }
  }

  public clearCredentials(): void {
    try {
      localStorage.removeItem(this.AWS_CREDENTIALS_KEY);
    } catch (error) {
      console.error("[S3Service] Failed to clear AWS credentials:", error);
    }
  }

  public static getInstance(): S3Service {
    if (!S3Service.instance) {
      S3Service.instance = new S3Service();
    }
    return S3Service.instance;
  }

  private async initializeClient(
    credentials: S3Credentials,
  ): Promise<S3Client> {
    this.s3Client = new S3Client({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });
    return this.s3Client;
  }

  public async validateCredentials(
    credentials: S3Credentials,
  ): Promise<{ success: boolean }> {
    try {
      const client = await this.initializeClient(credentials);
      const command = new ListObjectsV2Command({
        Bucket: credentials.bucket,
        MaxKeys: 1,
      });

      await client.send(command);
      this.saveCredentials(credentials);
      return { success: true };
    } catch (error) {
      console.error("[S3Service] Validation error:", error);
      throw new Error(
        error instanceof Error ? error.message : "Invalid AWS credentials",
      );
    }
  }

  public async getClientAndBucket(): Promise<{
    s3Client: S3Client;
    bucket: string;
  }> {
    const credentials = this.getCredentials();
    if (!credentials) {
      throw new Error("[S3Service] No AWS credentials found");
    }

    if (!this.s3Client) {
      await this.initializeClient(credentials);
    }

    return {
      s3Client: this.s3Client!,
      bucket: credentials.bucket,
    };
  }

  public async getSignedUrl(key: string) {
    const { s3Client, bucket } = await this.getClientAndBucket();

    const objectCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return s3GetSignedUrl(s3Client, objectCommand, {
      expiresIn: 3600,
    });
  }

  public async fetchRange(key: string, start: number, end: number): Promise<Blob|ReadableStream> {
    const { s3Client, bucket } = await this.getClientAndBucket();

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      Range: `bytes=${start}-${end}`,
    });

    const response = await s3Client.send(command);

    return response.Body as Blob|ReadableStream;
  }

  public async listObjects(options: {
    continuationToken?: string;
    limit?: number;
  }): Promise<{
    objects: _Object[];
    nextContinuationToken?: string;
    isTruncated: boolean;
  }> {
    const { limit = 100, continuationToken } = options;

    const credentials = this.getCredentials();
    if (!credentials) {
      throw new Error("[S3Service] No AWS credentials found");
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
        objects: response.Contents || [],
        nextContinuationToken: response.NextContinuationToken,
        isTruncated: response.IsTruncated || false,
      };
    } catch (error) {
      console.error("[S3Service] Error fetching tracks:", error);
      throw error;
    }
  }
}
