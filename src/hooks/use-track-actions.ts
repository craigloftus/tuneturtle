import { useCallback, useState } from "react";
import { Track, TrackService } from "@/lib/services/TrackService";
import { useToast } from "@/hooks/use-toast";
import { useLibrary } from "@/context/LibraryContext";

const trackService = TrackService.getInstance();

export function useTrackActions() {
  const { toast } = useToast();
  const { refreshTracks } = useLibrary();
  const [downloadingTrackKeys, setDownloadingTrackKeys] = useState<string[]>([]);

  const handleDownload = useCallback(async (track: Track) => {
    const trackUUID = self.crypto.randomUUID();

    const { S3Service } = await import("@/lib/services/S3Service");
    const s3Service = S3Service.getInstance();
    const url = await s3Service.getSignedUrl(track.key);
    const resp = await fetch(url);
    const blob = await resp.blob();
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(trackUUID, { create: true });
    const writer = await fileHandle.createWritable();
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
      refreshTracks();
    } catch (error) {
      console.error("Download failed for track:", track, error);
    } finally {
      setDownloadingTrackKeys((prev) => prev.filter((key) => key !== track.key));
    }
  }, [handleDownload, refreshTracks]);

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
      console.error("Error removing file:", track.localPath, error);
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
      refreshTracks();
      toast({
        title: "Track Deleted",
        description: `${track.metadata?.title || track.key} removed from local storage.`,
      });
    } catch (error) {
      console.error("Delete failed for track:", track, error);
    }
  }, [performDelete, refreshTracks, toast]);

  return {
    downloadTrack,
    deleteTrack,
    downloadingTrackKeys,
  };
}
