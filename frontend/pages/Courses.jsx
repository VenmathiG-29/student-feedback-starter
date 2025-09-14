// pages/Courses.jsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../utils/auth";

const Courses = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [courseName, setCourseName] = useState("");
  const [editingCourse, setEditingCourse] = useState(null);

  // Fetch courses
  const { data: courses, isLoading } = useQuery(["courses"], async () => {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    return res.data;
  });

  // Add or Edit course mutation
  const saveCourse = useMutation(
    async (name) => {
      if (editingCourse) {
        const res = await axios.put(
          `${import.meta.env.VITE_API_URL}/api/courses/${editingCourse._id}`,
          { name },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        return res.data;
      } else {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/courses`,
          { name },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        return res.data;
      }
    },
    {
      onSuccess: () => {
        toast.success(editingCourse ? "Course updated!" : "Course added!");
        queryClient.invalidateQueries(["courses"]);
        setCourseName("");
        setEditingCourse(null);
      },
      onError: (err) => toast.error(err.response?.data?.message || "Action failed"),
    }
  );

  // Delete course mutation
  const deleteCourse = useMutation(
    async (id) => {
      const res = await axios.delete(`${import.meta.env.VITE_API_URL}/api/courses/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success("Course deleted!");
        queryClient.invalidateQueries(["courses"]);
      },
      onError: (err) => toast.error(err.response?.data?.message || "Failed to delete course"),
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!courseName.trim()) return toast.error("Course name cannot be empty");
    saveCourse.mutate(courseName);
  };

  const handleEdit = (course) => {
    setCourseName(course.name);
    setEditingCourse(course);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      deleteCourse.mutate(id);
    }
  };

  return (
    <div className="container mt-4">
      <h2>Courses Management</h2>

      <form onSubmit={handleSubmit} className="mt-2 mb-4">
        <input
          type="text"
          placeholder="Course Name"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          className="mr-2"
        />
        <button type="submit" disabled={saveCourse.isLoading}>
          {saveCourse.isLoading ? "Saving..." : editingCourse ? "Update Course" : "Add Course"}
        </button>
        {editingCourse && (
          <button
            type="button"
            className="ml-2"
            onClick={() => {
              setEditingCourse(null);
              setCourseName("");
            }}
          >
            Cancel
          </button>
        )}
      </form>

      <div>
        <h3>All Courses</h3>
        {isLoading ? (
          <p>Loading courses...</p>
        ) : (
          <ul>
            {courses?.map((course) => (
              <li key={course._id} className="mb-2 flex justify-between items-center">
                <span>{course.name}</span>
                <div>
                  <button onClick={() => handleEdit(course)} className="mr-2">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(course._id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Courses;
