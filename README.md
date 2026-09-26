# Smart Library Book Management System - Secure Enterprise Edition

A modern, role-based, and security-hardened Smart Library web application designed for campus management. Built with **React / Next.js (App Router)** for the frontend, **Node.js / Express** for the backend REST API, and **PostgreSQL / Supabase** (with automated zero-config fallback) for data persistence.

---

## 🌟 Key Capabilities & Requirements Implemented

### 1. Authentication & Security (Enterprise Grade)
- **Role-Based Access Control (RBAC)**: Distinct permissions for `student`, `admin` (librarian), and `super_admin`.
- **JWT Authentication with Refresh Tokens**: 15-minute access tokens and 7-day refresh tokens with rotation and validation.
- **Bcrypt Password Storage**: Salted hashes generated with cost factor 10.
- **Brute-Force & Account Lockout**: Automatic 15-minute account lockout after 5 consecutive failed login attempts (HTTP 423 Locked).
- **Two-Factor Authentication (2FA)**: Optional 6-digit email OTP verification with test code simulator for hackathon evaluators.
- **Activity Monitoring**: Recent login attempts table displaying IP address, user-agent, status (`SUCCESS`, `FAILED`, `LOCKED`, `2FA_CHALLENGE`), and failure reason.
- **HTTP Security Headers (Helmet.js)**: Strict CSP, HSTS, X-Frame-Options (`DENY`), X-Content-Type-Options (`nosniff`), and Referrer-Policy.
- **Rate Limiting**: Multi-tiered rate limiters protecting authentication (20 req / 15m), search (60 req / 1m), and general API endpoints.
- **Input Sanitization & CSRF Protection**: Recursive HTML/script tag stripping against XSS, and custom anti-tampering token validation.

### 2. Core Functional Features
- **Students**:
  - Search catalog in real-time with filters (Category, Availability, Author).
  - Borrow books with instant copy decrement and automated 14-day loan term calculation.
  - Return books with 1-click confirmation and real-time copy re-increment.
  - Track active loans, due date countdowns, overdue badges, and fine calculations ($1.00/day).
- **Librarians / Admins**:
  - Full catalog CRUD (Add new title, edit total/available copies, shelf locations, delete titles).
  - Safety protection preventing deletion of titles currently checked out by students.
  - Campus-wide borrow/return records tracker with search by student ID, name, email, or title.
  - Front-desk book check-in on behalf of students.
- **Super Admin**:
  - User accounts governance with 1-click role promotions/demotions.
  - Emergency account unlock action for accounts frozen by brute-force lockout.
  - Centralized immutable audit logs inspector tracking every security and catalog action.
  - System health dashboard showing database engine, uptime, and database metrics.

### 3. Database Architecture (PostgreSQL / Supabase)
- Normalized relational schema across 6 core tables:
  - `roles`: `id`, `name`, `description`, `created_at`
  - `users`: `id`, `student_id`, `name`, `email`, `password_hash`, `role_id`, `two_factor_enabled`, `failed_login_attempts`, `lockout_until`
  - `books`: `id`, `isbn`, `title`, `author`, `category`, `cover_image`, `total_copies`, `available_copies`, `shelf_location`, `published_year`, `description`
  - `borrow_records`: `id`, `user_id`, `book_id`, `borrow_date`, `due_date`, `return_date`, `status`, `fine_amount`, `notes`
  - `audit_logs`: `id`, `user_id`, `user_email`, `action`, `entity_type`, `entity_id`, `details`, `ip_address`, `user_agent`, `created_at`
  - `login_attempts`: `id`, `email`, `ip_address`, `user_agent`, `status`, `failure_reason`, `created_at`
- **100% Parameterized SQL Queries**: Binds all user inputs via parameters (`$1, $2, ...`), completely neutralizing SQL Injection attacks.
- **Dual-Engine Persistence**: Connects to any remote PostgreSQL / Supabase cluster via `DATABASE_URL`, with seamless zero-config embedded SQLite fallback so the entire project runs instantly out of the box without manual database setup.

---

## 🚀 Pre-Seeded Demo Accounts (1-Click Ready)

All demo accounts use the standard password: `Password123!`

| Role | Name | Email | Permissions / Features |
|---|---|---|---|
| **Student** | Alex Chen | `student@library.edu` | Browse catalog, borrow books, return books, view personal history & due dates |
| **Librarian / Admin** | Sarah Connor | `librarian@library.edu` | Manage catalog inventory, adjust copies, track all campus borrow records |
| **Super Admin** | Marcus Vance | `superadmin@library.edu` | Promote/demote user roles, unlock frozen accounts, review audit trails & health |

> 💡 **Hackathon Tip**: In the UI, use the **Role Persona** dropdown in the top navbar or the 1-click buttons on the Sign In page to instantly log in as any role without typing!

---

## 🛠️ Project Structure

```
smart-library-system/
├── backend/
│   ├── src/
│   │   ├── config/             # JWT, lockout thresholds, security settings
│   │   ├── db/
│   │   │   ├── schema.sql      # PostgreSQL / Supabase table definitions
│   │   │   ├── seed.sql        # Initial sample roles, users, books, and records
│   │   │   └── index.js        # Parameterized query adapter (PostgreSQL + SQLite)
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT verification & RBAC role guards
│   │   │   ├── security.js     # Helmet, rate limiters, input sanitizer, CSRF
│   │   │   └── audit.js        # Audit logger & login attempts recorder
│   │   ├── controllers/        # Domain controllers (Auth, Books, Borrow, Admin, SecurityDemo)
│   │   ├── routes/             # Express API routes
│   │   └── server.js           # Express app bootstrap & error handlers
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── app/
│   │   ├── page.js             # Real-time Book Catalog & live borrow modal
│   │   ├── login/page.js       # Login, Register, 2FA OTP modal, lockout feedback
│   │   ├── student/page.js     # Student Dashboard: active loans, due dates, return action
│   │   ├── admin/page.js       # Librarian Portal: inventory CRUD & borrow records tracker
│   │   ├── super-admin/page.js # Super Admin: user roles, account unlock, audit logs
│   │   ├── profile/page.js     # User profile: 2FA toggle & recent login activity table
│   │   ├── security-lab/page.js# Interactive Security Sandbox for judges
│   │   └── layout.js           # Root layout with dark theme & navbar
│   ├── components/             # Reusable UI components (Navbar)
│   ├── context/                # AuthContext with 1-click persona switcher
│   ├── lib/api.js              # Fetch client with auto-refresh token handling
│   └── package.json
│
├── docker-compose.yml          # PostgreSQL container definition with auto-init
├── start.bat                   # 1-Click Windows launcher script
├── start.ps1                   # PowerShell launcher script
└── package.json                # Root package configuration
```

---

## ⚡ Quickstart Guide

### Option 1: Instant Launch (Zero Configuration)
The project comes pre-configured to use the embedded database engine if no external PostgreSQL database is connected.

1. **Start Backend**:
   ```bash
   cd backend
   npm start
   ```
   *Runs on `http://localhost:5000`*

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   *Runs on `http://localhost:3000`*

3. **Or launch both in 1-click on Windows**:
   Double click `start.bat` or run `.\start.ps1`.

---

### Option 2: Connecting to PostgreSQL / Supabase
1. Create a project in [Supabase](https://supabase.com) or start the included Docker container:
   ```bash
   docker compose up -d
   ```
2. In Supabase's SQL Editor (or your Postgres client), run `backend/src/db/schema.sql` and `backend/src/db/seed.sql`.
3. In `backend/.env`, set your connection string:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres
   DATABASE_SSL=true
   ```
4. Restart the backend: `npm start`. The server will detect PostgreSQL and display:
   ```
   [DB] Connected to PostgreSQL / Supabase successfully
   ```

---

## 🛡️ Evaluator & Judge Security Showcase

Navigate to **`/security-lab`** in the application for an interactive demonstration of the security features:

1. **SQL Injection Neutralization**:
   - Choose or type an injection attack payload (e.g. `' OR '1'='1` or `'; DROP TABLE books; --`).
   - Click **Test Exploit**.
   - See a side-by-side comparison:
     - **Vulnerable implementation**: Shows how raw string concatenation evaluates to TRUE and leaks the database.
     - **Our parameterized implementation**: Shows how PostgreSQL binds the payload as a safe string literal, returning 0 records and preventing data extraction.

2. **Brute-Force Attack & Account Lockout**:
   - Click **Send Bad Password Attempt** up to 5 times.
   - Watch the attempt meter increase with warning prompts.
   - On the 5th attempt, observe the account transition to `LOCKED (HTTP 423)` for 15 minutes.
   - Switch to **Super Admin** persona (`Marcus Vance`) to review the security incident in the **Audit Logs** and click **Unlock User** to restore access.

3. **Two-Factor Authentication (2FA)**:
   - Go to `/profile` and click **Enable 2FA (OTP)**.
   - Log out and log back in. The system prompts for a 6-digit OTP code and provides an auto-fill simulation badge for rapid testing.

4. **Activity Monitoring**:
   - Visit `/profile` to inspect the **Recent Authentication Attempts** forensic table showing exact IP, User-Agent, and diagnostic reason for every login event.
