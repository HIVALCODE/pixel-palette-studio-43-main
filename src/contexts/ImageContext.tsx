import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

interface ImageContextType {
  image: HTMLImageElement | null;
  setImage: (image: HTMLImageElement | null) => void;
}

const ImageContext = createContext<ImageContextType | undefined>(undefined);

export const ImageProvider = ({ children }: { children: ReactNode }) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const img = new Image();
              img.onload = () => {
                setImage(img);
                toast.success('Image pasted successfully');
              };
              img.src = event.target?.result as string;
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  return (
    <ImageContext.Provider value={{ image, setImage }}>
      {children}
    </ImageContext.Provider>
  );
};

export const useImage = () => {
  const context = useContext(ImageContext);
  if (!context) {
    throw new Error('useImage must be used within an ImageProvider');
  }
  return context;
};
