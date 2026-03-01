import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LibraryProvider, useLibrary } from "@/context/LibraryContext";

function AlbumListProbe() {
  const { albums } = useLibrary();

  return (
    <ul>
      {albums.map((album) => (
        <li key={album.id} data-testid="album-row">
          {album.id}:{album.name}:{album.tracks.length}
        </li>
      ))}
    </ul>
  );
}

describe("LibraryProvider", () => {
  it("keeps albums with the same title separate when their ids differ", () => {
    localStorage.setItem(
      "tracks",
      JSON.stringify({
        "artist-a/shared-album/song-a.mp3": {
          key: "artist-a/shared-album/song-a.mp3",
          size: 10,
          lastModified: new Date("2025-01-01T00:00:00.000Z"),
          albumId: "artist-a/shared-album",
          album: "Shared Album",
          fileName: "song-a.mp3",
          metadata: { title: "Song A", artist: "Artist A", duration: 100, bitrate: 320 },
        },
        "artist-b/shared-album/song-b.mp3": {
          key: "artist-b/shared-album/song-b.mp3",
          size: 10,
          lastModified: new Date("2025-01-01T00:00:00.000Z"),
          albumId: "artist-b/shared-album",
          album: "Shared Album",
          fileName: "song-b.mp3",
          metadata: { title: "Song B", artist: "Artist B", duration: 120, bitrate: 320 },
        },
      })
    );

    render(
      <LibraryProvider>
        <AlbumListProbe />
      </LibraryProvider>
    );

    expect(screen.getAllByTestId("album-row")).toHaveLength(2);
    expect(screen.getByText("artist-a/shared-album:Shared Album:1")).toBeInTheDocument();
    expect(screen.getByText("artist-b/shared-album:Shared Album:1")).toBeInTheDocument();
  });
});
