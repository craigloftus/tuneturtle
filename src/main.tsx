import { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { registerSW } from "virtual:pwa-register";
import { useToast } from "@/hooks/use-toast";

import { Home } from "./pages/Home";
const Setup = lazy(() => import("./pages/Setup").then((module) => ({ default: module.Setup })));
const Indexing = lazy(() => import("./pages/Indexing").then((module) => ({ default: module.Indexing })));
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

  return (
    <>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
            Loading...
          </div>
        }
      >
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/setup" component={Setup} />
          <Route path="/indexing" component={Indexing} />
          <Route>404 Page Not Found</Route>
        </Switch>
      </Suspense>
      <ToastSlot />
    </>
  );
}

const updateSW = registerSW({
  onNeedRefresh() {
    updateSW(true);
  },
});


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
