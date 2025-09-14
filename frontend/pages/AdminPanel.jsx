// pages/AdminPanel.jsx
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";
import { CSVLink } from "react-csv";
import { useAuth } from "../utils/auth";

const AdminPanel = ({ socket }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({ course: "", rating: "", student: "" });

  // Fetch all feedbacks
  const { data: feedbacks, isLoading } = useQuery(["feedbacks", filters], async () => {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/feedbacks`, {
      params: filters,
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    return res.data;
  });

  // Fetch all students
  const { data: students } = useQuery(["students"], async () => {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/students`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    return res.data;
  });

  // Block/unblock student mutation
  const toggleStudentStatus = useMutation(
    async (id) => {
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/admin/students/${id}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success("Student status updated");
        queryClient.invalidateQueries(["students"]);
      },
      onError: (err) => toast.error(err.response?.data?.message || "Failed to update student"),
    }
  );

  // Delete student mutation
  const deleteStudent = useMutation(
    async (id) => {
      const res = await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/students/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success("Student deleted");
        queryClient.invalidateQueries(["students"]);
      },
      onError: (err) => toast.error(err.response?.data?.message || "Failed to delete student"),
    }
  );

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // Real-time socket for feedback notifications
  useEffect(() => {
    socket.on("feedbackSubmitted", (data) => {
      toast.info(`New feedback submitted by ${data.studentName}`);
      queryClient.invalidateQueries(["feedbacks"]);
    });

    return () => {
      socket.off("feedbackSubmitted");
    };
  }, [socket]);

  return (
    <div className="container mt-4">
      <h2>Admin Dashboard</h2>

      <div className="mt-4">
        <h3>Analytics</h3>
        <p>Total Feedbacks: {feedbacks?.length || 0}</p>
        <p>Total Registered Students: {students?.length || 0}</p>
        {/* Could integrate charts for average rating per course */}
      </div>

      <div className="mt-4">
        <h3>Filters</h3>
        <select name="course" value={filters.course} onChange={handleFilterChange} className="mb-2">
          <option value="">All Courses</option>
          {feedbacks?.map((fb) => (
            <option key={fb.courseId} value={fb.courseId}>
              {fb.courseName}
            </option>
          ))}
        </select>
        <select name="rating" value={filters.rating} onChange={handleFilterChange} className="mb-2">
          <option value="">All Ratings</option>
          {[1, 2, 3, 4, 5].map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select name="student" value={filters.student} onChange={handleFilterChange} className="mb-2">
          <option value="">All Students</option>
          {students?.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <h3>Feedback List</h3>
        {isLoading ? (
          <p>Loading feedbacks...</p>
        ) : (
          <div>
            {feedbacks?.map((fb) => (
              <div key={fb._id} className="p-2 mb-2 border rounded">
                <strong>{fb.courseName}</strong> - Rating: {fb.rating} / 5
                <p>{fb.message}</p>
                <small>By {fb.studentName} on {new Date(fb.createdAt).toLocaleString()}</small>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        <h3>Manage Students</h3>
        {students?.map((s) => (
          <div key={s._id} className="p-2 mb-2 border rounded flex justify-between items-center">
            <span>{s.name} ({s.email}) - {s.isBlocked ? "Blocked" : "Active"}</span>
            <div>
              <button
                className="mr-2"
                onClick={() => toggleStudentStatus.mutate(s._id)}
                disabled={toggleStudentStatus.isLoading}
              >
                {s.isBlocked ? "Unblock" : "Block"}
              </button>
              <button onClick={() => deleteStudent.mutate(s._id)} disabled={deleteStudent.isLoading}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <CSVLink
          data={feedbacks || []}
          filename={"feedbacks.csv"}
          className="btn"
        >
          Export Feedbacks to CSV
        </CSVLink>
      </div>
    </div>
  );
};

export default AdminPanel;
