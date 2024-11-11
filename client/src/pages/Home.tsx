import { useState, useEffect, useMemo } from "react";
import { Track, Album, ViewMode } from "@/types/aws";
import { TrackList } from "@/components/TrackList";
import { AlbumGrid } from "@/components/AlbumGrid";
import { AudioPlayer } from "@/components/AudioPlayer";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Grid, List, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";

export function Home() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);

  useEffect(() => {
    
  };

  // Process tracks into albums
  const albums = useMemo(() => {
    const albumMap = new Map<string, Track[]>();
    
    tracks.forEach(track => {
      const albumName = track.album || 'Unknown Album';
      
      if (!albumMap.has(albumName)) {
        albumMap.set(albumName, []);
      }
      albumMap.get(albumName)!.push(track);
    });
    
    return Array.from(albumMap.entries()).map(([name, albumTracks]) => ({
      name,
      tracks: albumTracks,
      coverUrl: undefined
    }));
  }, [tracks]);

  // Find current album based on current track
  const currentAlbum = useMemo(() => {
    if (!currentTrack) return null;
    return albums.find(album => 
      album.name.toLowerCase() === (currentTrack.album || '').toLowerCase()
    ) || null;
  }, [currentTrack, albums]);

  // Set up loading timeout
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setIsTimeout(true);
        console.warn("[Home] Loading timeout reached");
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  if (error?.message.includes('No AWS credentials')) {
    return null; // Navigation will happen in error handler
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isTimeout ? "Still loading... This is taking longer than usual." : "Loading tracks..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load tracks: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!tracks.length) {
    return (
      <div className="container mx-auto p-4">
        <Alert>
          <AlertDescription>
            No music tracks found in your S3 bucket. Upload some audio files to get started.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleAlbumSelect = (album: Album) => {
    console.debug('[Album Selected]', {
      albumName: album.name,
      trackCount: album.tracks.length
    });
    
    setSelectedAlbum(album);
    setViewMode('list');
    if (album.tracks.length > 0) {
      setCurrentTrack(album.tracks[0]);
    }
  };

  const handleBackToGrid = () => {
    setViewMode('grid');
    setSelectedAlbum(null);
  };

  const currentIndex = currentTrack 
    ? tracks.findIndex(t => t.key === currentTrack.key)
    : -1;

  const handleNext = () => {
    if (currentIndex < tracks.length - 1) {
      setCurrentTrack(tracks[currentIndex + 1]);
    } else if (hasMore) {
      // Load more tracks if we're at the end and there are more available
      loadMoreTracks();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentTrack(tracks[currentIndex - 1]);
    }
  };

  return (
    <div className="container mx-auto p-4 pb-32">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          {viewMode === 'list' && selectedAlbum && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToGrid}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-3xl font-bold">
            {viewMode === 'list' && selectedAlbum 
              ? selectedAlbum.name
              : 'Music Player'
            }
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {viewMode === 'grid' ? (
            <AlbumGrid
              albums={albums}
              onTrackSelect={handleAlbumSelect}
              currentAlbum={currentAlbum}
            />
          ) : (
            <TrackList
              tracks={selectedAlbum ? selectedAlbum.tracks : tracks}
              onSelect={setCurrentTrack}
              currentTrack={currentTrack}
              selectedAlbum={selectedAlbum}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {hasMore && !selectedAlbum && viewMode === 'list' && (
        <div className="flex justify-center mt-4">
          <Button
            onClick={loadMoreTracks}
            disabled={isLoadingMore}
            variant="outline"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading more...
              </>
            ) : (
              'Load More Tracks'
            )}
          </Button>
        </div>
      )}
      
      <AudioPlayer
        track={currentTrack}
        onNext={currentIndex < tracks.length - 1 || hasMore ? handleNext : undefined}
        onPrevious={currentIndex > 0 ? handlePrevious : undefined}
      />
    </div>
  );
}
