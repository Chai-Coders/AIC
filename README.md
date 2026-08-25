# AIC CMS - Headless Full Stack Platform

A modern, production-grade Content Management System with a **Django REST Framework + SimpleJWT** backend and a **React + Vite** frontend supporting public browsing on `app.com` and inline administrative editing on `admin.app.com`.

---

## System Architecture

```text
                 +-----------------------------------------------+
                 |              Django REST API                  |
                 +-----------------------------------------------+
                          ▲                             ▲
            Public GET    │                Auth / CRUD  │ (Bearer JWT)
            (No Auth)     │                             │
                          │                             │
               +--------------------+         +--------------------+
               |      app.com       |         |   admin.app.com    |
               |  (Public Visitors) |         | (Admin Dashboard / |
               |                    |         |   Inline Editor)   |
               +--------------------+         +--------------------+
```

- **Frontend**: React, Vite, React Router, CSS Design System
- **Backend**: Python 3.12+, Django 5.x/6.x, Django REST Framework, SimpleJWT, Pillow
- **Auth Model**: JWT (JSON Web Tokens) with 30-min Access Tokens, 7-day Refresh Tokens, and Token Rotation/Blacklisting
- **Admin Provisioning**: Automated idempotent creation via `createsuperuser_if_not_exists`

---

## Quick Start Guide

### 1. Backend Setup (Django + JWT)

```powershell
# In root directory
.\venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt

# Run migrations
python backend\manage.py migrate

# Create initial admin account
python backend\manage.py createsuperuser_if_not_exists --username admin --password adminpassword123 --email admin@aic.org

# Start backend server (port 8000)
python backend\manage.py runserver 0.0.0.0:8000
```

### 2. Frontend Setup (React + Vite)

```powershell
# Install Node dependencies
npm install

# Start Vite dev server
npm run dev
```

The frontend will run at `http://localhost:5173`.

---

## Developer Guides & Documentation

- [Backend Documentation & API Reference](file:///c:/Projects/CMS/backend/README.md)
  - [Authentication Endpoints (`/api/auth/login/`, `/api/auth/refresh/`, `/api/auth/me/`)](file:///c:/Projects/CMS/backend/README.md#authentication-api-endpoints)
  - [Content Endpoints (`/api/gallery/`, `/api/startups/`, `/api/news/`, `/api/team/`)](file:///c:/Projects/CMS/backend/README.md#content-api-endpoints)
  - [Axios Interceptor with Silent Refresh Blueprint](file:///c:/Projects/CMS/backend/README.md#1-axios-client-with-silent-token-refresh)
  - [React AuthContext Blueprint](file:///c:/Projects/CMS/backend/README.md#3-react-authentication-context-authcontextjsx)
  - [Inline Editable Component Pattern](file:///c:/Projects/CMS/backend/README.md#4-conditional-inline-edit-wrapper-editablesectionjsx)
  - [Industry Admin Credential Creation Workflows](file:///c:/Projects/CMS/backend/README.md#how-to-create-admin-credentials-industry-standards)

---

## Testing

Run the automated backend test suite:
```powershell
python backend\manage.py test content -v 2
```
