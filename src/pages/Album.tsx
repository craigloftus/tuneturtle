import { Suspense, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Check, Download, Loader2, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackList } from "@/components/TrackList";
import { StoredImage } from "@/components/StoredImage";
import { useLibrary } from "@/context/LibraryContext";
import { usePlayer } from "@/context/PlayerContext";
import { useTrackActions } from "@/hooks/use-track-actions";
import { findAlbumArtUUID, findArtistName } from "@/lib/services/TrackService";
import { useToast } from "@/hooks/use-toast";
import { slugify } from "@/lib/utils";

export function Album() {
  const [, navigate] = useLocation();
  const { albumId } = useParams();
  const { albums } = useLibrary();
  const { playTrack, currentTrack } = usePlayer();
  const { toast } = useToast();
  const { downloadTrack, deleteTrack, downloadingTrackKeys } = useTrackActions();
  const [isAlbumDownloading, setIsAlbumDownloading] = useState(false);

  const selectedAlbum = useMemo(
    () => albums.find((album) => slugify(album.name) === (albumId || "")) || null,
    [albums, albumId]
  );

  const selectedAlbumTracks = useMemo(() => selectedAlbum?.tracks || [], [selectedAlbum]);
  const selectedAlbumArtUUID = useMemo(
    () => (selectedAlbum ? findAlbumArtUUID(selectedAlbum.tracks) : null),
    [selectedAlbum]
  );

  const downloadableAlbumTracks = useMemo(() => {
    return selectedAlbumTracks.filter((track) => !track.localPath);
  }, [selectedAlbumTracks]);

  const isAlbumDownloaded = selectedAlbumTracks.length > 0 && downloadableAlbumTracks.length === 0;

  const downloadAlbum = async () => {
    if (isAlbumDownloading || downloadableAlbumTracks.length === 0) return;
    setIsAlbumDownloading(true);
    toast({
      title: "Downloading Album",
      description: `${downloadableAlbumTracks.length} track${downloadableAlbumTracks.length === 1 ? "" : "s"} queued.`,
    });
    for (const track of downloadableAlbumTracks) {
      await downloadTrack(track);
    }
    setIsAlbumDownloading(false);
  };

  if (!selectedAlbum) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="hover:bg-muted"
            aria-label="Back to albums"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-semibold">Album not found</h2>
        </div>
        <p className="text-muted-foreground">We couldn't find that album in your library.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-4 gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-emerald-600/5 to-teal-700/5 border border-emerald-600/10">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
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
        <Button
          variant="outline"
          size="icon"
          onClick={downloadAlbum}
          disabled={isAlbumDownloading || downloadableAlbumTracks.length === 0}
          title={isAlbumDownloaded ? "Album downloaded" : "Download album"}
          aria-label={isAlbumDownloaded ? "Album downloaded" : "Download album"}
          className="flex-shrink-0"
        >
          {isAlbumDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isAlbumDownloaded ? (
            <Check className="h-4 w-4" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      </div>

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
          onSelect={(track) => playTrack(track, selectedAlbumTracks)}
          onDownloadTrack={downloadTrack}
          downloadingTrackKeys={downloadingTrackKeys}
          onDeleteTrack={deleteTrack}
        />
      </Suspense>
    </div>
  );
}
