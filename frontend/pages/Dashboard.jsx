// pages/Dashboard.jsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "../utils/auth";

const Dashboard = ({ socket }) => {
  const { user } = useAuth();

  // Fetch analytics data
  const { data, isLoading } = useQuery(["analytics"], async () => {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/feedback/analytics`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    return res.data;
  });

  return (
    <div className="container mt-4">
      <h1>Welcome, {user.name}</h1>
      <h3>Feedback Analytics</h3>
      {isLoading ? (
        <p>Loading analytics...</p>
      ) : (
        <div className="mt-4">
          {data?.courses?.map((course) => (
            <div key={course.id} className="mb-2 p-2 border rounded">
              <strong>{course.name}</strong>: Average Rating {course.avgRating} / 5 ({course.feedbackCount} feedbacks)
            </div>
          ))}
        </div>
      )}
      <div className="mt-6">
        <h3>Notifications</h3>
        <ul>
          {user.notifications?.map((n, idx) => (
            <li key={idx}>
              [{new Date(n.timestamp).toLocaleTimeString()}] {n.message}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
