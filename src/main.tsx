import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./assets/main.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root not found");
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (import.meta.hot) {
  import.meta.hot.on("vite:afterUpdate", (payload: { updates?: Array<{ type?: string }> }) => {
    const hasJsUpdate =
      payload?.updates?.some((update) => update.type === "js-update") ?? false;
    if (hasJsUpdate) {
      window.location.reload();
    }
  });
}
