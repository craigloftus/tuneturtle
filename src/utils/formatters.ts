import { Track } from "@/lib/services/TrackService";



export const formatTime = (time: number): string => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}; 

  // Helper function to get display name for track
  export const formatTrackName = (track: Track) => {
    if (track?.metadata?.title) {
      return track.metadata.title;
    }
    if (!track.fileName) {
      // Fallback if fileName is not set
      const parts = track.key.split('/');
      return parts[parts.length - 1].replace(/\.[^/.]+$/, '');
    }
    return track.fileName;
  };