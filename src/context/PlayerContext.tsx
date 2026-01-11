import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Track } from "@/lib/services/TrackService";

interface PlayerContextValue {
  currentTrack: Track | null;
  queue: Track[];
  playTrack: (track: Track, nextQueue?: Track[]) => void;
  nextTrack: () => void;
  previousTrack: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);

  const playTrack = useCallback((track: Track, nextQueue?: Track[]) => {
    setCurrentTrack(track);
    if (nextQueue) {
      setQueue(nextQueue);
    }
  }, []);

  const nextTrack = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    const currentIndex = queue.findIndex((track) => track.key === currentTrack.key);
    if (currentIndex === -1 || currentIndex >= queue.length - 1) return;
    setCurrentTrack(queue[currentIndex + 1]);
  }, [currentTrack, queue]);

  const previousTrack = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    const currentIndex = queue.findIndex((track) => track.key === currentTrack.key);
    if (currentIndex <= 0) return;
    setCurrentTrack(queue[currentIndex - 1]);
  }, [currentTrack, queue]);

  const value = useMemo(
    () => ({ currentTrack, queue, playTrack, nextTrack, previousTrack }),
    [currentTrack, queue, playTrack, nextTrack, previousTrack]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
