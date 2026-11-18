import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../component/login";
import Dashboard from "../component/dashboard";
import Board from "../component/board";
import Profile from "../component/profile";
import Analytics from "../component/analytics";
import Privacy from "../component/privacy";
import Terms from "../component/terms";
import LoadingScreen from "../component/LoadingScreen";
import UpdateModal from "../component/UpdateModal";

export default function DesktopRoutes() {
  return (
    <>
      <UpdateModal />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/loading" element={<LoadingScreen />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/board" element={<Board />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        {/* Fallback for desktop */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
