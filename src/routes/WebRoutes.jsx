import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "../../webpage/landingpage";
import Login from "../component/login";
import Dashboard from "../component/dashboard";
import Board from "../component/board";
import Profile from "../component/profile";
import Analytics from "../component/analytics";
import Privacy from "../component/privacy";
import Terms from "../component/terms";
import LoadingScreen from "../component/LoadingScreen";

export default function WebRoutes() {
  return (
    <Routes>
      {/* Web Landing & Download */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/download" element={<LandingPage />} />
      <Route path="/landing" element={<LandingPage />} />

      {/* Public Legal Pages */}
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

      {/* Web App Access */}
      <Route path="/app" element={<Login />} />
      <Route path="/loading" element={<LoadingScreen />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/board" element={<Board />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/profile" element={<Profile />} />

      {/* Fallback for web */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
