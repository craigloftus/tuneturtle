import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { S3Service } from "@/lib/services/S3Service";
import { Progress } from "@/components/ui/progress";
import { Track } from "@/types/aws";
import { _Object, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MetadataService } from "@/lib/services/MetadataService";

// Supported audio formats and their MIME types
const SUPPORTED_FORMATS = {
  mp3: 'audio/mpeg',
  flac: 'audio/flac',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  aac: 'audio/aac'
} as const;

export function Indexing() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isIndexing, setIsIndexing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const metadataService = MetadataService.getInstance();

  const isAudioFile = (fileName: string): boolean => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    return extension in SUPPORTED_FORMATS;
  };

  const getMimeType = (extension: string): string => {
    return SUPPORTED_FORMATS[extension as keyof typeof SUPPORTED_FORMATS] || 'audio/mpeg';
  };

  const createTrackFromS3Object = async (
    obj: _Object,
    bucket: string,
    client: S3Client
  ): Promise<Track> => {
    const key = obj.Key!;
    const pathParts = key.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const album = pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'Unknown Album';
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeType = getMimeType(fileExtension);

    const fullTrackCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentType: mimeType,
    });
    
    const url = await getSignedUrl(client, fullTrackCommand, {
      expiresIn: 3600
    });

    return {
      key,
      size: obj.Size || 0,
      lastModified: obj.LastModified || new Date(),
      url,
      album,
      fileName
    };
  };

  useEffect(() => {
    const startIndexing = async () => {
      setIsIndexing(true);
      try {
        const s3Service = S3Service.getInstance();
        const { s3Client, bucket } = await s3Service.getClientAndBucket();
        const result = await s3Service.listObjects({ 
          limit: 100,
          isAudioFile,
          createTrackFromS3Object: (obj) => createTrackFromS3Object(obj, bucket, s3Client)
        });
        
        if (result.tracks.length === 0) {
          throw new Error("No music files found in the S3 bucket");
        }

        // Simulate progress for better UX
        const interval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 90) {
              clearInterval(interval);
              return 90;
            }
            return prev + 10;
          });
        }, 500);

        // Final progress update
        setProgress(100);
        toast({
          title: "Success",
          description: `Found ${result.tracks.length} tracks in your music library`,
        });
        
        // Small delay before navigation for better UX
        setTimeout(() => navigate("/"), 1000);
      } catch (err) {
        setError(err as Error);
        toast({
          title: "Error",
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
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to index music library: {error.message}
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate("/setup")} className="mt-4">
          Back to Setup
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="p-6 max-w-2xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <InfoIcon className="h-5 w-5 text-blue-500" />
            <h2 className="text-2xl font-bold">Indexing Music Library</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              {isIndexing && <Loader2 className="h-8 w-8 animate-spin" />}
            </div>
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                {progress}% Complete
              </p>
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
  );
}
