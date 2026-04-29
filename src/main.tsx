import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { assertEnv, log } from "./lib/aria-logger";

if (assertEnv()) {
  log.info("ARIA boot", { mode: import.meta.env.MODE, host: window.location.hostname });
  createRoot(document.getElementById("root")!).render(<App />);
}
