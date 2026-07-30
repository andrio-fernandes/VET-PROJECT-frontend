# Learning Platform Frontend

Frontend application for the **Learning Platform** developed during the **Sharp Minds Cloud Tech Pvt. Ltd. Internship Program 2026**.

The Learning Platform is a web application that allows customers to learn how to use the MSME Sales Booster ERP through structured courses, lessons, videos, and downloadable learning materials.

---

# Technology Stack

- Next.js (Pages Router)
- React
- TypeScript
- Redux Toolkit
- Ant Design
- Axios
- React Hook Form
- SCSS

---

# Project Objective

Develop a Learning Management System (LMS) where:

- Administrators can create and manage learning content.
- Customers can browse courses.
- Customers can watch training videos.
- Customers can read learning material.
- Customers can track their learning progress.

This project will later be integrated into the MSME Sales Booster ERP.

---

# Installation

Clone the repository

```bash
git clone <repository-url>
```

Navigate to the project

```bash
cd learning-platform-frontend
```

Install dependencies

```bash
npm install
```

Run the development server

```bash
npm run dev
```

Open

```
http://localhost:3000
```

---

# Folder Structure

```
src

├── assets
├── components
├── hooks
├── layouts
├── pages
├── redux
├── services
├── styles
├── types
├── utils
└── constants
```

---

# Project Modules

The application will include:

- Authentication
- Dashboard
- Course Categories
- Courses
- Lessons
- Video Player
- PDF Viewer
- Learning Progress
- User Profile

---

# User Roles

## Administrator

- Login
- Manage Categories
- Create Courses
- Create Lessons
- Upload Videos
- Upload PDFs
- Edit Content
- Delete Content
- View Student Progress

---

## Student

- Login
- Browse Courses
- Search Courses
- Watch Videos
- Read PDFs
- Mark Lessons Complete
- Track Progress

---

# Git Workflow

Do **NOT** commit directly to `main`.

Always create a feature branch.

Example:

```bash
git checkout -b feature/login
```

After completing your work:

```bash
git add .

git commit -m "Added Login Page"

git push origin feature/login
```

Create a Pull Request for review.

---

# Coding Standards

- Use TypeScript.
- Follow ESLint rules.
- Keep components reusable.
- Do not duplicate code.
- Use Redux Toolkit for global state.
- Use Axios for API calls.
- Keep business logic outside UI components.
- Use meaningful variable and function names.
- Remove unused imports before committing.

---

# Commit Message Format

Good examples

```
Added Login Page

Implemented Course Listing

Created Sidebar Layout

Integrated Redux Store

Added Lesson API
```

Avoid messages like

```
Final

Done

Update

Changes

abc
```

---

# Team Expectations

Every intern is expected to:

- Write clean and readable code.
- Commit code regularly.
- Push feature branches.
- Raise Pull Requests.
- Participate in code reviews.
- Maintain documentation.
- Work collaboratively with the team.

---

# Deliverables

By the end of the internship, the application should support:

- User Authentication
- Course Management
- Lesson Management
- Video Playback
- PDF Viewing
- Learning Progress Tracking
- Responsive User Interface

---

# Maintained By

**Sharp Minds Cloud Tech Pvt. Ltd.**

MSME Sales Booster ERP Team

Internship Program 2026
