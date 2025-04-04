import { useState, useEffect, useMemo } from "react";
import { TrackList } from "@/components/TrackList";
import { AlbumGrid } from "@/components/AlbumGrid";
import { AudioPlayer } from "@/components/AudioPlayer";
import { useLocation } from "wouter";
import { ArrowLeft, Download, Loader2, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Track, Album, TrackService } from "@/lib/services/TrackService";
import { S3Service } from "@/lib/services/S3Service";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";


const s3Service = S3Service.getInstance();
const trackService = TrackService.getInstance();

type ViewMode = "grid" | "list";

export function Home() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const cached = localStorage.getItem("viewMode");
    return (cached as ViewMode) || "grid";
  });
  const [showLocalOnly, setShowLocalOnly] = useState<boolean>(false);

  const [albums, setAlbums] = useState<Album[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlbumIndex, setSelectedAlbumIndex] = useState<number | null>(null);
  const [downloadingTrackKeys, setDownloadingTrackKeys] = useState<string[]>([]);
  const [isDownloadingAlbum, setIsDownloadingAlbum] = useState(false);
  const [isDeletingAlbum, setIsDeletingAlbum] = useState(false);
  const [isHoveringAlbumAction, setIsHoveringAlbumAction] = useState(false);

  const currentIndex = currentTrack
    ? tracks.findIndex((t) => t.key === currentTrack.key)
    : -1;

  const selectedAlbum = selectedAlbumIndex !== null ? albums[selectedAlbumIndex] : null;

  // Filter albums based on local tracks availability
  const filteredAlbums = useMemo(() => {
    if (!showLocalOnly) return albums;
    
    // Only include albums that have at least one track with localPath
    return albums.filter(album => 
      album.tracks.some(track => track.localPath)
    );
  }, [albums, showLocalOnly]);

  useEffect(() => {
    localStorage.setItem("viewMode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    const loadTracks = async () => {
      const cachedTracks = trackService.getTracks();
      if (cachedTracks) {
        setTracks(Object.values(cachedTracks));
      }
    };

    loadTracks();
  }, [toast]);

  useEffect(() => {
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

    setAlbums(albums);
  }, [tracks]);

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

  const handleAlbumSelect = (album: Album) => {
    setSelectedAlbumIndex(albums.findIndex(a => a.name === album.name));
    setViewMode("list");
  };

  const handleBackToGrid = () => {
    setViewMode("grid");
    setSelectedAlbumIndex(null);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === "grid") {
      setSelectedAlbumIndex(null);
    }
  };

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

  const handleDownload = async (track: Track) => {
    let trackUUID = self.crypto.randomUUID();

    const url = await s3Service.getSignedUrl(track.key);
    const resp = await fetch(url);
    const blob = await resp.blob();
    const root = await navigator.storage.getDirectory();
    const fh = await root.getFileHandle(trackUUID, { create: true });
    const writer = await fh.createWritable();
    await writer.write(blob);
    await writer.close();
    
    trackService.updateTrack({
      ...track,
      downloaded: true,
      localPath: trackUUID,
    });
  }
  
  const downloadTrack = async (track: Track) => {
    setDownloadingTrackKeys((prev) => [...prev, track.key]);
    try {
      await handleDownload(track);
      const cachedTracks = trackService.getTracks();
      if (cachedTracks) {
        setTracks(Object.values(cachedTracks));
      }
    } catch (error) {
      console.error('Download failed for track:', track, error);
    } finally {
      setDownloadingTrackKeys((prev) => prev.filter(key => key !== track.key));
    }
  }
  
  const downloadAlbum = async (tracks: Track[]) => {
    setIsDownloadingAlbum(true);
    try {
      // Add all tracks to downloadingTrackKeys
      const trackKeys = tracks.map(track => track.key);
      setDownloadingTrackKeys(prev => [...prev, ...trackKeys]);
      
      for (const track of tracks) {
        if (!track.localPath) { // Only download if not already downloaded
          await handleDownload(track);
        }
      }
  
      const cachedTracks = trackService.getTracks();
      if (cachedTracks) {
        setTracks(Object.values(cachedTracks));
      }
    } catch (error) {
      console.error('Album download failed:', error);
    } finally {
      // Clear all album track keys from downloading state
      setDownloadingTrackKeys(prev => prev.filter(key => !tracks.some(track => track.key === key)));
      setIsDownloadingAlbum(false);
    }
  };

  // Helper function to handle the core deletion logic
  const performDelete = async (track: Track) => {
    if (!track.localPath) return; // Only delete if localPath exists

    try {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry(track.localPath);
      trackService.updateTrack({
        ...track,
        downloaded: false,
        localPath: undefined,
      });
    } catch (error) {
      console.error('Error removing file:', track.localPath, error);
      // Optionally: show a toast message to the user
      toast({
        title: "Deletion Error",
        description: `Could not delete track: ${track.metadata?.title || track.key}`,
        variant: "destructive",
      });
      // Re-throw the error if needed for upstream handling
      throw error; 
    }
  };

  const deleteTrack = async (track: Track) => {
    try {
      await performDelete(track);
      // Refresh tracks state from service after deletion
      const cachedTracks = trackService.getTracks();
      if (cachedTracks) {
        setTracks(Object.values(cachedTracks));
      }
      // Optional: Show success toast
      toast({
        title: "Track Deleted",
        description: `${track.metadata?.title || track.key} removed from local storage.`,
      });
    } catch (error) {
      // Error is already logged in performDelete, potentially shown via toast
      console.error('Delete failed for track:', track, error);
    }
  };

  const deleteAlbum = async (tracksToDelete: Track[]) => {
    setIsDeletingAlbum(true);
    let deletedCount = 0;
    try {
      for (const track of tracksToDelete) {
        if (track.localPath) { // Only attempt delete if it exists locally
          await performDelete(track);
          deletedCount++;
        }
      }

      // Refresh tracks state after all deletions
      const cachedTracks = trackService.getTracks();
      if (cachedTracks) {
        setTracks(Object.values(cachedTracks));
      }

      if (deletedCount > 0) {
        toast({
          title: "Album Files Deleted",
          description: `${deletedCount} track(s) removed from local storage for ${selectedAlbum?.name}.`,
        });
      } else {
         toast({
          title: "No Files Deleted",
          description: `No local files found to delete for ${selectedAlbum?.name}.`,
          variant: "default"
        });
      }

    } catch (error) {
      console.error('Album deletion failed:', error);
       toast({
          title: "Album Deletion Error",
          description: `An error occurred while deleting album files. Some files may remain.`,
          variant: "destructive",
        });
    } finally {
      setIsDeletingAlbum(false);
    }
  };

  // Determine album download/delete state
  const allTracksLocal = selectedAlbum ? selectedAlbum.tracks.every(track => !!track.localPath) : false;
  const noTracksLocal = selectedAlbum ? !selectedAlbum.tracks.some(track => !!track.localPath) : true;

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        viewMode={viewMode} 
        onViewModeChange={handleViewModeChange} 
        showLocalFilter={true}
        localFilterEnabled={showLocalOnly}
        onLocalFilterChange={setShowLocalOnly}
      />

      {selectedAlbum && (
        <div className="container mx-auto px-6 mt-4 mb-2 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToGrid}
            className="shrink-0 hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold truncate">
            {selectedAlbum.name}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (selectedAlbum) {
                allTracksLocal ? deleteAlbum(selectedAlbum.tracks) : downloadAlbum(selectedAlbum.tracks);
              }
            }}
            className={`ml-auto mr-4 ${allTracksLocal ? 'hover:bg-destructive/10 hover:text-destructive' : ''}`}
            disabled={isDownloadingAlbum || isDeletingAlbum || (allTracksLocal && noTracksLocal) }
            title={allTracksLocal ? "Delete all downloaded tracks in album" : "Download all tracks in album"}
            onMouseEnter={() => setIsHoveringAlbumAction(true)}
            onMouseLeave={() => setIsHoveringAlbumAction(false)}
          >
            {isDownloadingAlbum || isDeletingAlbum ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : allTracksLocal ? (
              isHoveringAlbumAction ? <Trash2 className="h-4 w-4" /> : <Check className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      <div className="container mx-auto px-6 pb-32 mt-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {viewMode === "grid" ? (
              <AlbumGrid albums={filteredAlbums} onTrackSelect={handleAlbumSelect} />
            ) : (
              <TrackList
                tracks={selectedAlbum ? selectedAlbum.tracks : tracks}
                onSelect={setCurrentTrack}
                currentTrack={currentTrack}
                selectedAlbum={selectedAlbum}
                onDownloadTrack={downloadTrack}
                onDeleteTrack={deleteTrack}
                downloadingTrackKeys={downloadingTrackKeys}
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
