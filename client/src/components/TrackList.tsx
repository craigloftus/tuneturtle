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
  // Group tracks by album
  const tracksByAlbum = tracks.reduce((acc, track) => {
    if (!acc[track.album]) {
      acc[track.album] = [];
    }
    acc[track.album].push(track);
    return acc;
  }, {} as Record<string, Track[]>);

  return (
    <ScrollArea className="h-[calc(100vh-16rem)] w-full rounded-md border">
      <div className="p-4 space-y-6">
        {Object.entries(tracksByAlbum).map(([album, albumTracks]) => (
          <div key={album} className="space-y-2">
            <h3 className="font-semibold text-lg px-4">{album}</h3>
            {albumTracks.map((track) => (
              <Button
                key={track.key}
                variant={currentTrack?.key === track.key ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => onSelect(track)}
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                <span className="truncate">{track.fileName}</span>
              </Button>
            ))}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
