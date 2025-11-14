import { NavLink } from "@/components/NavLink";
import { Grid3x3, Circle, Grid2x2, Type, Grid as GridIcon, Images, Ruler } from "lucide-react";

export const Navigation = () => {
  return (
    <nav className="h-14 bg-panel border-b border-border flex items-center px-6 gap-1">
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-bold">Image Tools</h1>
        <div className="flex gap-1">
          <NavLink
            to="/"
            end
            className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2"
            activeClassName="bg-accent text-foreground"
          >
            <Grid3x3 className="h-4 w-4" />
            Dithering
          </NavLink>
          <NavLink
            to="/halftone"
            className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2"
            activeClassName="bg-accent text-foreground"
          >
            <Circle className="h-4 w-4" />
            Halftone
          </NavLink>
          <NavLink
            to="/pixel-art"
            className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2"
            activeClassName="bg-accent text-foreground"
          >
            <Grid2x2 className="h-4 w-4" />
            Pixel Art
          </NavLink>
          <NavLink
            to="/ascii-art"
            className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2"
            activeClassName="bg-accent text-foreground"
          >
            <Type className="h-4 w-4" />
            ASCII Art
          </NavLink>
          <NavLink
            to="/mosaic"
            className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2"
            activeClassName="bg-accent text-foreground"
          >
            <GridIcon className="h-4 w-4" />
            Mosaic
          </NavLink>
          <NavLink
            to="/perspective"
            className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2"
            activeClassName="bg-accent text-foreground"
          >
            <Ruler className="h-4 w-4" />
            Perspective
          </NavLink>
          <NavLink
            to="/gallery"
            className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2"
            activeClassName="bg-accent text-foreground"
          >
            <Images className="h-4 w-4" />
            Gallery
          </NavLink>
        </div>
      </div>
    </nav>
  );
};
