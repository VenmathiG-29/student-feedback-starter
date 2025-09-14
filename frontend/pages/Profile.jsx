// pages/Profile.jsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../utils/auth";

const Profile = () => {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: user.name,
    phone: user.phone || "",
    dob: user.dob || "",
    address: user.address || "",
    profilePicture: null,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "profilePicture") {
      setFormData((prev) => ({ ...prev, profilePicture: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  // Update profile mutation
  const updateProfile = useMutation(
    async (data) => {
      const form = new FormData();
      Object.keys(data).forEach((key) => {
        if (data[key]) form.append(key, data[key]);
      });
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/users/me`, form, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      return res.data;
    },
    {
      onSuccess: (data) => {
        toast.success("Profile updated successfully");
        setUser(data);
        queryClient.invalidateQueries(["me"]);
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || "Failed to update profile");
      },
    }
  );

  // Change password mutation
  const changePassword = useMutation(
    async ({ currentPassword, newPassword }) => {
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/users/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success("Password changed successfully");
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || "Failed to change password");
      },
    }
  );

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateProfile.mutate(formData);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordData;
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])/;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8 || !passwordRegex.test(newPassword)) {
      toast.error("Password must be 8+ chars, include a number and special char");
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="container mt-4">
      <h2>My Profile</h2>
      <form onSubmit={handleProfileSubmit} className="mt-2">
        <input
          name="name"
          placeholder="Name"
          value={formData.name}
          onChange={handleChange}
          className="mb-2"
        />
        <input
          name="email"
          placeholder="Email"
          value={user.email}
          readOnly
          className="mb-2 bg-gray-200"
        />
        <input
          name="phone"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={handleChange}
          className="mb-2"
        />
        <input
          name="dob"
          type="date"
          value={formData.dob}
          onChange={handleChange}
          className="mb-2"
        />
        <input
          name="address"
          placeholder="Address"
          value={formData.address}
          onChange={handleChange}
          className="mb-2"
        />
        <input name="profilePicture" type="file" accept="image/*" onChange={handleChange} className="mb-2" />
        <button type="submit" disabled={updateProfile.isLoading}>
          {updateProfile.isLoading ? "Updating..." : "Update Profile"}
        </button>
      </form>

      <div className="mt-6">
        <h3>Change Password</h3>
        <form onSubmit={handlePasswordSubmit} className="mt-2">
          <input
            type="password"
            name="currentPassword"
            placeholder="Current Password"
            value={passwordData.currentPassword}
            onChange={handlePasswordChange}
            className="mb-2"
          />
          <input
            type="password"
            name="newPassword"
            placeholder="New Password"
            value={passwordData.newPassword}
            onChange={handlePasswordChange}
            className="mb-2"
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm New Password"
            value={passwordData.confirmPassword}
            onChange={handlePasswordChange}
            className="mb-2"
          />
          <button type="submit" disabled={changePassword.isLoading}>
            {changePassword.isLoading ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
