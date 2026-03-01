import { expect, Page, test } from "@playwright/test";

const credentials = {
  accessKeyId: "AKIAEXAMPLE",
  secretAccessKey: "secret-example",
  region: "eu-west-2",
  bucket: "music-bucket",
};

test("keeps same-name albums separate and routes to the selected album", async ({ page }) => {
  await seedAppState(page, {
    tracks: {
      "artist-a/shared-album/song-a.mp3": {
        key: "artist-a/shared-album/song-a.mp3",
        size: 10,
        lastModified: "2025-01-01T00:00:00.000Z",
        albumId: "artist-a/shared-album",
        album: "Shared Album",
        fileName: "song-a.mp3",
        metadata: {
          title: "Song A",
          artist: "Artist A",
          duration: 120,
          bitrate: 320,
        },
      },
      "artist-b/shared-album/song-b.mp3": {
        key: "artist-b/shared-album/song-b.mp3",
        size: 10,
        lastModified: "2025-01-01T00:00:00.000Z",
        albumId: "artist-b/shared-album",
        album: "Shared Album",
        fileName: "song-b.mp3",
        metadata: {
          title: "Song B",
          artist: "Artist B",
          duration: 120,
          bitrate: 320,
        },
      },
    },
  });

  await page.goto("/");

  await expect(page.getByText("Shared Album")).toHaveCount(2);
  await page.getByRole("button").filter({ hasText: "Artist A" }).click();

  await expect(page).toHaveURL(/\/albums\/artist-a%2Fshared-album$/);
  await expect(page.getByText("Song A")).toBeVisible();
  await expect(page.getByText("Song B")).toHaveCount(0);
});

test("filters to downloaded albums and persists the filter flag", async ({ page }) => {
  await seedAppState(page, {
    tracks: {
      "artist-a/local-album/song-a.mp3": {
        key: "artist-a/local-album/song-a.mp3",
        size: 10,
        lastModified: "2025-01-01T00:00:00.000Z",
        albumId: "artist-a/local-album",
        album: "Local Album",
        fileName: "song-a.mp3",
        downloaded: true,
        localPath: "local-song-a",
        metadata: {
          title: "Song A",
          artist: "Artist A",
          duration: 120,
          bitrate: 320,
        },
      },
      "artist-b/remote-album/song-b.mp3": {
        key: "artist-b/remote-album/song-b.mp3",
        size: 10,
        lastModified: "2025-01-01T00:00:00.000Z",
        albumId: "artist-b/remote-album",
        album: "Remote Album",
        fileName: "song-b.mp3",
        metadata: {
          title: "Song B",
          artist: "Artist B",
          duration: 120,
          bitrate: 320,
        },
      },
    },
  });

  await page.goto("/");

  await expect(page.getByText("Local Album")).toBeVisible();
  await expect(page.getByText("Remote Album")).toBeVisible();

  await page.getByRole("button", { name: "Toggle local tracks only" }).click();

  await expect(page.getByText("Local Album")).toBeVisible();
  await expect(page.getByText("Remote Album")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("showLocalOnly"))).toBe("true");
});

async function seedAppState(
  page: Page,
  options: {
    tracks: Record<string, unknown>;
    showLocalOnly?: boolean;
  }
) {
  await page.addInitScript(
    ({ seededTracks, seededCredentials, showLocalOnly }) => {
      localStorage.clear();
      localStorage.setItem("tracks", JSON.stringify(seededTracks));
      localStorage.setItem("aws_credentials", JSON.stringify(seededCredentials));
      localStorage.setItem("showLocalOnly", String(showLocalOnly));
    },
    {
      seededTracks: options.tracks,
      seededCredentials: credentials,
      showLocalOnly: options.showLocalOnly ?? false,
    }
  );
}
