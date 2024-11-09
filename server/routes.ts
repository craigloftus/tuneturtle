import { Express } from "express";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

let s3Client: S3Client | null = null;

export function registerRoutes(app: Express) {
  app.post("/api/aws/validate", async (req, res) => {
    const { accessKeyId, secretAccessKey, region, bucket } = req.body;

    try {
      s3Client = new S3Client({
        credentials: { accessKeyId, secretAccessKey },
        region,
      });

      // Test the credentials by listing objects
      await s3Client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          MaxKeys: 1,
        })
      );

      // Store credentials in session
      req.session.awsConfig = { accessKeyId, secretAccessKey, region, bucket };
      
      res.json({ success: true });
    } catch (error) {
      console.error("AWS validation error:", error);
      res.status(401).json({ error: "Invalid AWS credentials" });
    }
  });

  app.get("/api/aws/list", async (req, res) => {
    if (!req.session.awsConfig) {
      return res.status(401).json({ error: "No credentials" });
    }

    const { bucket } = req.session.awsConfig;

    try {
      if (!s3Client) {
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

      res.json(tracks);
    } catch (error) {
      console.error("Error listing S3 objects:", error);
      res.status(500).json({ error: "Failed to list S3 objects" });
    }
  });
}
