import { Track, Album } from "@/lib/services/TrackService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Check, Download, PlayCircle, Loader2, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { formatTrackName } from "@/utils/formatters";

interface TrackListProps {
  tracks: Track[];
  onSelect: (track: Track) => void;
  currentTrack: Track | null;
  selectedAlbum: Album | null;
  onDownloadTrack: (track: Track) => Promise<void>;
  onDeleteTrack: (track: Track) => Promise<void>;
  showLocalOnly?: boolean;
  downloadingTrackKeys?: string[];
}

export function TrackList({ 
  tracks, 
  onSelect, 
  currentTrack, 
  selectedAlbum, 
  onDownloadTrack, 
  onDeleteTrack,
  showLocalOnly = false,
  downloadingTrackKeys = []
}: TrackListProps) {
  const [hoveredTrackKey, setHoveredTrackKey] = useState<string | null>(null);

  const handleDownload = async (track: Track) => {
    try {
      await onDownloadTrack(track);
    } catch (error) {
      console.error('Download failed for track:', track, error);
    }
  };

  const handleDelete = async (track: Track) => {
    try {
      await onDeleteTrack(track);
    } catch (error) {
      console.error('Delete failed for track:', track, error);
    }
  };

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

  // Filter tracks ONLY by selected album if needed
  const filteredTracks = useMemo(() => {
    // First filter by album if one is selected
    const albumFiltered = selectedAlbum
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
    
    // REMOVED local availability filter here
    return albumFiltered;
  }, [tracks, selectedAlbum]);

  // Group tracks by album if no specific album is selected
  const tracksByAlbum = filteredTracks.reduce((acc, track) => {
    const albumName = selectedAlbum ? 'tracks' : (track.album || 'Unknown');
    if (!acc[albumName]) {
      acc[albumName] = [];
    }
    acc[albumName].push(track);
    return acc;
  }, {} as Record<string, Track[]>);

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
                className="w-full justify-start mr-2"
                onClick={() => onSelect(track)}
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                <span className="truncate">{formatTrackName(track)}</span>
              </Button>
              {track.localPath ? (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDelete(track)}
                  onMouseEnter={() => setHoveredTrackKey(track.key)}
                  onMouseLeave={() => setHoveredTrackKey(null)}
                  className="hover:bg-destructive/10 hover:text-destructive"
                >
                  {hoveredTrackKey === track.key ? (
                    <Trash2 className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              ) : downloadingTrackKeys.includes(track.key) ? (
                <Button
                  variant="outline"
                  size="icon"
                  disabled
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDownload(track)}
                >
                  <Download className="h-4 w-4" />
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
