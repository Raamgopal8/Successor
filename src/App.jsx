import "./App.css";
import Login from "./component/login";
import Dashboard from "./component/dashboard";
import Board from "./component/board";
import Profile from "./component/profile";
import Analytics from "./component/analytics";
import Privacy from "./component/privacy";
import Terms from "./component/terms";
import UpdateModal from "./component/UpdateModal";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";

function App() {
  return (
    <AppProvider>
      <Router>
        <UpdateModal />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/board" element={<Board />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
