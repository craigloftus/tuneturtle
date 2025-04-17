import { Album, findAlbumArtUUID, findArtistName } from "@/lib/services/TrackService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music2 } from "lucide-react";
import { StoredImage } from "./StoredImage";

interface AlbumListProps {
  albums: Album[];
  onAlbumSelect: (album: Album) => void;
}

export function AlbumList({ 
  albums, 
  onAlbumSelect, 
}: AlbumListProps) {

  if (albums.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 mt-10">
        <Music2 className="w-16 h-16 text-muted-foreground mb-4" strokeWidth={1} />
        <h3 className="text-lg font-semibold mb-1">No Albums Found</h3>
        <p className="text-muted-foreground mb-4">
          There are no albums to display.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3 p-4">
      {albums.map((album) => {
        const artUUID = findAlbumArtUUID(album.tracks);
        const artistName = findArtistName(album.tracks);
        const trackCount = album.tracks.length;

        return (
          <Card
            key={album.name}
            className="group relative overflow-hidden transition-all hover:bg-accent"
          >
            <Button
              variant="ghost"
              className="w-full h-auto p-0 flex items-center text-left justify-start"
              onClick={() => onAlbumSelect(album)}
            >
              <div className="flex-shrink-0 w-16 h-16 bg-muted rounded-l-md flex items-center justify-center overflow-hidden mr-4">
                <StoredImage
                  fileUUID={artUUID}
                  alt={`${album.name} album art`}
                  className="w-full h-full object-cover"
                  placeholderIcon={<Music2 className="w-8 h-8 text-muted-foreground" />}
                />
              </div>
              <div className="flex-grow p-2 overflow-hidden">
                <h3 className="font-medium truncate">{album.name}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {artistName && <span>{artistName}</span>}
                  {artistName && trackCount > 0 && <span className="mx-1">·</span>}
                  {trackCount > 0 && <span>{trackCount} track{trackCount !== 1 ? 's' : ''}</span>}
                </p>
              </div>
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
