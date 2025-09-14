// pages/Signup.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../utils/auth";

const Signup = () => {
  const navigate = useNavigate();
  const { setUser, setToken } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    dob: "",
    address: "",
    profilePicture: null,
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "profilePicture") {
      setFormData((prev) => ({ ...prev, profilePicture: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    const { name, email, password, confirmPassword } = formData;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])/;

    if (!name || !email || !password || !confirmPassword) {
      toast.error("All required fields must be filled");
      return false;
    }
    if (!emailRegex.test(email)) {
      toast.error("Invalid email format");
      return false;
    }
    if (password.length < 8 || !passwordRegex.test(password)) {
      toast.error("Password must be 8+ chars, include a number and special char");
      return false;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key]) data.append(key, formData[key]);
      });

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/signup`, data, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      const { token, user } = res.data;
      setToken(token);
      setUser(user);

      toast.success("Account created successfully!");
      if (user.role === "admin") navigate("/admin");
      else navigate("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container text-center mt-4">
      <h2 className="mb-4">Create an Account</h2>
      <form onSubmit={handleSubmit} className="mx-auto" style={{ maxWidth: "500px" }}>
        <input name="name" placeholder="Name" onChange={handleChange} required className="mb-2" />
        <input name="email" type="email" placeholder="Email" onChange={handleChange} required className="mb-2" />
        <input name="password" type="password" placeholder="Password" onChange={handleChange} required className="mb-2" />
        <input name="confirmPassword" type="password" placeholder="Confirm Password" onChange={handleChange} required className="mb-2" />
        <input name="phone" placeholder="Phone Number" onChange={handleChange} className="mb-2" />
        <input name="dob" type="date" placeholder="Date of Birth" onChange={handleChange} className="mb-2" />
        <input name="address" placeholder="Address" onChange={handleChange} className="mb-2" />
        <input name="profilePicture" type="file" accept="image/*" onChange={handleChange} className="mb-2" />
        <button type="submit" disabled={loading}>{loading ? "Signing up..." : "Sign Up"}</button>
      </form>
      <p className="mt-2">
        Already have an account? <a href="/">Login here</a>
      </p>
    </div>
  );
};

export default Signup;
