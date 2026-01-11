export interface Playlist {
  id: string;
  name: string;
  trackKeys: string[];
}

const STORAGE_KEY = "playlists";

export class PlaylistService {
  private static instance: PlaylistService;

  private constructor() {}

  public static getInstance(): PlaylistService {
    if (!PlaylistService.instance) {
      PlaylistService.instance = new PlaylistService();
    }
    return PlaylistService.instance;
  }

  public getPlaylists(): Playlist[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as Playlist[];
  }

  public savePlaylists(playlists: Playlist[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  }
}
