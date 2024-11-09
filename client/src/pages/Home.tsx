import { useState, useEffect } from "react";
import useSWR from "swr";
import { Track } from "@/types/aws";
import { TrackList } from "@/components/TrackList";
import { AudioPlayer } from "@/components/AudioPlayer";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export function Home() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isTimeout, setIsTimeout] = useState(false);

  const { data: tracks, error, isLoading } = useSWR<Track[]>("/api/aws/list", {
    onError: (err) => {
      console.error("[Home] Track loading error:", err);
      if (err.status === 401 || err.info?.error === "No credentials") {
        navigate("/setup");
      } else {
        toast({
          variant: "destructive",
          title: "Error loading tracks",
          description: err.info?.message || "Failed to load tracks. Please try again.",
        });
      }
    },
    revalidateOnFocus: false,
  });

  // Set up loading timeout
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setIsTimeout(true);
        console.warn("[Home] Loading timeout reached");
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  if (error?.status === 401 || error?.info?.error === "No credentials") {
    return null; // Navigation will happen in onError
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isTimeout ? "Still loading... This is taking longer than usual." : "Loading tracks..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load tracks: {error.info?.message || "Unknown error occurred"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!tracks?.length) {
    return (
      <div className="container mx-auto p-4">
        <Alert>
          <AlertDescription>
            No music tracks found in your S3 bucket. Upload some audio files to get started.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentIndex = currentTrack 
    ? tracks.findIndex(t => t.key === currentTrack.key)
    : -1;

  const handleNext = () => {
    if (currentIndex < tracks.length - 1) {
      setCurrentTrack(tracks[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentTrack(tracks[currentIndex - 1]);
    }
  };

  return (
    <div className="container mx-auto p-4 pb-32">
      <h1 className="text-3xl font-bold mb-8">Music Player</h1>
      
      <TrackList
        tracks={tracks}
        onSelect={setCurrentTrack}
        currentTrack={currentTrack}
      />
      
      <AudioPlayer
        track={currentTrack}
        onNext={currentIndex < tracks.length - 1 ? handleNext : undefined}
        onPrevious={currentIndex > 0 ? handlePrevious : undefined}
      />
    </div>
  );
}
