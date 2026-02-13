import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import OperationsDashboard from "./dashboard/OperationsDashboard.jsx";
import "./styles.css";
import "leaflet/dist/leaflet.css";

const isDashboardRoute =
  window.location.pathname === "/dashboard" ||
  window.location.search.includes("dashboard=ops");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isDashboardRoute ? <OperationsDashboard /> : <App />}
  </React.StrictMode>
);
