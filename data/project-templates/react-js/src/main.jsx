import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { YagnaProvider } from "@golem-sdk/react";

if (!import.meta.env.VITE_YAGNA_APPKEY) {
  throw new Error("VITE_YAGNA_APPKEY env variable is not set. Please add it to the .env file.");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <YagnaProvider
      config={{
        yagnaAppKey: import.meta.env.VITE_YAGNA_APPKEY,
      }}
    >
      <App />
    </YagnaProvider>
  </React.StrictMode>,
);
