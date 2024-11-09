import { useState, useEffect, useRef } from 'react';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, SkipForward, SkipBack, Volume2, AlertCircle, RefreshCw } from "lucide-react";
import { Track } from '@/types/aws';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface AudioPlayerProps {
  track: Track | null;
  onNext?: () => void;
  onPrevious?: () => void;
}

export function AudioPlayer({ track, onNext, onPrevious }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;

    const handleError = () => {
      const errorMessage = 'Unable to access or play audio file. Please try again.';
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
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (onNext) onNext();
    };

    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    audio.src = track.url;
    audio.load();

    return () => {
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [track, onNext, toast]);

  const handleRetry = () => {
    const audio = audioRef.current;
    if (!audio || !track) return;

    setIsRetrying(true);
    setError(null);
    audio.src = track.url;
    audio.load();
    setIsRetrying(false);
  };

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      setError(null);
      if (isPlaying) {
        audio.pause();
      } else {
        await audio.play();
      }
      setIsPlaying(!isPlaying);
    } catch (err) {
      const errorMessage = 'Unable to play audio. Please try again.';
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
      console.error('Seek error:', err);
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
      console.error('Volume control error:', err);
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
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!track) return null;

  return (
    <Card className="p-4 fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t">
      <audio ref={audioRef} preload="metadata" />
      
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