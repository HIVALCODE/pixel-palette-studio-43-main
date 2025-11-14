import { useState } from 'react';
import { useGallery } from '@/contexts/GalleryContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Download, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Gallery() {
  const { savedImages, deleteImage, clearGallery } = useGallery();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleDownload = (dataUrl: string, toolType: string, timestamp: number) => {
    const link = document.createElement('a');
    link.download = `${toolType}-${new Date(timestamp).toISOString().split('T')[0]}.png`;
    link.href = dataUrl;
    link.click();
    toast.success('Image downloaded');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Gallery</h1>
            <p className="text-muted-foreground mt-1">
              {savedImages.length} saved {savedImages.length === 1 ? 'image' : 'images'}
            </p>
          </div>
          {savedImages.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('Are you sure you want to clear the entire gallery?')) {
                  clearGallery();
                }
              }}
            >
              Clear Gallery
            </Button>
          )}
        </div>

        {savedImages.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No saved images yet. Process an image in any tool and click "Save to Gallery" to add it here.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {savedImages.map((image) => (
              <Card key={image.id} className="overflow-hidden group">
                <CardContent className="p-0">
                  <div className="relative aspect-square bg-muted">
                    <img
                      src={image.thumbnail}
                      alt={`${image.toolType} processed image`}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setSelectedImage(image.dataUrl)}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => setSelectedImage(image.dataUrl)}
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleDownload(image.dataUrl, image.toolType, image.timestamp)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => {
                          if (confirm('Delete this image?')) {
                            deleteImage(image.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{image.toolType.replace('-', ' ')}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(image.timestamp)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Image Preview</DialogTitle>
            </DialogHeader>
            {selectedImage && (
              <div className="flex items-center justify-center">
                <img src={selectedImage} alt="Full size preview" className="max-w-full max-h-[70vh] object-contain" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
