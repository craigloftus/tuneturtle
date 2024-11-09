import { Track, Album } from "@/types/aws";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { PlayCircle } from "lucide-react";

interface TrackListProps {
  tracks: Track[];
  onSelect: (track: Track) => void;
  currentTrack: Track | null;
  selectedAlbum: Album | null;
}

export function TrackList({ tracks, onSelect, currentTrack, selectedAlbum }: TrackListProps) {
  // Filter tracks by selected album if one is selected
  const filteredTracks = selectedAlbum
    ? tracks.filter(track => track.album === selectedAlbum.name)
    : tracks;

  // Debug log for filtered tracks
  console.debug('[TrackList] Filtered Tracks:', {
    albumName: selectedAlbum?.name,
    trackCount: filteredTracks.length,
    sampleTrack: filteredTracks[0]
  });

  // Group tracks by album if no specific album is selected
  const tracksByAlbum = filteredTracks.reduce((acc, track) => {
    if (!selectedAlbum) {
      if (!acc[track.album]) {
        acc[track.album] = [];
      }
      acc[track.album].push(track);
    } else {
      // If an album is selected, use a single group
      if (!acc['tracks']) {
        acc['tracks'] = [];
      }
      acc['tracks'].push(track);
    }
    return acc;
  }, {} as Record<string, Track[]>);

  // Helper function to get display name for track
  const getTrackDisplayName = (track: Track) => {
    if (!track.fileName) {
      // Fallback if fileName is not set
      const parts = track.key.split('/');
      return parts[parts.length - 1].replace(/\.[^/.]+$/, '');
    }
    return track.fileName;
  };

  return (
    <ScrollArea className="h-[calc(100vh-16rem)] w-full rounded-md border">
      <div className="p-4 space-y-6">
        {Object.entries(tracksByAlbum).map(([groupName, groupTracks]) => (
          <div key={groupName} className="space-y-2">
            {!selectedAlbum && (
              <h3 className="font-semibold text-lg px-4">{groupName}</h3>
            )}
            {groupTracks.map((track) => (
              <Button
                key={track.key}
                variant={currentTrack?.key === track.key ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => onSelect(track)}
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                <span className="truncate">{getTrackDisplayName(track)}</span>
              </Button>
            ))}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
