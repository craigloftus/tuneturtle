import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { S3Service } from "@/lib/services/S3Service";
import { CacheService } from "@/lib/services/CacheService";
import { Progress } from "@/components/ui/progress";
import { Track } from "@/types/aws";
import { _Object, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MetadataService } from "@/lib/services/MetadataService";
import { Header } from "@/components/Header";

// Supported audio formats and their MIME types
const SUPPORTED_FORMATS = {
  mp3: "audio/mpeg",
  flac: "audio/flac",
  wav: "audio/wav",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  aac: "audio/aac",
} as const;

export function Indexing() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isIndexing, setIsIndexing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const metadataService = MetadataService.getInstance();

  const isAudioFile = (fileName: string): boolean => {
    const extension = fileName.split(".").pop()?.toLowerCase() || "";
    return extension in SUPPORTED_FORMATS;
  };

  const getMimeType = (extension: string): string => {
    return (
      SUPPORTED_FORMATS[extension as keyof typeof SUPPORTED_FORMATS] ||
      "audio/mpeg"
    );
  };

  const createTrackFromS3Object = async (
    obj: _Object,
    bucket: string,
    client: S3Client,
  ): Promise<Track> => {
    const key = obj.Key!;
    const pathParts = key.split("/");
    const fileName = pathParts[pathParts.length - 1];
    const album =
      pathParts.length > 1 ? pathParts[pathParts.length - 2] : "Unknown Album";
    const fileExtension = fileName.split(".").pop()?.toLowerCase() || "";
    const mimeType = getMimeType(fileExtension);

    const fullTrackCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentType: mimeType,
    });

    const url = await getSignedUrl(client, fullTrackCommand, {
      expiresIn: 3600,
    });

    return {
      key,
      size: obj.Size || 0,
      lastModified: obj.LastModified || new Date(),
      url,
      album,
      fileName,
    };
  };

  useEffect(() => {
    const startIndexing = async () => {
      // Check if S3 credentials are stored
      const storedCredentials = CacheService.getInstance().getCredentials();
      if (!storedCredentials) {
        navigate("/setup");
      }
      
      setIsIndexing(true);
      try {
        const s3Service = S3Service.getInstance();
        const cacheService = CacheService.getInstance();
        
        const { s3Client, bucket } = await s3Service.getClientAndBucket();
        const tracks = [];

        // Call listObjects continually until nextContinuationToken is null
        let isTruncated = true;
        let nextContinuationToken: string | null = null;
        let maxKeys = 100;
        
        while (isTruncated) {
          console.log("Fetching objects...");
          const {
            objects,
            nextContinuationToken: nextToken,
            isTruncated: truncated,
          } = await s3Service.listObjects({
            continuationToken: nextContinuationToken,
            limit: maxKeys,
          });

          for (const obj of objects) {
            const track = await createTrackFromS3Object(obj, bucket, s3Client);
            tracks.push(track);
          }

          nextContinuationToken = nextToken;
          isTruncated = truncated;

          // sleep before fetching next batch of objects
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Final progress update
        toast({
          title: "Success",
          description: `Found ${tracks.length} tracks in your music library`,
        });

        // Save tracks to cache
        cacheService.saveTracks(tracks);
        
        // Small delay before navigation for better UX
        setTimeout(() => navigate("/"), 5000);
      } catch (err) {
        setError(err as Error);
        toast({
          title: "Indexing Error",
          description: (err as Error).message,
          variant: "destructive",
        });
      } finally {
        setIsIndexing(false);
      }
    };

    startIndexing();
  }, [navigate, toast]);

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header 
          title="Indexing Error"
          showViewControls={false}
          showRefreshButton={false}
        />
        <div className="container mx-auto p-4 mt-16">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to index music library: {error.message}
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate("/setup")} className="mt-4">
            Back to Setup
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        title="Indexing Music Library"
        showViewControls={false}
        showRefreshButton={false}
      />
      <div className="container mx-auto p-4 mt-16">
        <Card className="p-6 max-w-2xl mx-auto">
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <InfoIcon className="h-5 w-5 text-blue-500" />
              <h2 className="text-2xl font-bold">Indexing in Progress</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-center">
                {isIndexing && <Loader2 className="h-8 w-8 animate-spin" />}
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">
                  Please wait while we index your music library...
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}