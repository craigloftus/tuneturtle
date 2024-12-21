import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { SWRConfig } from "swr";
import { fetcher } from "./lib/fetcher";
import { Toaster } from "./components/ui/toaster";
import { Home } from "./pages/Home";
import { Setup } from "./pages/Setup";
import { Indexing } from "./pages/Indexing";
import { registerSW } from "virtual:pwa-register";


const updateSW = registerSW({
  onNeedRefresh() {
    updateSW(true);
  },
});


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SWRConfig value={{ fetcher }}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/setup" component={Setup} />
        <Route path="/indexing" component={Indexing} />
        <Route>404 Page Not Found</Route>
      </Switch>
      <Toaster />
    </SWRConfig>
  </StrictMode>
);
