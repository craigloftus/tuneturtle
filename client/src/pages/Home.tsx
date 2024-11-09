import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
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
  const [isTimeout, setIsTimeout] = useState(false);

  const { data: tracks, error, isLoading } = useSWR<Track[]>("/api/aws/list", {
    onError: (err) => {
      console.error("[Home] Track loading error:", err);
      if (err.status === 401 || err.info?.error === "No credentials") {
        navigate("/setup");
      } else {
        toast({
          variant: "destructive",
          title: "Error loading tracks",
          description: err.info?.message || "Failed to load tracks. Please try again.",
        });
      }
    },
    revalidateOnFocus: false,
  });

  // Process tracks into albums
  const albums = useMemo(() => {
    if (!tracks) return [];
    
    const albumMap = new Map<string, Track[]>();
    
    tracks.forEach(track => {
      const parts = track.key.split('/');
      // Extract album name and filename
      const album = parts.length > 1 ? parts[0] : 'Unknown Album';
      const fileName = parts[parts.length - 1].replace(/\.[^/.]+$/, ''); // Remove file extension
      
      // Debug log for track processing
      console.debug('[Track Processing]', {
        key: track.key,
        album,
        fileName,
        parts
      });
      
      const processedTrack = {
        ...track,
        album,
        fileName
      };
      
      if (!albumMap.has(album)) {
        albumMap.set(album, []);
      }
      albumMap.get(album)!.push(processedTrack);
    });
    
    // Debug log for album structure
    console.debug('[Albums Structure]', 
      Array.from(albumMap.entries()).map(([name, tracks]) => ({
        name,
        trackCount: tracks.length,
        sampleTrack: tracks[0]?.fileName
      }))
    );
    
    return Array.from(albumMap.entries()).map(([name, tracks]) => ({
      name,
      tracks,
      coverUrl: undefined // TODO: Add cover art support
    }));
  }, [tracks]);

  const currentAlbum = useMemo(() => {
    if (!currentTrack || !albums) return null;
    return albums.find(album => album.name === currentTrack.album) || null;
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

  if (error?.status === 401 || error?.info?.error === "No credentials") {
    return null; // Navigation will happen in onError
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
            Failed to load tracks: {error.info?.message || "Unknown error occurred"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!tracks?.length) {
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

  const currentIndex = currentTrack 
    ? tracks.findIndex(t => t.key === currentTrack.key)
    : -1;

  const handleNext = () => {
    if (currentIndex < tracks.length - 1) {
      setCurrentTrack(tracks[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentTrack(tracks[currentIndex - 1]);
    }
  };

  const handleAlbumSelect = (album: Album) => {
    console.debug('[Album Selected]', {
      name: album.name,
      trackCount: album.tracks.length,
      firstTrack: album.tracks[0]
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
              tracks={tracks}
              onSelect={setCurrentTrack}
              currentTrack={currentTrack}
              selectedAlbum={selectedAlbum}
            />
          )}
        </motion.div>
      </AnimatePresence>
      
      <AudioPlayer
        track={currentTrack}
        onNext={currentIndex < tracks.length - 1 ? handleNext : undefined}
        onPrevious={currentIndex > 0 ? handlePrevious : undefined}
      />
    </div>
  );
}
