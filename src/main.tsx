import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./assets/main.css";

const rootElement = document.getElementById("app-window");
if (!rootElement) throw new Error("Root element #app-window not found");
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
