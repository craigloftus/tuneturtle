export interface S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
}

export interface MetadataProgress {
  progress: number;  // Progress percentage (0-100)
  stage: 'initializing' | 'reading' | 'parsing' | 'complete';
  fileName: string;
}

export interface TrackMetadata {
  title: string;
  artist: string;
  duration: number;
  bitrate: number;
  mimeType: string;
  extractionProgress?: MetadataProgress;
}

export interface Track {
  key: string;
  size: number;
  lastModified: Date;
  album: string;
  fileName: string;
  metadata?: TrackMetadata;
}

export interface Album {
  name: string;
  tracks: Track[];
  coverUrl?: string;
}

export type ViewMode = 'list' | 'grid';
