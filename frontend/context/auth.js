// context/auth.js
import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

// Create context
const AuthContext = createContext();

// Provider
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [loading, setLoading] = useState(false);

  // Save user & token to localStorage
  useEffect(() => {
    if (user && token) {
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
    setIsAuthenticated(!!token);
  }, [user, token]);

  // Login function
  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, { email, password });
      setUser(res.data.user);
      setToken(res.data.token);
      toast.success("Login successful");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setToken(null);
    toast.info("Logged out");
  };

  // Check if user has a specific role
  const hasRole = (role) => user?.role === role;

  // Update user info
  const updateUser = (newUser) => {
    setUser(newUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        loading,
        login,
        logout,
        hasRole,
        setUser: updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth
export const useAuth = () => {
  return useContext(AuthContext);
};
