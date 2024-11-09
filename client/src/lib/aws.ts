import { S3Credentials } from "@/types/aws";
import { saveAwsCredentials, getAwsCredentials } from "./storage";

export async function validateS3Credentials(credentials: S3Credentials) {
  const response = await fetch('/api/aws/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });
  
  if (!response.ok) {
    throw new Error('Invalid AWS credentials');
  }
  
  // Save credentials after successful validation
  saveAwsCredentials(credentials);
  return response.json();
}

export async function listS3Objects() {
  const response = await fetch('/api/aws/list');
  if (!response.ok) {
    const error = await response.json();
    if (error.error === "No credentials") {
      // Clear stored credentials if they're invalid
      clearAwsCredentials();
    }
    throw new Error('Failed to fetch tracks');
  }
  return response.json();
}

export function checkStoredCredentials(): S3Credentials | null {
  return getAwsCredentials();
}
