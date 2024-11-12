import { 
  S3Client, 
  ListObjectsV2Command, 
  GetObjectCommand,
  _Object
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Credentials, Track } from "@/types/aws";
import { CacheService } from "./CacheService";
import { MetadataService } from "./MetadataService";

export class S3Service {
  private static instance: S3Service;
  private s3Client: S3Client | null = null;
  private cacheService: CacheService;
  private metadataService: MetadataService;
  
  private constructor() {
    this.cacheService = CacheService.getInstance();
    this.metadataService = MetadataService.getInstance();
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

  private async createTrackFromS3Object(
    obj: _Object,
    bucket: string,
    client: S3Client
  ): Promise<Track> {
    const key = obj.Key!;
    const pathParts = key.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const album = pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'Unknown Album';
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeType = this.metadataService.getMimeType(fileExtension);

    const fullTrackCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentType: mimeType,
    });
    
    const url = await getSignedUrl(client, fullTrackCommand, {
      expiresIn: 3600
    });

    return {
      key,
      size: obj.Size || 0,
      lastModified: obj.LastModified || new Date(),
      url,
      album,
      fileName
    };
  }

  public async listObjects(options: {
    continuationToken?: string;
    limit?: number;
  } = {}): Promise<{
    tracks: Track[];
    nextContinuationToken?: string;
    isTruncated: boolean;
    totalFound: number;
    maxKeys: number;
  }> {
    const { 
      limit = 100,
      continuationToken
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
      
      const audioFiles = (response.Contents || [])
        .filter(obj => this.metadataService.isAudioFile(obj.Key || ''));

      const tracks = await Promise.all(
        audioFiles.map(obj => this.createTrackFromS3Object(obj, credentials.bucket, this.s3Client!))
      );

      return {
        tracks,
        nextContinuationToken: response.NextContinuationToken,
        isTruncated: response.IsTruncated || false,
        totalFound: response.KeyCount || tracks.length,
        maxKeys: limit
      };
    } catch (error) {
      console.error('[S3Service] Error fetching tracks:', error);
      throw error;
    }
  }
}