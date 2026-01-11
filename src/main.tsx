import { StrictMode, useEffect, lazy, Suspense, useState } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route, useLocation } from "wouter";
import "./index.css";
import { registerSW } from "virtual:pwa-register";
import { useToast } from "@/hooks/use-toast";
import { LibraryProvider } from "@/context/LibraryContext";
import { PlayerProvider, usePlayer } from "@/context/PlayerContext";
import { PlaylistProvider } from "@/context/PlaylistContext";
import { Header } from "@/components/Header";

import { Home } from "./pages/Home";
const Setup = lazy(() => import("./pages/Setup").then((module) => ({ default: module.Setup })));
const Indexing = lazy(() => import("./pages/Indexing").then((module) => ({ default: module.Indexing })));
const Album = lazy(() => import("./pages/Album").then((module) => ({ default: module.Album })));
const AudioPlayer = lazy(() => import("./components/AudioPlayer").then((module) => ({ default: module.AudioPlayer })));
const LazyToaster = lazy(() => import("./components/ui/toaster").then((module) => ({ default: module.Toaster })));

function ToastSlot() {
  const { toasts } = useToast();

  if (!toasts.length) return null;

  return (
    <Suspense fallback={null}>
      <LazyToaster />
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    window.dispatchEvent(new Event("app-ready"));
  }, []);

  const [location] = useLocation();
  const [showLocalOnly, setShowLocalOnly] = useState(() => {
    const cached = localStorage.getItem("showLocalOnly");
    return cached === "true";
  });

  useEffect(() => {
    localStorage.setItem("showLocalOnly", String(showLocalOnly));
  }, [showLocalOnly]);

  const isSetup = location === "/setup";
  const isIndexing = location === "/indexing";
  const isHome = location === "/";
  const { currentTrack } = usePlayer();

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        showRefreshButton={!isSetup && !isIndexing}
        showSettingsButton={!isSetup}
        showLocalFilter={isHome}
        localFilterEnabled={showLocalOnly}
        onLocalFilterChange={setShowLocalOnly}
      />
      <main className={currentTrack ? "flex-1 overflow-y-auto pb-28" : "flex-1 overflow-y-auto"}>
        <Suspense
          fallback={
            <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
              Loading...
            </div>
          }
        >
          <Switch>
            <Route path="/" component={() => <Home showLocalOnly={showLocalOnly} />} />
            <Route path="/albums/:albumId" component={Album} />
            <Route path="/setup" component={Setup} />
            <Route path="/indexing" component={Indexing} />
            <Route>404 Page Not Found</Route>
          </Switch>
        </Suspense>
      </main>
      <PlayerSlot />
      <ToastSlot />
    </div>
  );
}

function PlayerSlot() {
  const { currentTrack, nextTrack, previousTrack } = usePlayer();

  if (!currentTrack) return null;

  return (
    <Suspense fallback={null}>
      <AudioPlayer track={currentTrack} onNext={nextTrack} onPrevious={previousTrack} />
    </Suspense>
  );
}

const updateSW = registerSW({
  onNeedRefresh() {
    updateSW(true);
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LibraryProvider>
      <PlaylistProvider>
        <PlayerProvider>
          <App />
        </PlayerProvider>
      </PlaylistProvider>
    </LibraryProvider>
  </StrictMode>
);
