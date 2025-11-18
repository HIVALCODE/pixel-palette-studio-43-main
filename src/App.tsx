import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { ImageProvider } from "@/contexts/ImageContext";
import { GalleryProvider } from "@/contexts/GalleryContext";
import Index from "./pages/Index";
import Halftone from "./pages/Halftone";
import PixelArt from "./pages/PixelArt";
import AsciiArt from "./pages/AsciiArt";
import Mosaic from "./pages/Mosaic";
import Gallery from "./pages/Gallery";
import NotFound from "./pages/NotFound";
import Perspective from "./pages/Perspective";
import Glass from "./pages/Glass";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GalleryProvider>
        <ImageProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="flex flex-col h-screen">
              <Navigation />
              <div className="flex-1 overflow-hidden">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/halftone" element={<Halftone />} />
                  <Route path="/pixel-art" element={<PixelArt />} />
                  <Route path="/ascii-art" element={<AsciiArt />} />
                  <Route path="/mosaic" element={<Mosaic />} />
                  <Route path="/perspective" element={<Perspective />} />
                  <Route path="/glass" element={<Glass />} />
                  <Route path="/gallery" element={<Gallery />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </div>
          </BrowserRouter>
        </ImageProvider>
      </GalleryProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
