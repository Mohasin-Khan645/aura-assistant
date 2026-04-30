import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { assertEnv, log } from "./lib/aria-logger";
import { startPerformanceCheck } from "./lib/aria-perf";

if (assertEnv()) {
  log.info("ARIA boot", { mode: import.meta.env.MODE, host: window.location.hostname });
  startPerformanceCheck();
  createRoot(document.getElementById("root")!).render(<App />);
}
