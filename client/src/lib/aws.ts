import { S3Credentials } from "@/types/aws";

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
  
  return response.json();
}

export async function listS3Objects() {
  const response = await fetch('/api/aws/list');
  if (!response.ok) {
    throw new Error('Failed to fetch tracks');
  }
  return response.json();
}
