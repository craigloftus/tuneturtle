import { useState, useEffect } from "react";
import { Track, Album, ViewMode } from "@/types/aws";
import { TrackList } from "@/components/TrackList";
import { AlbumGrid } from "@/components/AlbumGrid";
import { AudioPlayer } from "@/components/AudioPlayer";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CacheService } from "@/lib/services/CacheService";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";

export function Home() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const cached = localStorage.getItem("viewMode");
    return (cached as ViewMode) || "grid";
  });
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("viewMode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    const loadTracks = async () => {
      const cacheService = CacheService.getInstance();
      const cachedTracks = cacheService.getTracks();
      if (cachedTracks) {
        setTracks(cachedTracks);
        setIsLoading(false);
      } else {
        navigate("/indexing");
      }
    };

    loadTracks();
  }, [toast]);

  // Process tracks into albums with improved organization
  const albums = tracks.reduce((acc, track) => {
    const albumName = track.album || "Unknown Album";
    const existing = acc.find((a) => a.name === albumName);

    if (existing) {
      existing.tracks.push(track);
    } else {
      acc.push({ name: albumName, tracks: [track], coverUrl: undefined });
    }

    return acc;
  }, [] as Album[]);

  const currentAlbum = currentTrack
    ? albums.find((album) =>
        album.tracks.some((t) => t.key === currentTrack.key),
      )
    : null;

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header showViewControls={false} />
        <div className="container mx-auto p-6 mt-20">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => navigate("/setup")} className="mt-4">
            Go to Settings
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header showViewControls={false} />
        <div className="container mx-auto p-6 mt-20 text-center">
          <p className="text-muted-foreground">Loading your music library...</p>
        </div>
      </div>
    );
  }

  if (!tracks.length) {
    return (
      <div className="container mx-auto p-6 mt-20">
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
    setViewMode("list");
  };

  const handleBackToGrid = () => {
    setViewMode("grid");
    setSelectedAlbum(null);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === "grid") {
      setSelectedAlbum(null);
    }
  };

  const currentIndex = currentTrack
    ? tracks.findIndex((t) => t.key === currentTrack.key)
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
    <div className="flex flex-col min-h-screen">
      <Header 
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />
      
      {selectedAlbum && (
        <div className="mt-20 px-6 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToGrid}
            className="shrink-0 hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold truncate">{selectedAlbum.name}</h2>
        </div>
      )}
      
      <div className="container mx-auto px-6 pb-32 mt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {viewMode === "grid" ? (
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

        <AudioPlayer
          track={currentTrack}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      </div>
    </div>
  );
}
