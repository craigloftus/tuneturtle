import { Track, Album } from "@/lib/services/TrackService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Check, Download, Loader2, Trash2, Music2 } from "lucide-react";
import { useState, useMemo } from "react";
import { formatTrackName } from "@/utils/formatters";

interface TrackListProps {
  tracks: Track[];
  onSelect: (track: Track) => void;
  currentTrack: Track | null;
  selectedAlbum: Album | null;
  onDownloadTrack: (track: Track) => Promise<void>;
  onDeleteTrack: (track: Track) => Promise<void>;
  downloadingTrackKeys?: string[];
}

export function TrackList({ 
  tracks, 
  onSelect, 
  currentTrack, 
  selectedAlbum, 
  onDownloadTrack, 
  onDeleteTrack,
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

  // Filter tracks by selected album if needed
  const filteredTracks = useMemo(() => {
    const albumFiltered = selectedAlbum
      ? tracks.filter(track => (track.album || '').trim().toLowerCase() === (selectedAlbum.name || '').trim().toLowerCase())
      : tracks;
    return albumFiltered;
  }, [tracks, selectedAlbum]);

  // Group tracks by album
  const tracksByAlbum = useMemo(() => {
    return filteredTracks.reduce((acc, track) => {
      // Use selectedAlbum name if present, otherwise track's album or 'Unknown'
      const albumName = selectedAlbum ? selectedAlbum.name : (track.album || 'Unknown');
      if (!acc[albumName]) {
        acc[albumName] = { tracks: [], artPath: null }; // Initialize group with artPath
      }
      acc[albumName].tracks.push(track);
      // Find the first available art path for the album
      if (!acc[albumName].artPath && track.albumArtPath) {
        acc[albumName].artPath = track.albumArtPath;
      }
      return acc;
    }, {} as Record<string, { tracks: Track[]; artPath: string | null | undefined }>);
  }, [filteredTracks, selectedAlbum]);

  return (
    <ScrollArea className="h-[calc(100vh-16rem)] w-full rounded-md">
      <div className="p-4 space-y-6">
        {Object.entries(tracksByAlbum).map(([albumName, { tracks: groupTracks, artPath }]) => (
          <div key={albumName} className="space-y-3"> {/* Increased spacing */} 
            {/* Album Header: Art and Name (only if not a single selected album view) */}
            {!selectedAlbum && (
              <div className="flex items-center space-x-3 mb-3"> {/* Added margin-bottom */} 
                <div className="flex-shrink-0 w-12 h-12 bg-muted rounded flex items-center justify-center overflow-hidden">
                  {artPath ? (
                    <img src={artPath} alt={`${albumName} album art`} className="w-full h-full object-cover" />
                  ) : (
                    <Music2 className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <h3 className="text-lg font-semibold truncate">{albumName}</h3>
              </div>
            )}
            
            {/* Track items */} 
            <div className="space-y-2"> {/* Container for tracks */} 
              {groupTracks.map((track) => (
                <div className="flex justify-between items-center" key={track.key}>
                  {/* Track Button (full width again) */}
                  <Button
                    variant={currentTrack?.key === track.key ? "secondary" : "ghost"}
                    className="flex-grow justify-start text-left mr-2 min-w-0" // Added min-w-0
                    onClick={() => onSelect(track)}
                    title={formatTrackName(track)}
                  >
                    {/* <PlayCircle className="mr-2 h-4 w-4" /> // Keep icon removed for cleaner look? */}
                    <span className="truncate">{formatTrackName(track)}</span>
                  </Button>
                  
                  {/* Action Buttons (kept compact) */}
                  <div className="flex-shrink-0 flex items-center space-x-1">
                    {track.localPath ? (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(track)}
                        onMouseEnter={() => setHoveredTrackKey(track.key)}
                        onMouseLeave={() => setHoveredTrackKey(null)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                        title="Delete local file"
                      >
                        {hoveredTrackKey === track.key ? <Trash2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </Button>
                    ) : downloadingTrackKeys.includes(track.key) ? (
                      <Button variant="outline" size="icon" disabled title="Downloading...">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </Button>
                    ) : (
                      <Button variant="outline" size="icon" onClick={() => handleDownload(track)} title="Download track">
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
