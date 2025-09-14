// components/MyFeedback.jsx
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../utils/auth";

const MyFeedback = ({ socket }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's feedback
  const { data: feedbacks, isLoading } = useQuery(["myFeedbacks"], async () => {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/feedback/my`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    return res.data;
  });

  // Delete feedback mutation
  const deleteFeedback = useMutation(
    async (id) => {
      const res = await axios.delete(`${import.meta.env.VITE_API_URL}/api/feedback/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success("Feedback deleted successfully");
        queryClient.invalidateQueries(["myFeedbacks"]);
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || "Failed to delete feedback");
      },
    }
  );

  // Edit feedback mutation (simplified for demo)
  const editFeedback = useMutation(
    async ({ id, message, rating }) => {
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/feedback/${id}`,
        { message, rating },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success("Feedback updated successfully");
        queryClient.invalidateQueries(["myFeedbacks"]);
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || "Failed to update feedback");
      },
    }
  );

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this feedback?")) {
      deleteFeedback.mutate(id);
    }
  };

  const handleEdit = (fb) => {
    const newMessage = prompt("Edit your feedback:", fb.message);
    const newRating = parseInt(prompt("Edit rating (1-5):", fb.rating), 10);
    if (newMessage && newRating >= 1 && newRating <= 5) {
      editFeedback.mutate({ id: fb._id, message: newMessage, rating: newRating });
    }
  };

  return (
    <div className="container mt-4">
      <h2>My Feedback</h2>
      {isLoading ? (
        <p>Loading your feedback...</p>
      ) : feedbacks?.length === 0 ? (
        <p>No feedback submitted yet.</p>
      ) : (
        <div className="mt-2">
          {feedbacks.map((fb) => (
            <div key={fb._id} className="p-3 mb-2 border rounded">
              <strong>{fb.courseName}</strong> - Rating: {fb.rating} / 5
              <p>{fb.message}</p>
              <small>Submitted at: {new Date(fb.createdAt).toLocaleString()}</small>
              <div className="mt-2">
                <button
                  className="mr-2"
                  onClick={() => handleEdit(fb)}
                  disabled={editFeedback.isLoading}
                >
                  Edit
                </button>
                <button onClick={() => handleDelete(fb._id)} disabled={deleteFeedback.isLoading}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyFeedback;
