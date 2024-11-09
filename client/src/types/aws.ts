export interface S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
}

export interface Track {
  key: string;
  size: number;
  lastModified: Date;
  url: string;
  album: string;  // Extracted from the folder structure
  fileName: string;  // The actual file name without the path
}

export interface Album {
  name: string;
  tracks: Track[];
  coverUrl?: string;  // Optional cover art URL
}

export type ViewMode = 'list' | 'grid';
