import { useState, useEffect } from 'react';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, SkipForward, SkipBack, Volume2 } from "lucide-react";
import { audioController } from '@/lib/audio';
import { Track } from '@/types/aws';

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

  useEffect(() => {
    if (track) {
      audioController.load(track.url).then(() => {
        setDuration(audioController.getDuration());
      });
    }
  }, [track]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(audioController.getCurrentTime());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const togglePlayPause = () => {
    if (isPlaying) {
      audioController.pause();
    } else {
      audioController.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    audioController.seek(value[0]);
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    audioController.setVolume(newVolume);
    setVolume(newVolume);
  };

  if (!track) return null;

  return (
    <Card className="p-4 fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{track.key}</p>
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
            max={duration}
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
