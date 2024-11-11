import { 
  S3Client, 
  ListObjectsV2Command, 
  GetObjectCommand,
  ListObjectsV2CommandInput,
  _Object
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as mm from 'music-metadata-browser';
import { S3Credentials, Track, TrackMetadata } from "@/types/aws";
import { S3Service } from './services/S3Service';
import { CacheService } from './services/CacheService';

// Export singleton instances
const s3Service = S3Service.getInstance();
const cacheService = CacheService.getInstance();

// Define supported audio formats and their MIME types
const SUPPORTED_FORMATS = {
  mp3: 'audio/mpeg',
  flac: 'audio/flac',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  aac: 'audio/aac'
};

interface ListResponse {
  tracks: Track[];
  nextContinuationToken?: string;
  isTruncated: boolean;
  totalFound: number;
  maxKeys: number;
}

export async function validateS3Credentials(credentials: S3Credentials) {
  return s3Service.validateCredentials(credentials);
}

export async function listS3Objects(options: {
  continuationToken?: string;
  limit?: number;
  useCache?: boolean;
} = {}): Promise<ListResponse> {
  return s3Service.listObjects(options);
}

export async function loadAllTracks(pageSize: number = 100): Promise<Track[]> {
  console.log('[AWS] Starting to load all tracks');
  const allTracks: Track[] = [];
  let continuationToken: string | undefined;
  let isTruncated = true;
  let page = 1;

  try {
    while (isTruncated) {
      console.log('[AWS] Loading page', page, {
        token: continuationToken || 'none',
        tracksLoaded: allTracks.length
      });

      const response = await listS3Objects({
        limit: pageSize,
        continuationToken,
        useCache: page === 1
      });

      allTracks.push(...response.tracks);
      continuationToken = response.nextContinuationToken;
      isTruncated = response.isTruncated;

      console.log('[AWS] Loaded page', page, {
        newTracks: response.tracks.length,
        totalTracks: allTracks.length,
        hasMore: isTruncated
      });

      page++;
    }

    return allTracks;
  } catch (error) {
    console.error('[AWS] Error loading all tracks:', error);
    throw error;
  }
}

export function checkStoredCredentials(): S3Credentials | null {
  return cacheService.getCredentials();
}