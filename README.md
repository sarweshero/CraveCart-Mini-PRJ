# 🍽️ CraveCart — Digital Food Ordering Platform

> **BE Final Year Project** · Full-stack food delivery platform with AI-powered review responses

---

## 🗂 Project Structure

```
cravecart/
├── customer-app/        # Next.js 14 — Customer-facing app (port 3000)
├── hotel-app/           # Next.js 14 — Hotel/Restaurant dashboard (port 3001)
└── README.md
```

---

## ⚡ Quick Start (Frontend only — Mock API)

```bash
# Customer App
cd customer-app
npm install
npm run dev        # http://localhost:3000

# Hotel App (new terminal)
cd hotel-app
npm install
npm run dev        # http://localhost:3001
```

**Demo credentials (Hotel Portal):**
- Email: `admin@muruganidli.com`
- Password: `demo1234`

**Demo credentials (Customer App):**
- Email: `arjun.kumar@gmail.com`
- Password: `demo1234`

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Two Apps)                   │
│                                                          │
│  customer-app (Next.js 14)  hotel-app (Next.js 14)      │
│  Port: 3000                 Port: 3001                   │
│  Customers browse,          Hotels manage orders,        │
│  order, review              menu, AI templates           │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP REST API
┌────────────────────────▼────────────────────────────────┐
│              BACKEND (Django REST Framework)             │
│                   Port: 8000                             │
│                                                          │
│  Auth, Orders, Reviews, AI Response Generation           │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   Supabase/        Google          SMTP
   Postgres         Gemini AI       (Batched Mail)
```

---

## 📱 Customer App — Pages & Features

| Route | Page | Features |
|-------|------|----------|
| `/` | Home | Hero, categories, featured restaurants, AI feature callout |
| `/restaurants` | Restaurant Listing | Search, filters (cuisine, veg, open now, sort), category pills |
| `/restaurants/[id]` | Restaurant Detail | Full menu with categories, add-to-cart, availability badges |
| `/cart` | Cart (Drawer) | Persistent cart, qty update, coupon codes, bill breakdown |
| `/checkout` | Checkout | Address selection, payment method, order summary |
| `/orders` | My Orders | List with live/delivered/cancelled tabs |
| `/orders/[id]` | Order Detail | Live tracking timeline, bill, review + AI response |
| `/login` | Login | Email/password, Google OAuth |
| `/register` | Register | Password strength meter |
| `/complete-profile` | Complete Profile | 2-step: personal info → address (required post-registration) |
| `/profile` | Profile | Edit info, manage addresses, account deletion |

---

## 🏨 Hotel App — Pages & Features

| Route | Page | Features |
|-------|------|----------|
| `/login` | Hotel Login | Email/password, demo credentials pre-filled |
| `/dashboard` | Dashboard | Live stats (today/week/month), recent orders, rating breakdown |
| `/dashboard/orders` | Orders | Kanban-style, status progression buttons, live refresh |
| `/dashboard/reviews` | Reviews & AI | View all reviews, generate AI responses, send email |
| `/dashboard/ai-templates` | AI Templates | Create/edit/delete templates, set active, tone selector |
| `/dashboard/menu` | Menu | Category view, toggle item availability instantly |
| `/dashboard/settings` | Settings | Profile, notifications, deactivate/delete account |

---

## 🤖 The AI Review Feature (Core Novelty)

### Flow Diagram

```
Customer places order
        │
        ▼
Order delivered
        │
        ▼
Customer writes review + rating  ──────────────────────────────┐
        │                                                       │
        ▼                                                       │
POST /api/reviews/                                             │
        │                                                       │
        ▼                                                       │
Django calls Google Gemini API with:                           │
  - Customer's review text                                     │
  - Star rating                                                 │
  - Hotel's active AI template prompt                          │
  - Restaurant context (name, cuisine, heritage)               │
        │                                                       │
        ▼                                                       │
AI generates personalized response                             │
        │                                                       │
        ▼                                                       │
SMTP sends email to customer with CC to hotel ─────────────────┘
        │
        ▼
AI response displayed on order detail page
```

### What makes this different:

| Other apps | CraveCart |
|-----------|-----------|
| Customer submits review → "Thanks!" | Customer submits review → AI analyses tone & rating |
| No personalization | Response references specific dishes mentioned |
| No hotel context | Hotel can set custom AI tone templates |
| No email follow-up | Response is emailed to customer + CC to hotel |
| Static response | Gemini AI crafts unique response per review |

---

## 🔧 Backend Specification (Django REST Framework)

### Tech Stack
- **Framework**: Django 5.0 + Django REST Framework
- **Database**: Supabase (PostgreSQL)
- **Auth**: `django-customtoken` (expirable tokens, 30-day refresh)
- **AI**: `google-generativeai` (Gemini Pro)
- **Email**: Django SMTP (batched via Celery + Redis)
- **OAuth**: `django-allauth` with Google provider

### Django Apps Structure

```
backend/
├── apps/
│   ├── accounts/        # Custom user model, auth endpoints
│   ├── restaurants/     # Restaurant, menu models & APIs
│   ├── orders/          # Order, cart, tracking
│   ├── reviews/         # Review model + AI response generation
│   ├── notifications/   # SMTP email batching
│   └── ai_templates/    # Per-hotel AI prompt templates
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   └── urls.py
└── manage.py
```

### Key Models

```python
# accounts/models.py
class User(AbstractBaseUser):
    email = EmailField(unique=True)
    name = CharField(max_length=100, blank=True)
    phone = CharField(max_length=15, blank=True)
    avatar = URLField(blank=True)
    role = CharField(choices=['customer', 'hotel_admin'])
    is_profile_complete = BooleanField(default=False)
    is_active = BooleanField(default=True)
    deletion_type = CharField(choices=['none','temporary','permanent'], default='none')
    deletion_requested_at = DateTimeField(null=True)

# orders/models.py
class Order(Model):
    id = CharField(primary_key=True)  # Custom ULID
    customer = ForeignKey(User)
    restaurant = ForeignKey(Restaurant)
    status = CharField(choices=ORDER_STATUS_CHOICES)
    items = JSONField()
    subtotal, delivery_fee, discount, taxes, total = DecimalField(...)
    payment_method = CharField()
    payment_status = CharField()
    placed_at = DateTimeField(auto_now_add=True)
    delivered_at = DateTimeField(null=True)

# reviews/models.py
class Review(Model):
    order = OneToOneField(Order)
    customer = ForeignKey(User)
    restaurant = ForeignKey(Restaurant)
    rating = IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = TextField()
    ai_response = OneToOneField('AIResponse', null=True)

class AIResponse(Model):
    review = OneToOneField(Review)
    text = TextField()
    template_used = ForeignKey('AITemplate', null=True)
    generated_at = DateTimeField(auto_now_add=True)
    email_sent = BooleanField(default=False)
    email_sent_at = DateTimeField(null=True)

class AITemplate(Model):
    hotel = ForeignKey(Restaurant)
    name = CharField(max_length=100)
    tone = CharField(choices=['warm','apologetic','professional','custom'])
    prompt_instructions = TextField()
    is_active = BooleanField(default=False)
    usage_count = IntegerField(default=0)
```

### AI Response Generation (reviews/services.py)

```python
import google.generativeai as genai

def generate_ai_review_response(review: Review) -> str:
    template = review.restaurant.ai_templates.filter(is_active=True).first()
    
    system_prompt = f"""
    You are responding to a customer review on behalf of {review.restaurant.name}.
    
    TONE & INSTRUCTIONS:
    {template.prompt_instructions if template else "Respond warmly and professionally."}
    
    RESTAURANT CONTEXT:
    - Name: {review.restaurant.name}
    - Cuisine: {review.restaurant.cuisine_tags}
    
    REVIEW TO RESPOND TO:
    - Customer name: {review.customer.name}
    - Rating: {review.rating}/5 stars
    - Review text: "{review.comment}"
    
    Write a personalized response (100-150 words). Address the customer by name.
    Mention specific dishes or aspects they referenced. End warmly.
    """
    
    model = genai.GenerativeModel('gemini-pro')
    response = model.generate_content(system_prompt)
    return response.text
```

### Auth Endpoints

```
POST /api/auth/register/              → Register new user
POST /api/auth/login/                 → Login (returns token + refresh_token)
POST /api/auth/token/refresh/         → Refresh token (30-day expiry)
GET  /api/auth/google/                → Redirect to Google OAuth
GET  /api/auth/google/callback/       → Google OAuth callback
GET  /api/auth/me/                    → Current user profile
PATCH /api/auth/profile/              → Update profile
POST /api/auth/complete-profile/      → Complete profile after registration
POST /api/auth/logout/                → Logout (revoke token)
DELETE /api/auth/delete-account/      → Delete account (temporary | permanent)
POST /api/auth/addresses/             → Add delivery address
```

### Switching from Mock to Live API

In both apps, change one line in `src/lib/api.ts`:

```typescript
// Before (mock mode)
const API_MODE: "mock" | "live" = "mock";

// After (connect to real backend)
const API_MODE: "mock" | "live" = "live";
const BASE_URL = "http://localhost:8000";  // or your deployed URL
```

Set the backend URL in `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🌍 Environment Variables

### Customer App (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=your_google_client_id
```

### Hotel App (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (`.env`)
```env
SECRET_KEY=your_django_secret_key
DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/postgres
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GEMINI_API_KEY=your_google_gemini_api_key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=noreply@cravecart.com
EMAIL_HOST_PASSWORD=your_app_password
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
```

---

## 📦 Deployment

| Service | Platform |
|---------|----------|
| Customer App | Vercel |
| Hotel App | Vercel |
| Backend API | Railway / Render |
| Database | Supabase |
| Redis (Celery) | Upstash |

---

## 🎨 Design System

### Customer App Palette
| Token | Value | Usage |
|-------|-------|-------|
| `bg` | `#0C0B09` | Page background |
| `bg-card` | `#161410` | Card surfaces |
| `accent` | `#E8A830` | Amber — CTA, brand |
| `text` | `#F5EDD8` | Primary text |
| `text-muted` | `#BFB49A` | Secondary text |

### Hotel App Palette
| Token | Value | Usage |
|-------|-------|-------|
| `bg` | `#09090B` | Page background |
| `bg-card` | `#111113` | Card surfaces |
| `accent` | `#7C3AED` | Violet — brand, CTAs |
| `text` | `#FAFAFA` | Primary text |

### Fonts
- **Display**: Fraunces (Italic Serif) — headlines, branding
- **Body (Customer)**: Plus Jakarta Sans
- **Body (Hotel)**: DM Sans

---

*Built with ❤️ as BE Final Year Project — CraveCart*
