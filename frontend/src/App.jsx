import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "./utils/auth";
import Login from "@pages/Login";
import Signup from "@pages/Signup";
import Dashboard from "@pages/Dashboard";
import AdminDashboard from "@pages/AdminDashboard";
import Profile from "@pages/Profile";
import FeedbackPage from "@pages/FeedbackPage";
import NotFound from "@pages/NotFound";
import PrivateRoute from "@components/PrivateRoute";
import AdminRoute from "@components/AdminRoute";

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");

const App = () => {
  const { user, setNotifications } = useAuth();

  useEffect(() => {
    if (user) {
      socket.emit("joinRoom", user.id);

      socket.on("notification", (data) => {
        setNotifications((prev) => [...prev, data]);
      });
    }

    return () => {
      socket.off("notification");
    };
  }, [user]);

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard socket={socket} />
          </PrivateRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard socket={socket} />
          </AdminRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />

      <Route
        path="/feedback"
        element={
          <PrivateRoute>
            <FeedbackPage socket={socket} />
          </PrivateRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
