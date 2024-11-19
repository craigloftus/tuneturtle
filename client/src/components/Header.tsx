import { useLocation } from "wouter";
import { Grid, List, Settings, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  viewMode?: "grid" | "list";
  onViewModeChange?: (mode: "grid" | "list") => void;
  showViewControls?: boolean;
  showSettingsButton?: boolean;
  showRefreshButton?: boolean;
}

export function Header({ 
  viewMode, 
  onViewModeChange, 
  showViewControls = true,
  showSettingsButton = true,
  showRefreshButton = true,
}: HeaderProps) {
  const [, navigate] = useLocation();

  return (
    <div className="fixed top-0 left-0 right-0 flex justify-between items-center p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 border-b">
      <div className="flex items-center">
        <h1 className="text-2xl font-bold">TuneTurtle</h1>
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