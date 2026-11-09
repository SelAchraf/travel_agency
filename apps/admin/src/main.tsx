import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./i18n/index.js";
import { App } from "./App.js";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
