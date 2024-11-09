import { useState, useEffect, useCallback } from 'react';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, SkipForward, SkipBack, Volume2, AlertCircle, RefreshCw } from "lucide-react";
import { audioController, AudioError } from '@/lib/audio';
import { Track } from '@/types/aws';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface AudioPlayerProps {
  track: Track | null;
  onNext?: () => void;
  onPrevious?: () => void;
}

export function AudioPlayer({ track, onNext, onPrevious }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();

  const loadTrack = useCallback(async (retryAttempt: number = 0) => {
    if (!track) return;

    try {
      setError(null);
      setIsRetrying(false);
      await audioController.load(track.url);
      setDuration(audioController.getDuration());
      if (isPlaying) {
        await audioController.play();
      }
    } catch (err) {
      const audioError = err as AudioError;
      let errorMessage = `Failed to load track: ${audioError.message}`;
      
      // Handle CORS errors specifically
      if (audioError.code === 'CORS_ERROR') {
        errorMessage = 'Unable to access audio file due to cross-origin restrictions. Please try again or contact support.';
      }
      
      console.error(errorMessage, audioError);
      setError(errorMessage);
      setIsPlaying(false);
      
      toast({
        variant: "destructive",
        title: "Error Loading Track",
        description: errorMessage,
      });
    }
  }, [track, isPlaying, toast]);

  useEffect(() => {
    loadTrack();
  }, [track, loadTrack]);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        setCurrentTime(audioController.getCurrentTime());
      } catch (err) {
        console.error('Error updating current time:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    await loadTrack();
  };

  const togglePlayPause = async () => {
    try {
      setError(null);
      if (isPlaying) {
        audioController.pause();
      } else {
        await audioController.play();
      }
      setIsPlaying(!isPlaying);
    } catch (err) {
      const audioError = err as AudioError;
      let errorMessage = `Playback error: ${audioError.message}`;
      
      if (audioError.code === 'CORS_ERROR') {
        errorMessage = 'Unable to play audio due to cross-origin restrictions. Please try again.';
      }
      
      console.error(errorMessage, audioError);
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
    try {
      audioController.seek(value[0]);
      setCurrentTime(value[0]);
    } catch (err) {
      const audioError = err as AudioError;
      console.error('Seek error:', audioError);
      toast({
        variant: "destructive",
        title: "Seek Error",
        description: audioError.message,
      });
    }
  };

  const handleVolumeChange = (value: number[]) => {
    try {
      const newVolume = value[0];
      audioController.setVolume(newVolume);
      setVolume(newVolume);
    } catch (err) {
      const audioError = err as AudioError;
      console.error('Volume control error:', audioError);
      toast({
        variant: "destructive",
        title: "Volume Control Error",
        description: audioError.message,
      });
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!track) return null;

  return (
    <Card className="p-4 fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t">
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
              <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Retry'}
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
          </div>
        </div>
      </div>
    </Card>
  );
}
