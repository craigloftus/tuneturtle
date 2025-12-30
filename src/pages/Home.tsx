import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { AlbumList } from "@/components/AlbumList";
import { useLocation } from "wouter";
import { ArrowLeft, Download, Loader2, Music2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Track, Album, TrackService, findAlbumArtUUID, findArtistName } from "@/lib/services/TrackService";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { StoredImage } from "@/components/StoredImage";
import { formatBytes } from "@/lib/utils";

const TrackList = lazy(() => import("@/components/TrackList").then((module) => ({ default: module.TrackList })));
const AudioPlayer = lazy(() => import("@/components/AudioPlayer").then((module) => ({ default: module.AudioPlayer })));

const trackService = TrackService.getInstance();

interface StorageEstimate {
  usage: number;
  quota: number;
}

export function Home() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(() => {
    return localStorage.getItem("selectedAlbumId");
  });
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [showLocalOnly, setShowLocalOnly] = useState<boolean>(() => {
    const cached = localStorage.getItem("showLocalOnly");
    return cached === 'true';
  });
  const [storageEstimate, setStorageEstimate] = useState<StorageEstimate | null>(null);

  const [albums, setAlbums] = useState<Album[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [error] = useState<string | null>(null);
  const [downloadingTrackKeys, setDownloadingTrackKeys] = useState<string[]>([]);

  const selectedAlbum = useMemo(() => 
    albums.find(album => album.name === selectedAlbumId) || null,
    [albums, selectedAlbumId]
  );

  const hasCredentials = useMemo(() => {
    return Boolean(localStorage.getItem("aws_credentials"));
  }, []);

  const selectedAlbumTracks = useMemo(() => 
    selectedAlbum ? selectedAlbum.tracks : [],
    [selectedAlbum]
  );

  const selectedAlbumArtUUID = useMemo(() => 
    selectedAlbum ? findAlbumArtUUID(selectedAlbum.tracks) : null,
    [selectedAlbum]
  );

  const filteredAlbums = useMemo(() => {
    if (!showLocalOnly) return albums;
    
    return albums.filter(album => 
      album.tracks.some(track => track.localPath)
    );
  }, [albums, showLocalOnly]);

  useEffect(() => {
    if (selectedAlbumId) {
      localStorage.setItem("selectedAlbumId", selectedAlbumId);
    } else {
      localStorage.removeItem("selectedAlbumId");
    }
  }, [selectedAlbumId]);

  useEffect(() => {
    localStorage.setItem("showLocalOnly", String(showLocalOnly));
  }, [showLocalOnly]);

  useEffect(() => {
    const loadTracks = async () => {
      const cachedTracks = trackService.getTracks();
      if (cachedTracks) {
        setTracks(Object.values(cachedTracks));
      }
    };

    loadTracks();
  }, []);

  useEffect(() => {
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

  useEffect(() => {
    const getStorageEstimate = async () => {
      if (navigator.storage && navigator.storage.estimate) {
        try {
          const estimate = await navigator.storage.estimate();
          setStorageEstimate({
            usage: estimate.usage ?? 0,
            quota: estimate.quota ?? 0,
          });
        } catch (error) {
          console.error("Error fetching storage estimate:", error);
        }
      }
    };
    getStorageEstimate();
  }, []);

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header showLocalFilter={true} localFilterEnabled={showLocalOnly} onLocalFilterChange={setShowLocalOnly} />
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
    setSelectedAlbumId(album.name);
  };

  const handleGoBackToAlbums = () => {
    setSelectedAlbumId(null);
  };

  const handleTrackSelect = useCallback((track: Track) => {
    setCurrentTrack(track);
    if (selectedAlbum && selectedAlbum.tracks.some(t => t.key === track.key)) {
      setPlaylistTracks(selectedAlbum.tracks); 
    }
    else if (!selectedAlbum) {
       const trackAlbum = albums.find(a => a.tracks.some(t => t.key === track.key));
       if (trackAlbum) {
         setPlaylistTracks(trackAlbum.tracks);
       }
    }
  }, [selectedAlbum, albums]);

  const handleNext = useCallback(() => {
    const currentIndex = currentTrack
      ? playlistTracks.findIndex((t) => t.key === currentTrack.key)
      : -1;
    if (currentIndex !== -1 && currentIndex < playlistTracks.length - 1) {
      setCurrentTrack(playlistTracks[currentIndex + 1]);
    }
  }, [currentTrack, playlistTracks, setCurrentTrack]);

  const handlePrevious = useCallback(() => {
    const currentIndex = currentTrack
      ? playlistTracks.findIndex((t) => t.key === currentTrack.key)
      : -1;
    if (currentIndex !== -1 && currentIndex > 0) {
      setCurrentTrack(playlistTracks[currentIndex - 1]);
    }
  }, [currentTrack, playlistTracks, setCurrentTrack]);

  const handleDownload = useCallback(async (track: Track) => {
    const trackUUID = self.crypto.randomUUID();

    const { S3Service } = await import("@/lib/services/S3Service");
    const s3Service = S3Service.getInstance();
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
  }, []);
  
  const downloadTrack = useCallback(async (track: Track) => {
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
  }, [handleDownload, setTracks]);
  
  const performDelete = useCallback(async (track: Track) => {
    if (!track.localPath) return;

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
      toast({
        title: "Deletion Error",
        description: `Could not delete track: ${track.metadata?.title || track.key}`,
        variant: "destructive",
      });
      throw error; 
    }
  }, [toast]);

  const deleteTrack = useCallback(async (track: Track) => {
    try {
      await performDelete(track);
      const cachedTracks = trackService.getTracks();
      if (cachedTracks) {
        setTracks(Object.values(cachedTracks));
      }
      toast({
        title: "Track Deleted",
        description: `${track.metadata?.title || track.key} removed from local storage.`,
      });
    } catch (error) {
      console.error('Delete failed for track:', track, error);
    }
  }, [performDelete, setTracks, toast]);

  // Helper to calculate usage percentage
  const usagePercent = storageEstimate && storageEstimate.quota > 0 
      ? ((storageEstimate.usage / storageEstimate.quota) * 100).toFixed(1)
      : 0;

  return (
    <div className="flex flex-col min-h-screen">
      <Header showLocalFilter={true} localFilterEnabled={showLocalOnly} onLocalFilterChange={setShowLocalOnly} />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-6">
        
        {/* Display Storage Estimate when filter is active */}
        {showLocalOnly && storageEstimate && storageEstimate.quota > 0 && (
           <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md flex items-center space-x-2 mb-4 mx-auto max-w-md">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>
              Using {formatBytes(storageEstimate.usage)} of {formatBytes(storageEstimate.quota)} ({usagePercent}%) storage space.
            </span>
          </div>
        )}

        {!selectedAlbumId ? (
          showLocalOnly && filteredAlbums.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-10">
              <Download className="w-12 h-12 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Downloaded Albums</h3>
              <p>You haven&apos;t downloaded any albums yet.</p>
              <p>Disable the filter above to see all albums.</p>
            </div>
          ) : (
            <div>
              <AlbumList 
                albums={filteredAlbums}
                onAlbumSelect={handleAlbumSelect}
                showSetupPrompt={!hasCredentials}
                onSetup={() => navigate("/setup")}
              />
            </div>
          )
        ) : selectedAlbum ? (
          <div className="flex flex-col h-full">
            <div className="flex items-center mb-4 gap-3 p-2 rounded-lg bg-gradient-to-r from-emerald-600/5 to-teal-700/5 border border-emerald-600/10">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleGoBackToAlbums} 
                className="hover:bg-muted flex-shrink-0"
                aria-label="Back to albums"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3 overflow-hidden">
                <StoredImage 
                  fileUUID={selectedAlbumArtUUID}
                  alt={`${selectedAlbum.name} cover`}
                  className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                  placeholderIcon={<Music2 className="w-6 h-6 text-muted-foreground" />}
                />
                <div className="flex-grow overflow-hidden">
                  <h2 className="text-xl font-semibold truncate" title={selectedAlbum.name}>
                    {selectedAlbum.name}
                  </h2>
                  <p className="text-sm text-muted-foreground truncate">
                    {findArtistName(selectedAlbum.tracks) || "Unknown Artist"}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex-grow overflow-y-auto">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                    Loading tracks...
                  </div>
                }
              >
                <TrackList
                  tracks={selectedAlbumTracks}
                  currentTrack={currentTrack}
                  selectedAlbum={selectedAlbum}
                  onSelect={handleTrackSelect}
                  onDownloadTrack={downloadTrack}
                  downloadingTrackKeys={downloadingTrackKeys}
                  onDeleteTrack={deleteTrack}
                />
              </Suspense>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p>Loading album...</p> 
          </div>
         )
        }
      </main>

      {currentTrack !== null && (
        <Suspense fallback={null}>
          <AudioPlayer
            track={currentTrack}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        </Suspense>
      )}
    </div>
  );
}
