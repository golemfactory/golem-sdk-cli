import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { YagnaProvider } from "@golem-sdk/react";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <YagnaProvider>
      <App />
    </YagnaProvider>
  </React.StrictMode>,
);
