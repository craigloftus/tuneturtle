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
import { 
  saveAwsCredentials, 
  getAwsCredentials, 
  getTracksFromCache, 
  updateTracksCache,
  clearTracksCache,
  saveMetadataToCache,
  getCachedMetadataForTrack
} from "./storage";

let s3Client: S3Client | null = null;
const METADATA_BYTE_RANGE = 5000;
const SIGNED_URL_EXPIRY = 3600;
const BATCH_SIZE = 5; // Number of concurrent metadata fetches

interface ListResponse {
  tracks: Track[];
  nextContinuationToken?: string;
  isTruncated: boolean;
  totalFound: number;
  maxKeys: number;
}

async function initializeS3Client(credentials: S3Credentials) {
  s3Client = new S3Client({
    region: credentials.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    }
  });
  return s3Client;
}

export async function validateS3Credentials(credentials: S3Credentials) {
  try {
    const client = await initializeS3Client(credentials);
    const command = new ListObjectsV2Command({
      Bucket: credentials.bucket,
      MaxKeys: 1,
    });
    
    await client.send(command);
    saveAwsCredentials(credentials);
    clearTracksCache();
    return { success: true };
  } catch (error) {
    console.error('[AWS] Validation error:', error);
    throw new Error(error instanceof Error ? error.message : 'Invalid AWS credentials');
  }
}

async function extractMetadata(audioBlob: Blob): Promise<TrackMetadata> {
  try {
    const metadata = await mm.parseBlob(audioBlob, { duration: true });
    return {
      title: metadata.common.title || '',
      artist: metadata.common.artist || 'Unknown Artist',
      duration: metadata.format.duration || 0,
      bitrate: metadata.format.bitrate || 0,
      mimeType: metadata.format.mimeType || 'audio/mpeg'
    };
  } catch (error) {
    console.warn('[AWS] Metadata extraction failed:', error);
    return {
      title: '',
      artist: 'Unknown Artist',
      duration: 0,
      bitrate: 0,
      mimeType: 'audio/mpeg'
    };
  }
}

export async function fetchTrackMetadata(
  key: string,
  bucket: string,
  client: S3Client
): Promise<TrackMetadata | null> {
  try {
    // Check cache first
    const cachedMetadata = getCachedMetadataForTrack(key);
    if (cachedMetadata) {
      return cachedMetadata;
    }

    // Get metadata using byte range
    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      Range: `bytes=0-${METADATA_BYTE_RANGE}`
    });

    const response = await client.send(getCommand);
    const metadataBlob = await response.Body?.transformToByteArray();
    
    if (!metadataBlob) {
      throw new Error('Failed to read metadata blob');
    }

    const metadata = await extractMetadata(new Blob([metadataBlob]));
    saveMetadataToCache(key, metadata, response.ETag);
    
    return metadata;
  } catch (error) {
    console.error('[AWS] Failed to fetch metadata for track:', key, error);
    return null;
  }
}

async function createTrackFromS3Object(
  obj: _Object,
  bucket: string,
  client: S3Client
): Promise<Track> {
  const key = obj.Key!;
  const pathParts = key.split('/');
  const fileName = pathParts[pathParts.length - 1];
  const album = pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'Unknown Album';

  // Generate signed URL
  const fullTrackCommand = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentType: 'audio/mpeg',
  });
  
  const url = await getSignedUrl(client, fullTrackCommand, {
    expiresIn: SIGNED_URL_EXPIRY
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

export async function listS3Objects(options: {
  continuationToken?: string;
  limit?: number;
  useCache?: boolean;
} = {}): Promise<ListResponse> {
  const { 
    limit = 100,
    continuationToken,
    useCache = true
  } = options;

  // Check cache first
  if (!continuationToken && useCache) {
    const cachedData = getTracksFromCache();
    if (cachedData) {
      console.log('[AWS] Using cached track data:', {
        trackCount: cachedData.tracks.length,
        nextToken: cachedData.nextContinuationToken,
        isTruncated: cachedData.isTruncated
      });
      return {
        tracks: cachedData.tracks,
        nextContinuationToken: cachedData.nextContinuationToken,
        isTruncated: cachedData.isTruncated,
        totalFound: cachedData.totalFound,
        maxKeys: limit
      };
    }
  }

  const credentials = getAwsCredentials();
  if (!credentials) {
    throw new Error('No AWS credentials found');
  }

  if (!s3Client) {
    await initializeS3Client(credentials);
  }

  try {
    console.log('[AWS] Fetching tracks:', {
      limit,
      continuationToken: continuationToken || 'none'
    });

    const command = new ListObjectsV2Command({
      Bucket: credentials.bucket,
      MaxKeys: limit,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client!.send(command);
    
    // Filter audio files
    const audioFiles = (response.Contents || [])
      .filter(obj => obj.Key?.toLowerCase().match(/\.(mp3|flac|wav|m4a|ogg)$/i));

    // Create basic track objects
    const tracks = await Promise.all(
      audioFiles.map(obj => createTrackFromS3Object(obj, credentials.bucket, s3Client!))
    );

    // Update cache with basic track info
    if (!continuationToken) {
      updateTracksCache(
        tracks,
        response.NextContinuationToken,
        response.IsTruncated || false,
        response.KeyCount || tracks.length
      );
    }

    return {
      tracks,
      nextContinuationToken: response.NextContinuationToken,
      isTruncated: response.IsTruncated || false,
      totalFound: response.KeyCount || tracks.length,
      maxKeys: limit
    };
  } catch (error) {
    console.error('[AWS] Error fetching tracks:', error);
    throw error;
  }
}

export async function loadAllTracks(pageSize: number = 100): Promise<Track[]> {
  console.log('[AWS] Starting to load all tracks');
  const allTracks: Track[] = [];
  let continuationToken: string | undefined;
  let isTruncated = true;
  let page = 1;

  try {
    // First, load all tracks without metadata
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

    // Then progressively load metadata
    const credentials = getAwsCredentials();
    if (!credentials || !s3Client) {
      throw new Error('No AWS credentials found');
    }

    // Process metadata in batches
    for (let i = 0; i < allTracks.length; i += BATCH_SIZE) {
      const batch = allTracks.slice(i, i + BATCH_SIZE);
      const metadataPromises = batch.map(track => 
        fetchTrackMetadata(track.key, credentials.bucket, s3Client!)
      );
      
      const metadataResults = await Promise.all(metadataPromises);
      
      // Update tracks with metadata
      metadataResults.forEach((metadata, index) => {
        if (metadata) {
          batch[index].metadata = metadata;
        }
      });

      console.log('[AWS] Processed metadata batch:', {
        start: i,
        end: i + batch.length,
        total: allTracks.length
      });
    }

    return allTracks;
  } catch (error) {
    console.error('[AWS] Error loading all tracks:', error);
    throw error;
  }
}

export function checkStoredCredentials(): S3Credentials | null {
  return getAwsCredentials();
}
