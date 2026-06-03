import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./assets/main.css";

const root = createRoot(document.getElementById("app-window"))!;
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
