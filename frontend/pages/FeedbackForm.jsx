// components/FeedbackForm.jsx
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../utils/auth";

const FeedbackForm = ({ socket }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    course: "",
    rating: 5,
    message: "",
  });

  // Fetch courses
  const { data: courses, isLoading: coursesLoading } = useQuery(["courses"], async () => {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses`);
    return res.data;
  });

  // Fetch user's feedback
  const { data: feedbacks, isLoading: feedbackLoading } = useQuery(
    ["myFeedbacks"],
    async () => {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/feedback/my`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      return res.data;
    }
  );

  // Submit new feedback
  const addFeedback = useMutation(
    async (newFeedback) => {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/feedback`, newFeedback, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      return res.data;
    },
    {
      onSuccess: (data) => {
        toast.success("Feedback submitted successfully!");
        queryClient.invalidateQueries(["myFeedbacks"]);
        // Notify admin in real-time
        socket.emit("feedbackSubmitted", data);
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || "Feedback submission failed");
      },
    }
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.course || !formData.message) {
      toast.error("Please select a course and enter a message");
      return;
    }
    addFeedback.mutate(formData);
  };

  return (
    <div className="container mt-4">
      <h2>Submit Feedback</h2>

      <form onSubmit={handleSubmit} className="mt-2">
        <select name="course" value={formData.course} onChange={handleChange} className="mb-2">
          <option value="">Select Course</option>
          {coursesLoading ? (
            <option>Loading courses...</option>
          ) : (
            courses?.map((course) => (
              <option key={course._id} value={course._id}>
                {course.name}
              </option>
            ))
          )}
        </select>

        <input
          type="number"
          name="rating"
          value={formData.rating}
          min={1}
          max={5}
          onChange={handleChange}
          className="mb-2"
        />

        <textarea
          name="message"
          placeholder="Your feedback"
          value={formData.message}
          onChange={handleChange}
          className="mb-2"
        ></textarea>

        <button type="submit" disabled={addFeedback.isLoading}>
          {addFeedback.isLoading ? "Submitting..." : "Submit Feedback"}
        </button>
      </form>

      <div className="mt-6">
        <h3>Your Feedbacks</h3>
        {feedbackLoading ? (
          <p>Loading feedbacks...</p>
        ) : (
          feedbacks?.map((fb) => (
            <div key={fb._id} className="p-2 mb-2 border rounded">
              <strong>{fb.courseName}</strong> - Rating: {fb.rating} <br />
              {fb.message} <br />
              <small>{new Date(fb.createdAt).toLocaleString()}</small>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FeedbackForm;
