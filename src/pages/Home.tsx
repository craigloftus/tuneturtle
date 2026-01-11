import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Download, Info } from "lucide-react";
import { AlbumList } from "@/components/AlbumList";
import { useLibrary } from "@/context/LibraryContext";
import { formatBytes, slugify } from "@/lib/utils";

interface StorageEstimate {
  usage: number;
  quota: number;
}

interface HomeProps {
  showLocalOnly: boolean;
}

export function Home({ showLocalOnly }: HomeProps) {
  const [, navigate] = useLocation();
  const { albums } = useLibrary();
  const [storageEstimate, setStorageEstimate] = useState<StorageEstimate | null>(null);

  const hasCredentials = useMemo(() => {
    return Boolean(localStorage.getItem("aws_credentials"));
  }, []);

  const filteredAlbums = useMemo(() => {
    if (!showLocalOnly) return albums;
    return albums.filter((album) => album.tracks.some((track) => track.localPath));
  }, [albums, showLocalOnly]);

  useEffect(() => {
    const getStorageEstimate = async () => {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        setStorageEstimate({
          usage: estimate.usage ?? 0,
          quota: estimate.quota ?? 0,
        });
      }
    };
    getStorageEstimate();
  }, []);

  const usagePercent = storageEstimate && storageEstimate.quota > 0
    ? ((storageEstimate.usage / storageEstimate.quota) * 100).toFixed(1)
    : 0;

  return (
    <div className="container mx-auto px-4 md:px-6 py-6">
      {showLocalOnly && storageEstimate && storageEstimate.quota > 0 && (
        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md flex items-center space-x-2 mb-4 mx-auto max-w-md">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>
            Using {formatBytes(storageEstimate.usage)} of {formatBytes(storageEstimate.quota)} ({usagePercent}%) storage space.
          </span>
        </div>
      )}

      {showLocalOnly && filteredAlbums.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-10">
          <Download className="w-12 h-12 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Downloaded Albums</h3>
          <p>You haven't downloaded any albums yet.</p>
          <p>Disable the filter above to see all albums.</p>
        </div>
      ) : (
        <AlbumList
          albums={filteredAlbums}
          onAlbumSelect={(album) => navigate(`/albums/${slugify(album.name)}`)}
          showSetupPrompt={!hasCredentials}
          onSetup={() => navigate("/setup")}
        />
      )}
    </div>
  );
}
