# Connecting CraveCart Frontend to the Real Backend

## Step 1 — Copy the updated API files

```bash
# Customer app
cp frontend-api/customer-api.ts  cravecart/customer-app/src/lib/api.ts

# Hotel app
cp frontend-api/hotel-api.ts     cravecart/hotel-app/src/lib/api.ts
```

## Step 2 — Create .env.local files

```bash
# Customer app
cp frontend-api/customer-env.local  cravecart/customer-app/.env.local

# Hotel app
cp frontend-api/hotel-env.local     cravecart/hotel-app/.env.local
```

## Step 3 — Start the backend

```bash
cd cravecart-backend

# Install deps
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL, GEMINI_API_KEY, EMAIL_HOST_*

# Migrate + seed
python manage.py migrate
python manage.py seed_data

# Start Django
python manage.py runserver 8000

# Start Celery worker (handles AI generation + emails)
celery -A config worker -l info

# Start Celery beat (scheduled tasks — every 5 min email flush)
celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

## Step 4 — Start the frontends

```bash
# Customer app (port 3000)
cd cravecart/customer-app && npm run dev

# Hotel app (port 3001)
cd cravecart/hotel-app && npm run dev
```

---

## What changed between mock and live api.ts

### Customer App
| Change | Old (mock path) | New (live path) |
|--------|----------------|-----------------|
| updateProfile | `PATCH /api/auth/profile/` | `PATCH /api/auth/me/` |
| Added `updateAddress`, `deleteAddress` | — | `PATCH/DELETE /api/auth/addresses/<id>/` |
| Added `cart.clear()` | — | `POST /api/cart/clear/` |
| `cancel()` now accepts reason | no reason | `POST /api/orders/<id>/cancel/` with body |
| Token saved to localStorage on login/register | manual | automatic |
| Auto token refresh on 401 | — | yes (silent, retries once) |
| Session expired event | — | `CustomEvent("cravecart:session-expired")` |

### Hotel App
| Change | Old (mock path) | New (live path) |
|--------|----------------|-----------------|
| `toggleOpen` | `POST /api/hotel/toggle-open/` | `PATCH /api/hotel/dashboard/toggle-open/` |
| `generateAI` / `regenerateAI` | `/regenerate-ai/` | `/generate-ai-response/` |
| `resendEmail` → `sendEmail` | `/resend-email/` | `/send-response/` |
| `toggleAvailability` | `PATCH /items/<id>/` | `PATCH /items/<id>/toggle/` |
| Added `setActive` for templates | missing | `POST /api/hotel/ai-templates/<id>/set-active/` |
| Added `hotelReviewApi.list` params | no filters | `rating`, `has_response`, `page` |
| Added `menuApi.updateItem` | price-only | any menu item fields |
| Token auto-refresh on 401 | — | yes (silent) |
| Session expired event | — | `CustomEvent("cravecart:hotel-session-expired")` |

---

## Handling session expiry in Next.js

Add this to your root layout or a top-level client component:

```tsx
// customer-app/src/components/providers/session-guard.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { clearAuth } = useAuthStore();

  useEffect(() => {
    const handler = () => {
      clearAuth();
      router.push("/login?reason=session_expired");
    };
    window.addEventListener("cravecart:session-expired", handler);
    return () => window.removeEventListener("cravecart:session-expired", handler);
  }, [clearAuth, router]);

  return <>{children}</>;
}
```

For the hotel app, listen to `"cravecart:hotel-session-expired"` instead.

---

## Backend quick health check

```bash
# Should return 200 with list of restaurants
curl http://localhost:8000/api/restaurants/

# Test login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"arjun.kumar@gmail.com","password":"demo1234"}'

# Test hotel login
curl -X POST http://localhost:8000/api/hotel/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@muruganidli.com","password":"demo1234"}'
```
