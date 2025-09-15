📚 Student Feedback Management System

A full-stack web application that allows students to submit feedback on courses and instructors, while admins can manage users, courses, and analyze feedback.

🚀 Features
🔹 Students

* Signup/Login with authentication

* Submit feedback for courses

* View submitted feedback (My Feedback)

* Update personal profile

🔹 Admins

* Manage courses and users

* View all feedback in dashboard

* Export feedback data to CSV

* Monitor system activity with audit logs

* Access Admin Panel with role-based access

🔹 General

* JWT-based authentication

* Route protection for private & admin pages

* Rate limiting for security

* Background job workers for async tasks

* Validation utilities for input safety

🛠️ Tech Stack

* Frontend: React (Vite)

* Backend: Node.js + Express

* Database: MongoDB (Mongoose)

* Authentication: JWT + Middleware

* Styling: CSS

* Other Tools: CSV export, workers for async jobs

⚙️ Installation & Setup
1️⃣ Clone the Repository
             git clone [https://github.com/<your-username>/student-feedback-starter.git](https://github.com/VenmathiG-29/student-feedback-starter.git)
             cd student-feedback-starter

2️⃣ Setup Backend
             cd backend
             npm install
             cp .env.example .env
             # Update .env with MongoDB URI, JWT_SECRET, etc.
             npm run dev   # or node server.js

3️⃣ Setup Frontend
              cd ../frontend
              npm install
              npm run dev

4️⃣ Open in Browser

* Frontend: http://localhost:5173

* Backend API: http://localhost:5000

🧑‍💻 Scripts
* Backend

npm run dev → Start backend with nodemon

node scripts/createAdmin.js → Create initial admin user

* Frontend

npm run dev → Run frontend dev server

npm run build → Build for production

Author
[Venmathi G] - Creator and maintainer
