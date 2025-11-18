import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

export interface SavedImage {
  id: string;
  dataUrl: string;
  thumbnail: string;
  toolType: 'dither' | 'halftone' | 'pixel-art' | 'ascii-art' | 'mosaic' | 'glass';
  timestamp: number;
  metadata?: Record<string, any>;
}

interface GalleryContextType {
  savedImages: SavedImage[];
  saveImage: (dataUrl: string, toolType: SavedImage['toolType'], metadata?: Record<string, any>) => void;
  deleteImage: (id: string) => void;
  clearGallery: () => void;
}

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

const STORAGE_KEY = 'gallery-saved-images';

const generateThumbnail = (dataUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxSize = 200;
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } else {
        resolve(dataUrl);
      }
    };
    img.src = dataUrl;
  });
};

export const GalleryProvider = ({ children }: { children: ReactNode }) => {
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSavedImages(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load gallery:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (savedImages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedImages));
    }
  }, [savedImages]);

  const saveImage = async (dataUrl: string, toolType: SavedImage['toolType'], metadata?: Record<string, any>) => {
    const thumbnail = await generateThumbnail(dataUrl);
    const newImage: SavedImage = {
      id: `${Date.now()}-${Math.random()}`,
      dataUrl,
      thumbnail,
      toolType,
      timestamp: Date.now(),
      metadata,
    };
    setSavedImages((prev) => [newImage, ...prev]);
    toast.success('Image saved to gallery');
  };

  const deleteImage = (id: string) => {
    setSavedImages((prev) => prev.filter((img) => img.id !== id));
    toast.success('Image deleted from gallery');
  };

  const clearGallery = () => {
    setSavedImages([]);
    localStorage.removeItem(STORAGE_KEY);
    toast.success('Gallery cleared');
  };

  return (
    <GalleryContext.Provider value={{ savedImages, saveImage, deleteImage, clearGallery }}>
      {children}
    </GalleryContext.Provider>
  );
};

export const useGallery = () => {
  const context = useContext(GalleryContext);
  if (!context) {
    throw new Error('useGallery must be used within a GalleryProvider');
  }
  return context;
};
