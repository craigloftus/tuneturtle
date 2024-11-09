import { Track } from "@/types/aws";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { PlayCircle } from "lucide-react";

interface TrackListProps {
  tracks: Track[];
  onSelect: (track: Track) => void;
  currentTrack: Track | null;
}

export function TrackList({ tracks, onSelect, currentTrack }: TrackListProps) {
  return (
    <ScrollArea className="h-[calc(100vh-16rem)] w-full rounded-md border">
      <div className="p-4 space-y-2">
        {tracks.map((track) => (
          <Button
            key={track.key}
            variant={currentTrack?.key === track.key ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onSelect(track)}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            <span className="truncate">{track.key}</span>
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
}
