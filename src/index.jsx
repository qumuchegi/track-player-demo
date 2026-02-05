import "cesium/Build/Cesium/Widgets/widgets.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";

import "cesium/Build/Cesium/Widgets/widgets.css";
window.CESIUM_BASE_URL = "/cesium";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
