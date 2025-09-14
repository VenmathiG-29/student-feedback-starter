// components/AdminRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../utils/auth";

const AdminRoute = () => {
  const { user, isAuthenticated } = useAuth();

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If not admin, redirect to unauthorized page
  if (user.role !== "admin") {
    return <Navigate to="/unauthorized" replace />;
  }

  // Authorized, render nested routes
  return <Outlet />;
};

export default AdminRoute;
