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
}
