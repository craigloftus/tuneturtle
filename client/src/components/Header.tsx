import { useLocation } from "wouter";
import { Grid, List, Settings, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  viewMode?: "grid" | "list";
  onViewModeChange?: (mode: "grid" | "list") => void;
  title?: string;
  showViewControls?: boolean;
  showSettingsButton?: boolean;
  showRefreshButton?: boolean;
}

export function Header({ 
  viewMode, 
  onViewModeChange, 
  title,
  showViewControls = true,
  showSettingsButton = true,
  showRefreshButton = true
}: HeaderProps) {
  const [, navigate] = useLocation();

  return (
    <div className="sticky top-0 flex justify-between items-center mb-8 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 w-full border-b">
      <div className="flex items-center space-x-4">
        {title ? (
          <h1 className="text-2xl font-bold">{title}</h1>
        ) : (
          <div className="flex items-center space-x-2">
            <img 
              src="/logo.svg"
              alt="TuneTurtle"
              className="h-10 w-auto transition-transform duration-200 hover:scale-105 cursor-pointer"
              style={{ objectFit: 'contain' }}
              onClick={() => navigate("/")}
            />
            <span className="text-xl font-bold">TuneTurtle</span>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-2">
        {showViewControls && viewMode !== undefined && onViewModeChange && (
          <>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => onViewModeChange("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => onViewModeChange("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </>
        )}
        {showRefreshButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/indexing")}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        {showSettingsButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/setup")}
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
