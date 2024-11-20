import { Album } from "@/types/aws";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AlbumGridProps {
  albums: Album[];
  onTrackSelect: (album: Album) => void;
}

export function AlbumGrid({ albums, onTrackSelect }: AlbumGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {albums.map((album) => (
        <Card
          key={album.name}
          className="group relative overflow-hidden transition-all hover:scale-105"
        >
          <Button
            variant="ghost"
            className="w-full h-full p-0"
            onClick={() => onTrackSelect(album)}
          >
            <div className="p-4 text-center overflow-hidden">
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
