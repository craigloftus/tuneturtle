import { useState, useEffect, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  AlertCircle,
  RefreshCw,
  Download,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Track } from "@/types/aws";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { S3Service } from "@/lib/services/S3Service";
import { StorageService } from "@/lib/services/StorageService";

interface AudioPlayerProps {
  track: Track | null;
  onNext?: () => void;
  onPrevious?: () => void;
}

const s3Service = S3Service.getInstance();
const storageService = StorageService.getInstance();

export function AudioPlayer({ track, onNext, onPrevious }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOfflineAvailable, setIsOfflineAvailable] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;

    const checkOfflineAvailability = async () => {
      const isAvailable = await storageService.isTrackAvailableOffline(track.key);
      setIsOfflineAvailable(isAvailable);
    };

    checkOfflineAvailability();

    const handleError = async (e: ErrorEvent) => {
      let errorMessage = "Unable to access or play audio file.";

      // Handle format-specific errors
      if (e.message.includes("MEDIA_ERR_SRC_NOT_SUPPORTED")) {
        const format =
          track.fileName.split(".").pop()?.toUpperCase() || "Unknown";
        errorMessage = `This browser doesn't support ${format} format. Try converting to MP3.`;
      } else if (e.message.includes("MEDIA_ERR_DECODE")) {
        errorMessage = "Audio file is corrupted or in an unsupported format.";
      } else if (e.message.includes("MEDIA_ERR_NETWORK")) {
        if (await storageService.isTrackAvailableOffline(track.key)) {
          // Try loading from cache if available offline
          const cache = await caches.open('offline-albums');
          const response = await cache.match(track.key);
          if (response) {
            audio.src = URL.createObjectURL(await response.blob());
            return;
          }
        }
        errorMessage = "Network error while loading the audio file.";
      }

      setError(errorMessage);
      setIsPlaying(false);
      toast({
        variant: "destructive",
        title: "Error Loading Track",
        description: errorMessage,
      });
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setError(null); // Clear any previous errors
    };

    const handleEnded = () => {
      if (onNext) onNext();
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("error", handleError as EventListener);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    const loadTrack = async () => {
      audio.src = await s3Service.getSignedUrl(track.key);
      audio.load();
    };

    loadTrack();

    return () => {
      audio.removeEventListener("error", handleError as EventListener);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [track, onNext, toast]);

  const handleRetry = async () => {
    const audio = audioRef.current;
    if (!audio || !track) return;

    setIsRetrying(true);
    setError(null);
    audio.src = await s3Service.getSignedUrl(track.key);
    audio.load();
    setIsRetrying(false);
  };

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      setError(null);

      if (!audio.paused) {
        audio.pause();
      } else {
        await audio.play();
      }
    } catch (err) {
      const errorMessage = "Unable to play audio. Please try again.";
      console.error(errorMessage, err);
      setError(errorMessage);
      setIsPlaying(false);
      toast({
        variant: "destructive",
        title: "Playback Error",
        description: errorMessage,
      });
    }
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      audio.currentTime = value[0];
      setCurrentTime(value[0]);
    } catch (err) {
      console.error("Seek error:", err);
      toast({
        variant: "destructive",
        title: "Seek Error",
        description: "Failed to seek in the audio track.",
      });
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      const newVolume = value[0];
      audio.volume = newVolume;
      setVolume(newVolume);
    } catch (err) {
      console.error("Volume control error:", err);
      toast({
        variant: "destructive",
        title: "Volume Control Error",
        description: "Failed to change volume.",
      });
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!track) return null;

  return (
    <Card className="p-4 fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t">
      <audio ref={audioRef} preload="metadata" autoPlay />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={isRetrying}
              className="ml-2"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRetrying ? "animate-spin" : ""}`}
              />
              {isRetrying ? "Retrying..." : "Retry"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{track.key}</p>
            <p className="text-xs text-muted-foreground">
              {formatTime(currentTime)} / {formatTime(duration)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Volume2 className="h-4 w-4" />
            <Slider
              className="w-24"
              value={[volume]}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={handleSeek}
          />
          <div className="flex justify-center items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrevious}
              disabled={!onPrevious}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={togglePlayPause}
              disabled={!!error}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
              disabled={!onNext}
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            {track && (
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  if (isDownloading) return;
                  
                  try {
                    setIsDownloading(true);
                    const albumKey = track.key.split('/')[0];
                    // Get all tracks from the same album
                    const albumTracks = (await s3Service.listObjects({ limit: 100 }))
                      .objects
                      .filter(obj => obj.Key.startsWith(albumKey))
                      .map(obj => ({
                        key: obj.Key,
                        size: obj.Size,
                        lastModified: obj.LastModified,
                        album: albumKey,
                        fileName: obj.Key.split('/').pop() || ''
                      }));
                    
                    await storageService.downloadAlbum(albumKey, albumTracks);
                    setIsOfflineAvailable(true);
                    toast({
                      title: "Download Complete",
                      description: `Album "${albumKey}" is now available offline`,
                    });
                  } catch (error) {
                    toast({
                      variant: "destructive",
                      title: "Download Failed",
                      description: error instanceof Error ? error.message : "Failed to download track",
                    });
                  } finally {
                    setIsDownloading(false);
                  }
                }}
                disabled={isOfflineAvailable || isDownloading}
              >
                {isDownloading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : isOfflineAvailable ? (
                  <WifiOff className="h-4 w-4" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
