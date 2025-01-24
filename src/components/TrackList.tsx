import { Track, Album } from "@/lib/services/TrackService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Check, Cloud, CloudDownload, Download, PlayCircle } from "lucide-react";

interface TrackListProps {
  tracks: Track[];
  onSelect: (track: Track) => void;
  currentTrack: Track | null;
  selectedAlbum: Album | null;
  onDownloadTrack: (track: Track) => Promise<void>;
}

export function TrackList({ tracks, onSelect, currentTrack, selectedAlbum, onDownloadTrack }: TrackListProps) {
  // Debug log input tracks
  console.debug('[TrackList] Initial data:', {
    totalTracks: tracks.length,
    selectedAlbumName: selectedAlbum?.name,
    sampleTracks: tracks.slice(0, 3).map(t => ({
      key: t.key,
      album: t.album,
      fileName: t.fileName
    }))
  });

  // Filter tracks by selected album if one is selected
  const filteredTracks = selectedAlbum
    ? tracks.filter(track => {
        const trackAlbum = track.album || '';
        const selectedAlbumName = selectedAlbum.name || '';
        
        // Normalize both strings for comparison
        const normalizedTrackAlbum = trackAlbum.trim().toLowerCase();
        const normalizedSelectedAlbum = selectedAlbumName.trim().toLowerCase();
        
        const matches = normalizedTrackAlbum === normalizedSelectedAlbum;
        
        console.debug('[TrackList] Track match:', {
          key: track.key,
          trackAlbum: normalizedTrackAlbum,
          selectedAlbum: normalizedSelectedAlbum,
          matches
        });
        
        return matches;
      })
    : tracks;

  // Debug log filtered tracks
  console.debug('[TrackList] After filtering:', {
    filteredCount: filteredTracks.length,
    selectedAlbum: selectedAlbum?.name || 'All',
    sampleTracks: filteredTracks.slice(0, 3).map(t => ({
      key: t.key,
      album: t.album,
      fileName: t.fileName
    }))
  });

  // Group tracks by album if no specific album is selected
  const tracksByAlbum = filteredTracks.reduce((acc, track) => {
    const albumName = selectedAlbum ? 'tracks' : (track.album || 'Unknown');
    if (!acc[albumName]) {
      acc[albumName] = [];
    }
    acc[albumName].push(track);
    return acc;
  }, {} as Record<string, Track[]>);

  // Debug log final grouping
  console.debug('[TrackList] Final grouping:', 
    Object.entries(tracksByAlbum).map(([album, tracks]) => ({
      album,
      trackCount: tracks.length,
      sampleTrack: tracks[0]?.fileName
    }))
  );

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
            {groupTracks.map((track) => (
              <div className="flex justify-between items-center" key={track.key}>
              <Button
                key={track.key}
                variant={currentTrack?.key === track.key ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => onSelect(track)}
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                <span className="truncate">{getTrackDisplayName(track)}</span>
              </Button>
              {track.localPath && (
                <Check className="mr-2 h-4 w-4" /> 
              )}
              {!track.localPath && ( 
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onDownloadTrack(track)}>
                  <CloudDownload className="h-4 w-4" />
                </Button>
              )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
