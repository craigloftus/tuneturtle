import { Album } from "@/types/aws";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle, Music } from "lucide-react";

interface AlbumGridProps {
  albums: Album[];
  onTrackSelect: (album: Album) => void;
  currentAlbum: Album | null;
}

export function AlbumGrid({ albums, onTrackSelect, currentAlbum }: AlbumGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {albums.map((album) => (
        <Card
          key={album.name}
          className={`group relative overflow-hidden transition-all hover:scale-105 ${
            currentAlbum?.name === album.name ? 'ring-2 ring-primary' : ''
          }`}
        >
          <Button
            variant="ghost"
            className="w-full h-full p-0"
            onClick={() => onTrackSelect(album)}
          >
            <div className="aspect-square w-full relative">
              {album.coverUrl ? (
                <img
                  src={album.coverUrl}
                  alt={album.name}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Music className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <PlayCircle className="h-12 w-12 text-white" />
              </div>
            </div>
            <div className="p-4 text-left">
              <h3 className="font-medium truncate">{album.name}</h3>
              <p className="text-sm text-muted-foreground">
                {album.tracks.length} tracks
              </p>
            </div>
          </Button>
        </Card>
      ))}
    </div>
  );
}
