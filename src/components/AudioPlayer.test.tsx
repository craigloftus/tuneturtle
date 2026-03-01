import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AudioPlayer } from "@/components/AudioPlayer";
import type { Track } from "@/lib/services/TrackService";

const track: Track = {
  key: "artist/album/song.mp3",
  size: 10,
  lastModified: new Date("2025-01-01T00:00:00.000Z"),
  albumId: "artist/album",
  album: "Album",
  fileName: "song.mp3",
  downloaded: true,
  localPath: "local-song",
  metadata: {
    title: "Song",
    artist: "Artist",
    duration: 120,
    bitrate: 320,
  },
};

describe("AudioPlayer", () => {
  it("disables transport controls after an unsupported-source media error", async () => {
    render(<AudioPlayer track={track} onNext={vi.fn()} onPrevious={vi.fn()} />);

    await waitFor(() => expect(navigator.storage.getDirectory).toHaveBeenCalled());

    const audio = document.querySelector("audio") as HTMLAudioElement;
    Object.defineProperty(audio, "error", {
      configurable: true,
      value: { code: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED },
    });

    audio.dispatchEvent(new Event("error"));

    await waitFor(() => {
      for (const button of screen.getAllByRole("button")) {
        expect(button).toBeDisabled();
      }
    });
  });
});
