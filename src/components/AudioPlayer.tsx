import { useState, useEffect, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, Volume2, SkipBack, SkipForward } from "lucide-react";
import { Track } from "@/lib/services/TrackService";
import { useToast } from "@/hooks/use-toast";
import { S3Service } from "@/lib/services/S3Service";
import { formatTime, formatTrackName } from "@/utils/formatters";

interface AudioPlayerProps {
  track: Track | null;
  onNext: () => void | null;
  onPrevious: () => void | null;
}

const s3Service = S3Service.getInstance();

export function AudioPlayer({ track, onNext, onPrevious }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playerState, setPlayerState] = useState({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    error: null as string | null
  });
  const { toast } = useToast();

  useEffect(() => {
    const audio = audioRef.current;
    let localURL: string | null = null;

    if (!audio || !track) return;

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
        errorMessage = "Network error while loading the audio file.";
      }

      setPlayerState(prev => ({ ...prev, error: errorMessage, isPlaying: false }));
      toast({
        variant: "destructive",
        title: "Error Loading Track",
        description: errorMessage,
      });
    };

    const handleTimeUpdate = () => {
      setPlayerState(prev => ({ ...prev, currentTime: audio.currentTime }));
    };

    const handleLoadedMetadata = () => {
      setPlayerState(prev => ({ ...prev, duration: audio.duration }));
      setPlayerState(prev => ({ ...prev, error: null })); // Clear any previous errors
    };

    const handleEnded = () => {
      if (onNext) onNext();
    };

    const handlePlay = () => {
      setPlayerState(prev => ({ ...prev, isPlaying: true }));
      updateMediaPosition();
    };

    const handlePause = () => {
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
    };

    audio.addEventListener("error", handleError);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    const loadTrack = async () => {
      if (localURL) {
        // Try to tidy up if we're already holding a track in memory
        URL.revokeObjectURL(localURL);
        localURL = null;
      }

      if (track.downloaded && track.localPath) {
        const root = await navigator.storage.getDirectory();
        const trackHandle = await root.getFileHandle(track.localPath);
        const trackFile = await trackHandle.getFile();
        localURL = URL.createObjectURL(trackFile);
        audio.src = localURL;
      } else {
        audio.src = await s3Service.getSignedUrl(track.key);
      }
      audio.load();
    };

    loadTrack();

    return () => {
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [track, onNext, toast]);

  const togglePlayPause = async (): Promise<void> => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      setPlayerState(prev => ({ ...prev, error: null }));

      if (!audio.paused) {
        audio.pause();
      } else {
        await audio.play();
      }
    } catch (err: unknown) {
      const errorMessage = "Unable to play audio. Please try again.";
      console.error(errorMessage, err);
      setPlayerState(prev => ({ ...prev, error: errorMessage, isPlaying: false }));
    }
  };

  const handleSeek = (value: number[]): void => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      audio.currentTime = value[0];
      setPlayerState(prev => ({ ...prev, currentTime: value[0] }));
      updateMediaPosition();
    } catch (err: unknown) {
      console.error("Seek error:", err);
    }
  };

  const handleVolumeChange = (value: number[]): void => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      const newVolume = value[0];
      audio.volume = newVolume;
      setPlayerState(prev => ({ ...prev, volume: newVolume }));
    } catch (err: unknown) {
      console.error("Volume control error:", err);
    }
  };

   const updateMediaPosition = () => {
    const audio = audioRef.current;
    if (!audio || !('mediaSession' in navigator)) return;
    navigator.mediaSession.setPositionState({
      duration: audio.duration,
      position: audio.currentTime,
    });
   };

  useEffect(() => {
    if ('mediaSession' in navigator && track) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: formatTrackName(track),
        album: track.album,
        artist: track.metadata?.artist,
        // Add more metadata if available
      });

      navigator.mediaSession.setActionHandler('play', togglePlayPause);
      navigator.mediaSession.setActionHandler('pause', togglePlayPause);
      navigator.mediaSession.setActionHandler('previoustrack', onPrevious);
      navigator.mediaSession.setActionHandler('nexttrack', onNext);
    }
  }, [track]);

  if (!track) return null;

  return (
    <Card className="p-4 fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t">
      <audio ref={audioRef} preload="metadata" autoPlay />

      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{track.album} / {formatTrackName(track)}</p>
            <p className="text-xs text-muted-foreground">
              {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Volume2 className="h-4 w-4" />
            <Slider
              className="w-24"
              value={[playerState.volume]}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Slider
            value={[playerState.currentTime]}
            max={playerState.duration || 100}
            step={1}
            onValueChange={handleSeek}
          />
          <div className="flex justify-center items-center space-x-4">
            <Button
              variant="outline"
              size="icon"
              onClick={onPrevious}
              disabled={!!playerState.error}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={togglePlayPause}
              disabled={!!playerState.error}
            >
              {playerState.isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onNext}
              disabled={!!playerState.error}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
