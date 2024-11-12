import { S3Credentials } from "@/types/aws";

const AWS_CREDENTIALS_KEY = 'aws_credentials';

export function saveAwsCredentials(credentials: S3Credentials): void {
  try {
    localStorage.setItem(AWS_CREDENTIALS_KEY, JSON.stringify(credentials));
  } catch (error) {
    console.error('[Storage] Failed to save AWS credentials to localStorage:', error);
  }
}

export function getAwsCredentials(): S3Credentials | null {
  try {
    const stored = localStorage.getItem(AWS_CREDENTIALS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('[Storage] Failed to retrieve AWS credentials from localStorage:', error);
    return null;
  }
}

export function clearAwsCredentials(): void {
  try {
    localStorage.removeItem(AWS_CREDENTIALS_KEY);
  } catch (error) {
    console.error('[Storage] Failed to clear AWS credentials from localStorage:', error);
  }
}