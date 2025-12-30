import { useLocation } from "wouter";
import { Settings, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  showSettingsButton?: boolean;
  showRefreshButton?: boolean;
  showLocalFilter?: boolean;
  localFilterEnabled?: boolean;
  onLocalFilterChange?: (enabled: boolean) => void;
}

export function Header({ 
  showSettingsButton = true,
  showRefreshButton = true,
  showLocalFilter = false,
  localFilterEnabled = false,
  onLocalFilterChange,
}: HeaderProps) {
  const [, navigate] = useLocation();

  return (
      <div className="sticky top-0 left-0 right-0 flex justify-between items-center px-4 md:px-6 py-4 bg-gradient-to-r from-emerald-600/5 to-teal-700/5 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 border-b border-emerald-600/10">
        <div className="flex items-center space-x-2">
          <img
            src="/static/base_turtle.avif"
            alt="Tune Turtle Logo"
            width={32}
            height={32}
            className="h-8 w-auto cursor-pointer"
            onClick={() => navigate("/")}
          />
          <h1 className="text-2xl font-bold tracking-tight cursor-pointer" onClick={() => navigate("/")}>
            <span className="text-emerald-600 hover:text-emerald-500 transition-colors">Tune</span>
            <span className="text-emerald-400 hover:text-emerald-300 transition-colors">Turtle</span>
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          {showLocalFilter && onLocalFilterChange && (
            <Button
              variant={localFilterEnabled ? "secondary" : "ghost"}
              size="icon"
              onClick={() => onLocalFilterChange(!localFilterEnabled)}
              className="hover:bg-muted"
              aria-label="Toggle local tracks only"
              title={localFilterEnabled ? "Show all tracks" : "Show downloaded tracks only"}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          
          {showRefreshButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/indexing")}
              className="hover:bg-muted"
              title="Refresh Library"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          {showSettingsButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/setup")}
              className="hover:bg-muted"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
  );
}
