import { describe, expect, it } from "vitest";
import { TrackService } from "@/lib/services/TrackService";

describe("TrackService.mergeIndexedTracks", () => {
  it("preserves downloaded state and metadata when re-indexing", () => {
    const service = TrackService.getInstance();

    service.saveTracks({
      "artist/album/song.mp3": {
        key: "artist/album/song.mp3",
        size: 10,
        lastModified: new Date("2024-01-01T00:00:00.000Z"),
        albumId: "artist/album",
        album: "Album",
        fileName: "song.mp3",
        downloaded: true,
        localPath: "local-song",
        albumArtPath: "art-1",
        metadata: {
          title: "Song",
          artist: "Artist",
          duration: 123,
          bitrate: 320,
        },
      },
    });

    service.mergeIndexedTracks({
      "artist/album/song.mp3": {
        key: "artist/album/song.mp3",
        size: 20,
        lastModified: new Date("2025-01-01T00:00:00.000Z"),
        albumId: "artist/album",
        album: "Album",
        fileName: "song.mp3",
      },
    });

    expect(service.getTracks()?.["artist/album/song.mp3"]).toMatchObject({
      size: 20,
      downloaded: true,
      localPath: "local-song",
      albumArtPath: "art-1",
      metadata: {
        title: "Song",
        artist: "Artist",
        duration: 123,
        bitrate: 320,
      },
    });
  });
});
