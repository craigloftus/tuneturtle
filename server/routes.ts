import { Express, Request, Response, NextFunction } from "express";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

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

export function registerRoutes(app: Express) {
  // Add request logging middleware
  app.use('/api', requestLogger);

  app.post("/api/aws/validate", async (req, res) => {
    const { accessKeyId, secretAccessKey, region, bucket } = req.body;
    console.log(`[AWS Validate] Attempting to validate credentials for bucket: ${bucket} in region: ${region}`);

    try {
      s3Client = new S3Client({
        credentials: { accessKeyId, secretAccessKey },
        region,
      });

      // Test the credentials by listing objects
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        MaxKeys: 1,
      });

      await s3Client.send(command);
      console.log(`[AWS Validate] Successfully validated credentials for bucket: ${bucket}`);

      // Store credentials in session
      req.session.awsConfig = { accessKeyId, secretAccessKey, region, bucket };
      
      res.json({ success: true });
    } catch (error) {
      console.error("[AWS Validate] Error validating credentials:", error);
      res.status(401).json({ 
        error: "Invalid AWS credentials",
        message: error instanceof Error ? error.message : "Unknown error occurred"
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
          .filter(obj => obj.Key?.match(/\.(mp3|wav|ogg|m4a)$/i))
          .map(async obj => {
            const getObjectCommand = new GetObjectCommand({
              Bucket: bucket,
              Key: obj.Key,
            });
            
            const url = await getSignedUrl(s3Client!, getObjectCommand, {
              expiresIn: 3600,
            });

            return {
              key: obj.Key,
              size: obj.Size,
              lastModified: obj.LastModified,
              url,
            };
          })
      );

      console.log(`[AWS List] Returning ${tracks.length} audio tracks`);
      res.json(tracks);
    } catch (error) {
      console.error("[AWS List] Error listing S3 objects:", error);
      res.status(500).json({ 
        error: "Failed to list S3 objects",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });
}
