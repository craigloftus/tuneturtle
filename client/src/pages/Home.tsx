import { useState } from "react";
import useSWR from "swr";
import { Track } from "@/types/aws";
import { TrackList } from "@/components/TrackList";
import { AudioPlayer } from "@/components/AudioPlayer";
import { useLocation } from "wouter";

export function Home() {
  const [, navigate] = useLocation();
  const { data: tracks, error } = useSWR<Track[]>("/api/aws/list");
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);

  if (error?.message === "No credentials") {
    navigate("/setup");
    return null;
  }

  if (!tracks) {
    return <div className="p-8">Loading...</div>;
  }

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
      <h1 className="text-3xl font-bold mb-8">Music Player</h1>
      
      <TrackList
        tracks={tracks}
        onSelect={setCurrentTrack}
        currentTrack={currentTrack}
      />
      
      <AudioPlayer
        track={currentTrack}
        onNext={currentIndex < tracks.length - 1 ? handleNext : undefined}
        onPrevious={currentIndex > 0 ? handlePrevious : undefined}
      />
    </div>
  );
}
