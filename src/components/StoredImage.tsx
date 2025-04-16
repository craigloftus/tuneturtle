import React, { useState, useEffect } from 'react';
import { FileStorageService } from '@/lib/services/FileStorageService';
import { Loader2, ImageOff } from 'lucide-react'; // Icons for loading and error states

interface StoredImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fileUUID: string | null | undefined;
  alt: string;
  placeholderIcon?: React.ReactNode; // Allow passing custom placeholder
}

const fileStorageService = FileStorageService.getInstance();

export function StoredImage({ fileUUID, alt, placeholderIcon, className, ...rest }: StoredImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let objectUrl: string | null = null;

    const loadImage = async () => {
      if (!fileUUID) {
        setImageUrl(null);
        setIsLoading(false);
        setError(false);
        return;
      }

      setIsLoading(true);
      setError(false);
      setImageUrl(null); // Clear previous image

      try {
        const file = await fileStorageService.retrieveFile(fileUUID);
        objectUrl = URL.createObjectURL(file);
        setImageUrl(objectUrl);
      } catch (err) {
        console.error(`[StoredImage] Failed to load image for UUID ${fileUUID}:`, err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();

    // Cleanup function
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        console.debug(`[StoredImage] Revoked Object URL for ${fileUUID}`);
      }
    };
  }, [fileUUID]); // Re-run effect if fileUUID changes

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center w-full h-full ${className || ''}`}>
        <Loader2 className="w-1/2 h-1/2 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !imageUrl) {
    // Show placeholder or error icon
    return (
      <div className={`flex items-center justify-center w-full h-full ${className || ''}`}>
        {placeholderIcon ? placeholderIcon : <ImageOff className="w-1/2 h-1/2 text-muted-foreground" />}
      </div>
    );
  }

  // Render the image if URL is loaded
  return (
    <img 
      src={imageUrl} 
      alt={alt} 
      className={className} 
      {...rest} 
    />
  );
} 