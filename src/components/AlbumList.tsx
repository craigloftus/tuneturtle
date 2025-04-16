import { Album, Track, findAlbumArtUUID, findArtistName } from "@/lib/services/TrackService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music2, Info } from "lucide-react";
import { StoredImage } from "./StoredImage";
import { formatBytes } from "@/lib/utils";

interface StorageEstimate {
  usage: number;
  quota: number;
}

interface AlbumListProps {
  albums: Album[];
  onAlbumSelect: (album: Album) => void;
  showLocalOnly?: boolean;
  storageEstimate?: StorageEstimate | null;
}

export function AlbumList({ 
  albums, 
  onAlbumSelect, 
  showLocalOnly = false, 
  storageEstimate = null 
}: AlbumListProps) {

  if (showLocalOnly && albums.length === 0) {
    const usagePercent = storageEstimate && storageEstimate.quota > 0 
      ? ((storageEstimate.usage / storageEstimate.quota) * 100).toFixed(1)
      : 0;

    return (
      <div className="flex flex-col items-center justify-center text-center p-8 mt-10">
        <Music2 className="w-16 h-16 text-muted-foreground mb-4" strokeWidth={1} />
        <h3 className="text-lg font-semibold mb-1">No Downloaded Albums</h3>
        <p className="text-muted-foreground mb-4">
          You haven't downloaded any albums yet, or your filter excludes them.
        </p>
        {storageEstimate && storageEstimate.quota > 0 && (
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md flex items-center space-x-2">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>
              Using {formatBytes(storageEstimate.usage)} of {formatBytes(storageEstimate.quota)} ({usagePercent}%) storage space.
            </span>
          </div>
        )}
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
