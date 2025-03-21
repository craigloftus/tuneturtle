import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { S3Service } from "@/lib/services/S3Service";
import { Track, TrackService } from "@/lib/services/TrackService";
import { _Object, S3Client } from "@aws-sdk/client-s3";
import { Header } from "@/components/Header";


export function Indexing() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isIndexing, setIsIndexing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

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

    return {
      key,
      size: obj.Size || 0,
      lastModified: obj.LastModified || new Date(),
      album,
      fileName,
    };
  };

  useEffect(() => {
    let indexing = true;
    const listingInterval = setInterval(() => {
      setProgress(prev => (prev < 49 ? prev + 2 : prev));
    }, 250);

    const startIndexing = async () => {
      // Check if S3 credentials are stored
      const storedCredentials = S3Service.getInstance().getCredentials();
      if (!storedCredentials) {
        navigate("/setup");
      }

      setIsIndexing(indexing);
      try {
        const s3Service = S3Service.getInstance();
        const trackService = TrackService.getInstance();

        const { s3Client, bucket } = await s3Service.getClientAndBucket();
        const tracks = [];

        // Call listObjects continually until nextContinuationToken is null
        let isTruncated = true;
        let nextContinuationToken = undefined;
        let maxKeys = 100;

        while (isTruncated) {
          const { objects, nextContinuationToken: nextToken, isTruncated: truncated } = await s3Service.listObjects({
            continuationToken: nextContinuationToken,
            limit: maxKeys,
          });

          for (const obj of objects) {
            if(trackService.isAudioFile(obj.Key!)) {
              const track = await createTrackFromS3Object(obj, bucket, s3Client);
              tracks.push(track);
            }
          }

          nextContinuationToken = nextToken;
          isTruncated = truncated;

          // sleep before fetching next batch of objects
          await new Promise((resolve) => setTimeout(resolve, 250));
        }

        // End of S3 listing phase: clear interval and set progress to 50%
        clearInterval(listingInterval);
        setProgress(50);

        // This feels like a hack, rather than the correct solution
        if(!indexing) return;

        // Save tracks to cache
        trackService.saveTracks(Object.fromEntries(tracks.map((t) => [t.key, t])));

        // Process tracks concurrently in batches to speed up metadata population without overloading the device
        const concurrencyLimit = 5;
        let i = 0;
        while (i < tracks.length) {
          const chunk = tracks.slice(i, i + concurrencyLimit);
          await Promise.all(chunk.map(track => trackService.populateTrackMetadata(track)));
          i += chunk.length;
          setProgress(50 + Math.round((i / tracks.length) * 50));
          await new Promise((resolve) => setTimeout(resolve, 5));  // slight delay for UI update
        }
        setProgress(100);

        // Final progress update
        toast({
          title: "Success",
          description: `Found ${tracks.length} tracks in your music library`,
        });

        // Small delay before navigation for better UX
        setTimeout(() => navigate("/"), 1000);
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

    const indexingPromise = startIndexing();

    return () => {
      indexing = false;
      clearInterval(listingInterval);
    };
  }, [navigate, toast]);

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header showViewControls={false} showRefreshButton={false} />
        <div className="container mx-auto p-6 mt-20">
          <h2 className="text-2xl font-bold mb-4">Indexing Error</h2>
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
      <Header showViewControls={false} showRefreshButton={false} />
      <div className="container mx-auto p-6 mt-3">
        <Card className="p-6 max-w-2xl mx-auto">
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <InfoIcon className="h-5 w-5 text-blue-500" />
              <h3 className="text-xl font-semibold">Indexing in Progress</h3>
            </div>
            <div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-sm text-center mt-1">{progress}%</p>
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
