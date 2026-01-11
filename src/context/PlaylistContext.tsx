import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Playlist, PlaylistService } from "@/lib/services/PlaylistService";

interface PlaylistContextValue {
  playlists: Playlist[];
  createPlaylist: (name: string) => Playlist;
  addTrackToPlaylist: (playlistId: string, trackKey: string) => void;
  removeTrackFromPlaylist: (playlistId: string, trackKey: string) => void;
  deletePlaylist: (playlistId: string) => void;
}

const PlaylistContext = createContext<PlaylistContextValue | null>(null);
const playlistService = PlaylistService.getInstance();

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    setPlaylists(playlistService.getPlaylists());
  }, []);

  const persist = useCallback((updater: (prev: Playlist[]) => Playlist[]) => {
    setPlaylists((prev) => {
      const next = updater(prev);
      playlistService.savePlaylists(next);
      return next;
    });
  }, []);

  const createPlaylist = useCallback((name: string) => {
    const playlist: Playlist = {
      id: crypto.randomUUID(),
      name,
      trackKeys: [],
    };
    persist((prev) => [...prev, playlist]);
    return playlist;
  }, [persist]);

  const addTrackToPlaylist = useCallback((playlistId: string, trackKey: string) => {
    persist((prev) =>
      prev.map((playlist) => {
        if (playlist.id !== playlistId) return playlist;
        if (playlist.trackKeys.includes(trackKey)) return playlist;
        return { ...playlist, trackKeys: [...playlist.trackKeys, trackKey] };
      })
    );
  }, [persist]);

  const removeTrackFromPlaylist = useCallback((playlistId: string, trackKey: string) => {
    persist((prev) =>
      prev.map((playlist) => {
        if (playlist.id !== playlistId) return playlist;
        return {
          ...playlist,
          trackKeys: playlist.trackKeys.filter((key) => key !== trackKey),
        };
      })
    );
  }, [persist]);

  const deletePlaylist = useCallback((playlistId: string) => {
    persist((prev) => prev.filter((playlist) => playlist.id !== playlistId));
  }, [persist]);

  const value = useMemo(
    () => ({
      playlists,
      createPlaylist,
      addTrackToPlaylist,
      removeTrackFromPlaylist,
      deletePlaylist,
    }),
    [playlists, createPlaylist, addTrackToPlaylist, removeTrackFromPlaylist, deletePlaylist]
  );

  return <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>;
}

export function usePlaylists() {
  const context = useContext(PlaylistContext);
  if (!context) {
    throw new Error("usePlaylists must be used within a PlaylistProvider");
  }
  return context;
}
