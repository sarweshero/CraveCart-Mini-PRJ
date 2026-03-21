# CraveCart Backend — Django REST Framework

> Complete backend API for the CraveCart food ordering platform.

---

## Quick Start

```bash
# 1. Clone and enter directory
cd cravecart-backend

# 2. Create virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy and configure environment
cp .env.example .env
# Edit .env with your actual values (DB, Gemini key, SMTP, etc.)

# 5. Apply database migrations
python manage.py migrate

# 6. Create initial data (cuisine categories, a demo hotel + customer)
python manage.py seed_data

# 7. Create superuser (admin panel access)
python manage.py createsuperuser

# 8. Run development server
python manage.py runserver 8000

# 9. In a second terminal — start Celery worker
celery -A config worker -l info

# 10. In a third terminal — start Celery beat (scheduled tasks)
celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

The API is now live at `http://localhost:8000`.
Admin panel: `http://localhost:8000/admin/`

---

## Architecture

```
cravecart-backend/
├── config/
│   ├── settings/
│   │   ├── base.py         # Shared settings
│   │   ├── dev.py          # Development overrides
│   │   └── prod.py         # Production overrides (security, S3, Sentry)
│   ├── urls.py             # Root URL router
│   ├── celery.py           # Celery app config
│   └── wsgi.py
│
├── apps/
│   ├── accounts/           # Custom User, AuthToken, Address
│   ├── restaurants/        # Restaurant, MenuCategory, MenuItem, Coupon
│   ├── orders/             # Cart, CartItem, Order
│   ├── reviews/            # Review, AIResponse + Gemini integration
│   ├── notifications/      # EmailRecord, batched SMTP dispatch
│   └── ai_templates/       # Per-hotel AI prompt templates
│
├── utils/
│   ├── pagination.py       # StandardPagination
│   ├── permissions.py      # IsCustomer, IsHotelAdmin, IsProfileComplete
│   └── exceptions.py       # Custom DRF exception handler
│
├── manage.py
├── requirements.txt
└── .env.example
```

---

## API Reference

### Authentication

All protected endpoints require:
```
Authorization: Token <access_token>
```

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register/` | Create customer or hotel_admin account |
| `POST` | `/api/auth/login/` | Login → returns `token` + `refresh_token` |
| `POST` | `/api/auth/token/refresh/` | Refresh access token (30-day refresh window) |
| `POST` | `/api/auth/logout/` | Revoke current token |
| `GET`  | `/api/auth/me/` | Current user profile |
| `PATCH`| `/api/auth/me/` | Update profile |
| `POST` | `/api/auth/complete-profile/` | Required post-registration step |
| `GET`  | `/api/auth/google/` | Redirect to Google OAuth |
| `GET`  | `/api/auth/google/callback/` | OAuth callback → issues token |
| `POST` | `/api/auth/addresses/` | Add delivery address |
| `PATCH`| `/api/auth/addresses/<pk>/` | Update address |
| `DELETE`| `/api/auth/delete-account/` | Deactivate or permanently delete account |

### Customer APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/restaurants/` | List restaurants (with filters: city, cuisine, is_open, sort_by) |
| `GET` | `/api/restaurants/featured/` | Featured restaurants for home page |
| `GET` | `/api/restaurants/<id>/` | Restaurant detail + full menu |
| `GET` | `/api/categories/` | Food category list |
| `GET` | `/api/search/?q=biryani` | Search restaurants and dishes |
| `GET` | `/api/coupons/` | Available coupons |
| `GET` | `/api/cart/` | Get current cart |
| `POST`| `/api/cart/add/` | Add item to cart |
| `PATCH`| `/api/cart/items/<id>/` | Update cart item quantity |
| `DELETE`| `/api/cart/items/<id>/` | Remove cart item |
| `POST`| `/api/cart/apply-coupon/` | Apply coupon code |
| `POST`| `/api/cart/remove-coupon/` | Remove applied coupon |
| `GET` | `/api/orders/` | Customer's order history |
| `POST`| `/api/orders/` | Place new order |
| `GET` | `/api/orders/<id>/` | Order detail with tracking timeline |
| `POST`| `/api/orders/<id>/cancel/` | Cancel order |
| `POST`| `/api/reviews/` | Submit review (triggers AI pipeline) |
| `GET` | `/api/reviews/<id>/ai-response/` | Poll for AI response status |

### Hotel Portal APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/hotel/auth/login/` | Hotel admin login |
| `GET`  | `/api/hotel/dashboard/stats/` | Dashboard stats (today/week/month) |
| `GET`  | `/api/hotel/orders/` | All orders for this restaurant |
| `PATCH`| `/api/hotel/orders/<id>/status/` | Advance order status |
| `GET`  | `/api/hotel/reviews/` | All reviews for this restaurant |
| `POST` | `/api/hotel/reviews/<id>/generate-ai-response/` | Generate AI response |
| `POST` | `/api/hotel/reviews/<id>/send-response/` | Send response email to customer |
| `GET`  | `/api/hotel/ai-templates/` | List AI templates |
| `POST` | `/api/hotel/ai-templates/` | Create template |
| `PATCH`| `/api/hotel/ai-templates/<id>/` | Update template |
| `DELETE`| `/api/hotel/ai-templates/<id>/` | Delete template |
| `POST` | `/api/hotel/ai-templates/<id>/set-active/` | Set active template |
| `GET`  | `/api/hotel/menu/` | Full menu with availability |
| `PATCH`| `/api/hotel/menu/items/<id>/` | Update menu item |
| `PATCH`| `/api/hotel/menu/items/<id>/toggle/` | Toggle availability |

---

## AI Review Response Pipeline

This is the core novelty. Here's the complete flow:

```
1. Customer submits review
   POST /api/reviews/ → ReviewCreateView

2. Review is saved to database

3. Celery task fired (async):
   generate_and_send_ai_response.delay(review_id)

4. Task calls apps/reviews/ai_service.py:
   a. Loads hotel's active AITemplate (prompt_instructions, tone)
   b. Builds rich Gemini prompt with:
      - Restaurant context (name, cuisine, city)
      - Customer name and review text
      - Star rating
      - Tone instructions from template
   c. Calls google-generativeai (gemini-1.5-flash)
   d. Returns personalized response text (80-160 words)

5. AIResponse record saved to DB

6. EmailService queues two emails:
   - TO: customer (review.customer.email)
   - CC: hotel owner (review.restaurant.owner.email)
   
7. Celery beat (every 5 min) flushes EmailRecord queue via SMTP

8. Frontend polls GET /api/reviews/<id>/ai-response/ every 3s
   until generation_status == "completed"

9. AI response displayed on order detail page
```

### Gemini Prompt Structure

```python
system_prompt = f"""
You are the AI representative for {restaurant.name}...

TONE INSTRUCTIONS:
{template.prompt_instructions}   # Hotel-customizable

CUSTOMER REVIEW:
- Rating: {review.rating}/5
- Review: "{review.comment}"

Rules:
- Address customer by first name
- Reference specific dishes mentioned
- 80-160 words
- End with invitation to return
- 1-2 emojis max
"""
```

---

## Token Authentication

Custom expirable token system (no JWT complexity):

```python
# Access token: 1 day
# Refresh token: 30 days (configurable in settings)

# Login response:
{
  "token": "abc123...",           # Access token (1 day)
  "refresh_token": "xyz789...",   # Refresh token (30 days)
  "expires_in": 2592000,          # Seconds until refresh expires
  "user": { ... }
}

# Refresh:
POST /api/auth/token/refresh/
{ "refresh_token": "xyz789..." }
→ New access + refresh token pair (old pair revoked)
```

---

## Account Deletion

Two-mode deletion system:

| Type | Behavior |
|------|----------|
| `temporary` | `is_active=False`. Account reactivates automatically on next login. |
| `permanent` | Scheduled for deletion after 30 days (configurable). Celery task runs daily at 3 AM to execute deletions. Farewell email sent before data is wiped. |

---

## Email Batching System

Instead of sending emails inline (blocking the request), all emails go through a batch queue:

1. `EmailService.*()` creates an `EmailRecord` (status=`queued`)
2. Celery beat task `flush_email_batch` runs **every 5 minutes**
3. Fetches up to 100 queued records and sends via SMTP
4. Updates status to `sent` or `failed`
5. Failed records are retried on next flush cycle

This prevents SMTP timeouts from blocking API responses and enables retry logic.

---

## Database Schema

```
users               auth_tokens         addresses
restaurants         menu_categories     menu_items
carts               cart_items          orders
reviews             ai_responses        ai_templates
email_records       cuisine_categories  coupons
```

---

## Deployment (Railway + Supabase)

```bash
# 1. Set all env vars in Railway dashboard

# 2. Add Procfile:
echo 'web: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
worker: celery -A config worker -l info
beat: celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler' > Procfile

# 3. Set Django settings module:
DJANGO_SETTINGS_MODULE=config.settings.prod

# 4. Run migrations on deploy:
python manage.py migrate && python manage.py collectstatic --noinput
```

---

## Management Commands

```bash
# Seed initial data (cuisine categories + demo accounts)
python manage.py seed_data

# Manually flush email queue
python manage.py flush_emails

# Cleanup expired tokens
python manage.py cleanup_tokens
```

---

## Connecting Frontend to Backend

In both Next.js apps, change one line in `src/lib/api.ts`:

```typescript
// Currently using mock data:
const API_MODE: "mock" | "live" = "mock";

// Switch to real backend:
const API_MODE: "mock" | "live" = "live";
const BASE_URL = "http://localhost:8000";  // or production URL
```

All API calls already use the correct endpoint paths — no other changes needed.
