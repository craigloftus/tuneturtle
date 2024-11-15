import { useLocation } from "wouter";
import { Grid, List, Settings, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  viewMode?: "grid" | "list";
  onViewModeChange?: (mode: "grid" | "list") => void;
  title?: string;
  showViewControls?: boolean;
  showSettingsButton?: boolean;
  showRefreshButton?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function Header({ 
  viewMode, 
  onViewModeChange, 
  title,
  showViewControls = true,
  showSettingsButton = true,
  showRefreshButton = true,
  showBackButton = false,
  onBack
}: HeaderProps) {
  const [, navigate] = useLocation();

  return (
    <div className="fixed top-0 left-0 right-0 flex justify-between items-center p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 border-b">
      <div className="flex items-center space-x-4">
        {showBackButton && onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <h1 className="text-2xl font-bold">
          {title || "TuneTurtle"}
        </h1>
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
