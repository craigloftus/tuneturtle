import { Express, Request, Response, NextFunction } from "express";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3Client: S3Client | null = null;

// Request logging middleware
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, url } = req;
  
  console.log(`[${new Date().toISOString()}] ${method} ${url} - Started`);

  // Log response after completion
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${method} ${url} - ${res.statusCode} - ${duration}ms`
    );
  });

  next();
};

// CORS middleware for audio streaming
const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Disposition');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
};

async function validateBucketPermissions(s3: S3Client, bucket: string) {
  try {
    // Test ListBucket permission
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      MaxKeys: 1,
    });
    await s3.send(listCommand);

    // Test GetObject permission by attempting to get a signed URL
    const objects = await s3.send(listCommand);
    if (objects.Contents && objects.Contents.length > 0) {
      const getCommand = new GetObjectCommand({
        Bucket: bucket,
        Key: objects.Contents[0].Key!,
      });
      await getSignedUrl(s3, getCommand, { expiresIn: 3600 });
    }

    return true;
  } catch (error) {
    console.error("[Permission Check] Error:", error);
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('access denied') || 
          errorMessage.includes('forbidden') || 
          errorMessage.includes('not authorized')) {
        throw new Error('Insufficient permissions. Please check your IAM policy.');
      }
    }
    throw error;
  }
}

export function registerRoutes(app: Express) {
  // Add request logging middleware
  app.use('/api', requestLogger);
  app.use('/api', corsMiddleware);

  app.post("/api/aws/validate", async (req, res) => {
    const { accessKeyId, secretAccessKey, region, bucket } = req.body;
    console.log(`[AWS Validate] Attempting to validate credentials for bucket: ${bucket} in region: ${region}`);

    try {
      s3Client = new S3Client({
        credentials: { accessKeyId, secretAccessKey },
        region,
      });

      // Validate required permissions
      await validateBucketPermissions(s3Client, bucket);
      console.log(`[AWS Validate] Successfully validated credentials and permissions for bucket: ${bucket}`);

      // Store credentials in session
      req.session.awsConfig = { accessKeyId, secretAccessKey, region, bucket };
      
      res.json({ success: true });
    } catch (error) {
      console.error("[AWS Validate] Error validating credentials:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      res.status(401).json({ 
        error: "AWS Configuration Error",
        message: errorMessage
      });
    }
  });

  app.get("/api/aws/list", async (req, res) => {
    // Verify session
    if (!req.session.awsConfig) {
      console.warn("[AWS List] No credentials found in session");
      return res.status(401).json({ error: "No credentials" });
    }

    const { bucket } = req.session.awsConfig;
    console.log(`[AWS List] Listing objects in bucket: ${bucket}`);

    try {
      if (!s3Client) {
        console.log("[AWS List] Initializing S3 client with session credentials");
        s3Client = new S3Client({
          credentials: {
            accessKeyId: req.session.awsConfig.accessKeyId,
            secretAccessKey: req.session.awsConfig.secretAccessKey,
          },
          region: req.session.awsConfig.region,
        });
      }

      const command = new ListObjectsV2Command({
        Bucket: bucket,
      });

      const response = await s3Client.send(command);
      console.log(`[AWS List] Found ${response.Contents?.length || 0} objects in bucket`);

      const tracks = await Promise.all(
        (response.Contents || [])
          .filter(obj => obj.Key?.toLowerCase().match(/\.mp3$/i))
          .map(async obj => {
            const getObjectCommand = new GetObjectCommand({
              Bucket: bucket,
              Key: obj.Key,
              ResponseContentType: 'audio/mpeg',
              ResponseContentDisposition: `attachment; filename="${encodeURIComponent(obj.Key || '')}"`,
            });
            
            const url = await getSignedUrl(s3Client!, getObjectCommand, {
              expiresIn: 3600,
            });

            return {
              key: obj.Key,
              size: obj.Size,
              lastModified: obj.LastModified,
              url,
              contentType: 'audio/mpeg',
            };
          })
      );

      console.log(`[AWS List] Returning ${tracks.length} audio tracks`);
      res.json(tracks);
    } catch (error) {
      console.error("[AWS List] Error listing S3 objects:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      res.status(500).json({ 
        error: "Failed to list S3 objects",
        message: errorMessage
      });
    }
  });
}
