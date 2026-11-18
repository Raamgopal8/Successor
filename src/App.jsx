import "./App.css";
import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { isTauriApp } from "./services/updaterService";
import DesktopRoutes from "./routes/DesktopRoutes";
import WebRoutes from "./routes/WebRoutes";

function App() {
  const isDesktop = isTauriApp();

  return (
    <AppProvider>
      <Router>
        {isDesktop ? <DesktopRoutes /> : <WebRoutes />}
      </Router>
    </AppProvider>
  );
}

export default App;
