import { useLocation } from "wouter";
import { Grid, Settings, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    <TooltipProvider>
      <div className="sticky top-0 left-0 right-0 flex justify-between items-center px-6 py-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 border-b">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold tracking-tight hover:text-primary transition-colors cursor-pointer" onClick={() => navigate("/")}>
            TuneTurtle
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          {showViewControls && viewMode !== undefined && onViewModeChange && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => onViewModeChange("grid")}
                    className="hover:bg-muted"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Grid View</TooltipContent>
              </Tooltip>
            </>
          )}
          
          {showRefreshButton && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/indexing")}
                  className="hover:bg-muted"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Library</TooltipContent>
            </Tooltip>
          )}
          
          {showSettingsButton && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/setup")}
                  className="hover:bg-muted"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
