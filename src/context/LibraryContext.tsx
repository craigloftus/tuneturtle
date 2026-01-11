import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Album, Track, TrackService } from "@/lib/services/TrackService";

interface LibraryContextValue {
  tracks: Track[];
  albums: Album[];
  refreshTracks: () => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);
const trackService = TrackService.getInstance();

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);

  const refreshTracks = useCallback(() => {
    const cachedTracks = trackService.getTracks();
    setTracks(cachedTracks ? Object.values(cachedTracks) : []);
  }, []);

  useEffect(() => {
    refreshTracks();
  }, [refreshTracks]);

  const albums = useMemo(() => {
    return tracks.reduce((acc, track) => {
      const albumName = track.album || "Unknown Album";
      const existing = acc.find((album) => album.name === albumName);
      if (existing) {
        existing.tracks.push(track);
      } else {
        acc.push({ name: albumName, tracks: [track], coverUrl: undefined });
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
