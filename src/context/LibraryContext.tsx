import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { Album, getAlbumIdForTrackKey, TrackService } from "@/lib/services/TrackService";

interface LibraryContextValue {
  tracks: ReturnType<TrackService["getSnapshot"]>;
  albums: Album[];
  refreshTracks: () => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);
const trackService = TrackService.getInstance();

export function LibraryProvider({ children }: { children: ReactNode }) {
  const tracks = useSyncExternalStore(
    trackService.subscribe,
    trackService.getSnapshot,
    trackService.getSnapshot
  );

  const refreshTracks = useCallback(() => {
    trackService.refresh();
  }, []);

  const albums = useMemo(() => {
    return tracks.reduce((acc, track) => {
      const albumName = track.album || "Unknown Album";
      const albumId = track.albumId || getAlbumIdForTrackKey(track.key);
      const existing = acc.find((album) => album.id === albumId);
      if (existing) {
        existing.tracks.push(track);
      } else {
        acc.push({ id: albumId, name: albumName, tracks: [track], coverUrl: undefined });
      }
      return acc;
    }, [] as Album[]);
  }, [tracks]);

  const value = useMemo(
    () => ({ tracks, albums, refreshTracks }),
    [tracks, albums, refreshTracks]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error("useLibrary must be used within a LibraryProvider");
  }
  return context;
}
