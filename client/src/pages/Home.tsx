import { useState, useEffect } from "react";
import { Track, Album, ViewMode } from "@/types/aws";
import { TrackList } from "@/components/TrackList";
import { AlbumGrid } from "@/components/AlbumGrid";
import { AudioPlayer } from "@/components/AudioPlayer";
import { useLocation } from "wouter";
import { Grid, List, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { S3Service } from "@/lib/services/S3Service";
import { useToast } from "@/hooks/use-toast";

export function Home() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTracks = async () => {
      try {
        const s3Service = S3Service.getInstance();
        const result = await s3Service.listObjects({ useCache: true });
        setTracks(result.tracks);
      } catch (err) {
        setError("Failed to load music library. Please check your settings.");
        toast({
          title: "Error",
          description: (err as Error).message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTracks();
  }, [toast]);

  // Process tracks into albums
  const albums = tracks.reduce((acc, track) => {
    const albumName = track.album || 'Unknown Album';
    const existing = acc.find(a => a.name === albumName);
    
    if (existing) {
      existing.tracks.push(track);
    } else {
      acc.push({ name: albumName, tracks: [track], coverUrl: undefined });
    }
    
    return acc;
  }, [] as Album[]);

  // Find current album based on current track
  const currentAlbum = currentTrack 
    ? albums.find(album => album.tracks.some(t => t.key === currentTrack.key))
    : null;

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate("/setup")} className="mt-4">
          Go to Settings
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-muted-foreground">Loading your music library...</p>
      </div>
    );
  }

  if (!tracks.length) {
    return (
      <div className="container mx-auto p-4">
        <Alert>
          <AlertDescription>
            No music tracks found. Please complete the setup process first.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate("/setup")} className="mt-4">
          Go to Setup
        </Button>
      </div>
    );
  }

  const handleAlbumSelect = (album: Album) => {
    setSelectedAlbum(album);
    setViewMode('list');
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
          <h1 className="text-3xl font-bold">
            {viewMode === 'list' && selectedAlbum 
              ? selectedAlbum.name
              : 'Music Library'
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/setup")}
          >
            <Settings className="h-4 w-4" />
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
              onBackToGrid={handleBackToGrid}
            />
          )}
        </motion.div>
      </AnimatePresence>
      
      <AudioPlayer
        track={currentTrack}
        onNext={handleNext}
        onPrevious={handlePrevious}
      />
    </div>
  );
}
