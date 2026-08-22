# Headless Django REST Framework CMS Backend

A lightweight, scalable Headless Content Management System (CMS) backend built with **Django 5.x/6.x** and **Django REST Framework (DRF)**. 

Administrators manage media and textual content through the built-in **Django Admin** dashboard, while frontend client applications (e.g., React, Next.js, Vue) consume structured data via read-only REST API endpoints.

---

## Table of Contents
- [Tech Stack](#tech-stack)
- [Project Architecture](#project-architecture)
- [Quick Start Guide](#quick-start-guide)
- [How to Manually Test the Backend](#how-to-manually-test-the-backend)
  - [1. Testing via Django Admin Dashboard](#1-testing-via-django-admin-dashboard)
  - [2. Testing via DRF Browsable API](#2-testing-via-drf-browsable-api)
  - [3. Testing via cURL / Postman](#3-testing-via-curl--postman)
- [API Endpoints Reference](#api-endpoints-reference)
- [Frontend Integration Guide (React / Next.js)](#frontend-integration-guide-react--nextjs)
- [Running with Docker](#running-with-docker)
- [Running Automated Tests](#running-automated-tests)

---

## Tech Stack
- **Backend Framework:** Python 3.12+, Django 5.x / 6.x
- **API Engine:** Django REST Framework (DRF)
- **Image Processing:** Pillow
- **CORS Handling:** `django-cors-headers`
- **Database:** SQLite (Local development) / PostgreSQL (Production target)
- **Default Frontend Target:** `http://localhost:3000`

---

## Project Architecture
```text
CMS/
├── manage.py
├── db.sqlite3
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore
├── media/                  # Uploaded media storage
│   ├── gallery/
│   ├── news/
│   ├── startups/
│   └── team/
├── cms_backend/            # Main project configuration
│   ├── settings.py         # App settings, CORS, DRF, Database, & Media
│   ├── urls.py             # Master routing with media serving
│   └── wsgi.py
└── content/                # Dedicated CMS domain app
    ├── migrations/         # Database migrations
    ├── admin.py            # Custom Admin with image previews
    ├── models.py           # Domain models: Gallery, Startup, News, Team
    ├── serializers.py      # DRF ModelSerializers
    ├── urls.py             # App-level DRF DefaultRouter
    ├── views.py            # ModelViewSets (IsAuthenticatedOrReadOnly)
    └── tests.py            # Automated test suite
```

---

## Quick Start Guide

### 1. Prerequisites
Ensure you have Python 3.12+ installed.

### 2. Activate Virtual Environment & Install Dependencies
```powershell
# Windows (PowerShell)
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Run Database Migrations
```powershell
python manage.py makemigrations content
python manage.py migrate
```

### 4. Create an Admin Superuser
Create an administrator account to log into the Django Admin panel:
```powershell
python manage.py createsuperuser
```
*(Enter your desired username, email, and password when prompted)*

### 5. Start the Development Server
```powershell
python manage.py runserver
```
The backend will be running at: **`http://localhost:8000`**

---

## How to Manually Test the Backend

### 1. Testing via Django Admin Dashboard
1. Open your browser and navigate to: **`http://localhost:8000/admin/`**
2. Log in using the superuser credentials created in Step 4.
3. You will see the **Content Management System** section with 4 modules:
   - **Gallery Items** (`/admin/content/galleryitem/`)
   - **Startups** (`/admin/content/startup/`)
   - **News Updates** (`/admin/content/newsupdate/`)
   - **Team Members** (`/admin/content/teammember/`)
4. Click **"Add"** on any model, upload an image, fill in text fields, and click **"Save"**.
5. Notice the **inline thumbnail preview** in the table view and detail view.

---

### 2. Testing via DRF Browsable API
Django REST Framework includes an interactive UI for exploring API endpoints directly in your browser:
- **API Root:** [http://localhost:8000/api/](http://localhost:8000/api/)
- **Gallery Endpoint:** [http://localhost:8000/api/gallery/](http://localhost:8000/api/gallery/)
- **Startups Endpoint:** [http://localhost:8000/api/startups/](http://localhost:8000/api/startups/)
- **News Endpoint:** [http://localhost:8000/api/news/](http://localhost:8000/api/news/)
- **Team Endpoint:** [http://localhost:8000/api/team/](http://localhost:8000/api/team/)
- **Filtered Team Endpoint:** [http://localhost:8000/api/team/?category=mentor](http://localhost:8000/api/team/?category=mentor)

---

### 3. Testing via cURL / Postman

#### Fetch Gallery Items (GET)
```bash
curl -X GET http://127.0.0.1:8000/api/gallery/
```

#### Filter Team Members by Category (GET)
```bash
curl -X GET "http://127.0.0.1:8000/api/team/?category=mentor"
```

#### Create Item with Image (Authenticated POST)
```bash
curl -X POST http://127.0.0.1:8000/api/gallery/ \
  -u admin_username:password123 \
  -F "subtext=Annual Tech Fest" \
  -F "image=@/path/to/local/image.jpg"
```

---

## API Endpoints Reference

All endpoints support pagination (20 items/page by default) and return standard DRF paginated responses.

| Method | Endpoint | Description | Query Parameters |
|---|---|---|---|
| `GET` | `/api/gallery/` | List gallery images (ordered by newest first) | `?page=1` |
| `GET` | `/api/gallery/<id>/` | Retrieve specific gallery item | - |
| `GET` | `/api/startups/` | List startups | `?page=1` |
| `GET` | `/api/startups/<id>/` | Retrieve specific startup | - |
| `GET` | `/api/news/` | List news updates (ordered by newest first) | `?page=1` |
| `GET` | `/api/news/<id>/` | Retrieve specific news article | - |
| `GET` | `/api/team/` | List team members | `?page=1`, `?category=<choice>` |
| `GET` | `/api/team/<id>/` | Retrieve specific team member | - |

### Team Member Category Values:
- `mentor` &rarr; International Mentor
- `team` &rarr; AIC Team
- `governor` &rarr; Board of Governors

### Sample JSON Response (`GET /api/team/`)
```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Dr. Evelyn Vance",
      "role": "Chief AI Mentor",
      "category": "mentor",
      "category_display": "International Mentor",
      "photo": "http://localhost:8000/media/team/mentor_sample.png",
      "bio": "Expert in deep neural architectures and incubation programs."
    }
  ]
}
```

---

## Frontend Integration Guide (React / Next.js)

### 1. CORS Configuration
By default, the backend allows origins listed in `CORS_ALLOWED_ORIGINS`.
If your frontend runs on a different port (e.g. `http://localhost:5173` for Vite), update `cms_backend/settings.py` or your `.env` file:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
]
```

---

### 2. React Example Component

Here is a complete React example component demonstrating fetching and displaying data:

```jsx
import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:8000/api';

export function TeamSection() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTeamMembers(selectedCategory);
  }, [selectedCategory]);

  const fetchTeamMembers = async (category) => {
    setLoading(true);
    try {
      const url = category === 'all' 
        ? `${API_BASE_URL}/team/` 
        : `${API_BASE_URL}/team/?category=${category}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      
      // DRF paginated responses put records in data.results
      setTeamMembers(data.results || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2>Our Leadership & Mentors</h2>

      {/* Category Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['all', 'mentor', 'team', 'governor'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: selectedCategory === cat ? '2px solid #2563eb' : '1px solid #ccc',
              backgroundColor: selectedCategory === cat ? '#eff6ff' : '#fff',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading && <p>Loading team members...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {/* Team Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
        {teamMembers.map((member) => (
          <div key={member.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            {member.photo ? (
              <img
                src={member.photo}
                alt={member.name}
                style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 1rem' }}
              />
            ) : (
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: '#e2e8f0', margin: '0 auto 1rem' }} />
            )}
            <h3 style={{ margin: '0.5rem 0 0.25rem' }}>{member.name}</h3>
            <p style={{ color: '#4b5563', margin: '0 0 0.5rem', fontWeight: '500' }}>{member.role}</p>
            <span style={{ fontSize: '0.75rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px' }}>
              {member.category_display}
            </span>
            {member.bio && <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.75rem' }}>{member.bio}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
```

---

### 3. Handling Media / Image URLs in Frontend
- DRF returns full absolute URLs (e.g. `http://localhost:8000/media/gallery/photo.jpg`) when `request` context is present.
- In production, when running behind a reverse proxy (e.g., Nginx) or CDN, media URLs can be configured to point to your cloud storage bucket (AWS S3, Cloudinary) or domain path directly.

---

## Running with Docker

You can run the entire backend with PostgreSQL database using Docker:

```bash
# 1. Build and run containers
docker-compose up --build

# 2. Run migrations inside the web container
docker-compose exec web python manage.py migrate

# 3. Create superuser
docker-compose exec web python manage.py createsuperuser
```
The service will be available at `http://localhost:8000`.

---

## Running Automated Tests

Run the full automated test suite anytime:
```powershell
python manage.py test content
```

To run with verbose output:
```powershell
python manage.py test content -v 2
```
