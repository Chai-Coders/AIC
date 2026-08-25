# Headless Django REST Framework CMS Backend with JWT Auth

A lightweight, scalable, and secure Headless Content Management System (CMS) backend built with **Django 5.x/6.x**, **Django REST Framework (DRF)**, and **SimpleJWT**.

This backend powers both public consumption (`app.com`) and authenticated inline CMS content management (`admin.app.com`).

---

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [How to Create Admin Credentials (Industry Standards)](#how-to-create-admin-credentials-industry-standards)
- [Quick Start Guide](#quick-start-guide)
- [Authentication API Endpoints](#authentication-api-endpoints)
- [Content API Endpoints](#content-api-endpoints)
- [Frontend Developer Integration Guide](#frontend-developer-integration-guide)
  - [1. Axios Client with Silent Token Refresh](#1-axios-client-with-silent-token-refresh)
  - [2. Subdomain & Route Detection (`admin.app.com` vs `app.com`)](#2-subdomain--route-detection-adminappcom-vs-appcom)
  - [3. React Authentication Context (`AuthContext.jsx`)](#3-react-authentication-context-authcontextjsx)
  - [4. Conditional Inline Edit Wrapper (`EditableSection.jsx`)](#4-conditional-inline-edit-wrapper-editablesectionjsx)
  - [5. Multipart Form Data Upload Example (Images + Text)](#5-multipart-form-data-upload-example-images--text)
- [Running with Docker](#running-with-docker)
- [Running Automated Tests](#running-automated-tests)

---

## Architecture Overview

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

- **Public Site (`app.com`)**: Unauthenticated `GET` requests fetch content without tokens.
- **Admin Portal (`admin.app.com`)**: Authenticated admins obtain a JWT pair (`access` + `refresh`). Write operations (`POST`, `PUT`, `PATCH`, `DELETE`) pass the header `Authorization: Bearer <access_token>`.

---

## How to Create Admin Credentials (Industry Standards)

In production systems, administrative credentials are created through 3 established patterns:

### Method 1: Automated & Idempotent via Environment Variables (Recommended for CI/CD & Docker)
To prevent build scripts and container boots from failing when an admin already exists, use the included idempotent management command `createsuperuser_if_not_exists`:

```powershell
# Windows PowerShell
$env:DJANGO_SUPERUSER_USERNAME="admin"
$env:DJANGO_SUPERUSER_PASSWORD="YourSecurePassword123!"
$env:DJANGO_SUPERUSER_EMAIL="admin@aic.org"
python manage.py createsuperuser_if_not_exists
```

```bash
# Linux / macOS / Docker Entrypoint
DJANGO_SUPERUSER_USERNAME=admin \
DJANGO_SUPERUSER_PASSWORD=YourSecurePassword123! \
DJANGO_SUPERUSER_EMAIL=admin@aic.org \
python manage.py createsuperuser_if_not_exists
```

Or provide arguments directly:
```bash
python manage.py createsuperuser_if_not_exists --username admin --password YourSecurePassword123! --email admin@aic.org
```

### Method 2: Standard Django Non-Interactive Command
```bash
DJANGO_SUPERUSER_USERNAME=admin \
DJANGO_SUPERUSER_PASSWORD=YourSecurePassword123! \
DJANGO_SUPERUSER_EMAIL=admin@aic.org \
python manage.py createsuperuser --noinput
```

### Method 3: Interactive CLI (Local Development)
```bash
python manage.py createsuperuser
```

> **Security Rule**: Login via `/api/auth/login/` strictly requires `is_staff=True` or `is_superuser=True`. Standard visitor accounts cannot obtain CMS administration tokens.

---

## Quick Start Guide

### 1. Activate Environment & Install Dependencies
```powershell
.\venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

### 2. Run Database Migrations
```powershell
python backend\manage.py migrate
```

### 3. Seed Initial Admin Account
```powershell
python backend\manage.py createsuperuser_if_not_exists --username admin --password adminpassword123 --email admin@aic.org
```

### 4. Start Local Server
```powershell
python backend\manage.py runserver 0.0.0.0:8000
```
Backend API will be accessible at: `http://127.0.0.1:8000/`

---

## Authentication API Endpoints

Base URL: `http://localhost:8000/api/auth/`

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/login/` | Authenticate admin, returns JWT pair + user info | No |
| `POST` | `/api/auth/refresh/` | Obtain fresh access token using refresh token | No |
| `POST` | `/api/auth/verify/` | Verify token validity | No |
| `GET` | `/api/auth/me/` | Get authenticated user profile & permissions | Bearer Token |
| `POST` | `/api/auth/logout/` | Blacklist refresh token | Bearer Token |

### 1. Login (`POST /api/auth/login/`)
**Request Body (`application/json`):**
```json
{
  "username": "admin",
  "password": "adminpassword123"
}
```

**Success Response (`200 OK`):**
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@aic.org",
    "first_name": "",
    "last_name": "",
    "is_staff": true,
    "is_superuser": true
  }
}
```

**Error Response (`400 Bad Request` / `401 Unauthorized`):**
```json
{
  "detail": "Access restricted. Only staff and administrators are permitted to log in."
}
```

---

### 2. Refresh Token (`POST /api/auth/refresh/`)
**Request Body (`application/json`):**
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
**Success Response (`200 OK`):**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 3. Current User Profile (`GET /api/auth/me/`)
**Headers:**
```http
Authorization: Bearer <access_token>
```
**Success Response (`200 OK`):**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@aic.org",
  "first_name": "",
  "last_name": "",
  "is_staff": true,
  "is_superuser": true
}
```

---

### 4. Logout (`POST /api/auth/logout/`)
**Headers:**
```http
Authorization: Bearer <access_token>
```
**Request Body (`application/json`):**
```json
{
  "refresh": "<refresh_token>"
}
```
**Success Response (`200 OK`):**
```json
{
  "detail": "Successfully logged out and token invalidated."
}
```

---

## Content API Endpoints

All content endpoints follow standard REST semantics. Read operations (`GET`) are public; mutating operations (`POST`, `PUT`, `PATCH`, `DELETE`) require `Authorization: Bearer <access_token>`.

| Endpoint | Methods | Description | Parameters |
|---|---|---|---|
| `/api/gallery/` | `GET`, `POST` | List gallery items / Create item | `?page=1` |
| `/api/gallery/<id>/` | `GET`, `PUT`, `PATCH`, `DELETE` | Retrieve / Update / Delete gallery item | - |
| `/api/startups/` | `GET`, `POST` | List startups / Create startup | `?page=1` |
| `/api/startups/<id>/` | `GET`, `PUT`, `PATCH`, `DELETE` | Retrieve / Update / Delete startup | - |
| `/api/news/` | `GET`, `POST` | List news updates / Create news | `?page=1` |
| `/api/news/<id>/` | `GET`, `PUT`, `PATCH`, `DELETE` | Retrieve / Update / Delete news | - |
| `/api/team/` | `GET`, `POST` | List team members / Create member | `?page=1`, `?category=<choice>` |
| `/api/team/<id>/` | `GET`, `PUT`, `PATCH`, `DELETE` | Retrieve / Update / Delete member | - |

**Team Categories:** `mentor` (International Mentor), `team` (AIC Team), `governor` (Board of Governors).

---

## Frontend Developer Integration Guide

### 1. Axios Client with Silent Token Refresh
Create `src/api/client.js`:

```javascript
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE,
});

// Request interceptor: attach Access Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: automatically refresh on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh/`, {
            refresh: refreshToken,
          });

          localStorage.setItem('access_token', data.access);
          if (data.refresh) {
            localStorage.setItem('refresh_token', data.refresh);
          }

          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return api(originalRequest);
        } catch (refreshErr) {
          // Refresh failed - log out
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.reload();
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

### 2. Subdomain & Route Detection (`admin.app.com` vs `app.com`)
Create `src/utils/domain.js`:

```javascript
export const isSubdomainAdmin = () => {
  const hostname = window.location.hostname;
  return hostname.startsWith('admin.') || hostname === 'admin.localhost';
};
```

---

### 3. React Authentication Context (`AuthContext.jsx`)
Create `src/context/AuthContext.jsx`:

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const res = await api.get('/auth/me/');
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login/', { username, password });
    localStorage.setItem('access_token', res.data.access);
    localStorage.setItem('refresh_token', res.data.refresh);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await api.post('/auth/logout/', { refresh: refreshToken });
      } catch (err) {
        console.warn('Logout blacklist error:', err);
      }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAuthenticated = Boolean(user && user.is_staff);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

---

### 4. Conditional Inline Edit Wrapper (`EditableSection.jsx`)
Wrap any section on your frontend. If the user is unauthenticated on `app.com`, it renders pristine UI. If authenticated on `admin.app.com`, it shows action overlays:

```jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function EditableSection({ label, onEdit, onDelete, children }) {
  const { isAuthenticated } = useAuth();
  const [hovered, setHovered] = useState(false);

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div
      style={{ position: 'relative', outline: hovered ? '2px dashed #3b82f6' : 'none', borderRadius: '8px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          zIndex: 50,
          background: 'rgba(17, 24, 39, 0.9)',
          color: '#fff',
          padding: '6px 12px',
          borderRadius: '6px',
          display: 'flex',
          gap: '8px',
          fontSize: '12px',
          alignItems: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <span style={{ color: '#93c5fd', fontWeight: 'bold' }}>{label}</span>
          <button onClick={onEdit} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
            ✏️ Edit
          </button>
          {onDelete && (
            <button onClick={onDelete} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
              🗑️ Delete
            </button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
```

---

### 5. Multipart Form Data Upload Example (Images + Text)
When adding or updating content with image files:

```javascript
import api from './api/client';

export const createGalleryItem = async (imageFile, subtext) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('subtext', subtext);

  const response = await api.post('/gallery/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateStartup = async (id, updatedFields) => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(updatedFields)) {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  }

  const response = await api.patch(`/startups/${id}/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
```

---

## Running with Docker

```bash
# 1. Build and boot containers
docker-compose up --build

# 2. Run migrations
docker-compose exec web python manage.py migrate

# 3. Create superuser
docker-compose exec web python manage.py createsuperuser_if_not_exists --username admin --password adminpassword123
```

---

## Running Automated Tests

```powershell
python backend\manage.py test content -v 2
```
All tests verify public GET endpoints, category filtering, JWT login, token refresh, current user profile, token blacklisting, and authenticated mutating requests.
