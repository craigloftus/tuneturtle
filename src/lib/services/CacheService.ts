import { S3Credentials, Track } from "@/types/aws";

export class CacheService {
  private static instance: CacheService;
  private readonly AWS_CREDENTIALS_KEY = 'aws_credentials';

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  public saveCredentials(credentials: S3Credentials): void {
    try {
      localStorage.setItem(this.AWS_CREDENTIALS_KEY, JSON.stringify(credentials));
    } catch (error) {
      console.error('[CacheService] Failed to save AWS credentials:', error);
    }
  }

  public getCredentials(): S3Credentials | null {
    try {
      const stored = localStorage.getItem(this.AWS_CREDENTIALS_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('[CacheService] Failed to retrieve AWS credentials:', error);
      return null;
    }
  }

  public clearCredentials(): void {
    try {
      localStorage.removeItem(this.AWS_CREDENTIALS_KEY);
    } catch (error) {
      console.error('[CacheService] Failed to clear AWS credentials:', error);
    }
  }

  public saveTracks(tracks: Track[]): void {
    try {
      localStorage.setItem('tracks', JSON.stringify(tracks));
    } catch (error) {
      console.error('[CacheService] Failed to save tracks:', error);
    }
  }
  
  public getTracks(): Track[] | null {
    try {
      const stored = localStorage.getItem('tracks');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('[CacheService] Failed to retrieve tracks:', error);
      return null;
    }
  }
}