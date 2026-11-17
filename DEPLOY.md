# Publishing Vendora Africa

Two stages: put the backend online, then build the app and send it to the stores.

## 1. Backend on Render

Before you start, have these ready:

| What | Where to get it |
|---|---|
| `MONGODB_URI` | MongoDB Atlas → Connect → Drivers (`mongodb+srv://...`) |
| `ADMIN_PASSWORD` | Choose one, 10+ characters |
| `PAYSTACK_SECRET_KEY` | Paystack dashboard → Settings → API Keys (`sk_live_...` for real money) |
| `CLOUDINARY_URL` | cloudinary.com (free plan) → Dashboard → API environment variable |

Steps:

1. Push this repository to GitHub.
2. render.com → **New → Blueprint** → choose the repository. Render reads `render.yaml` and asks for the values above. `JWT_SECRET` is generated for you.
3. MongoDB Atlas → **Network Access** → add `0.0.0.0/0` (Render's addresses change), and keep a strong database password.
4. Wait for the deploy, then open `https://<your-service>.onrender.com/api/health`. It should show `"database": "connected"`.
5. Optional: Render → Settings → **Custom Domain**, e.g. `api.vendora.africa`.
6. Paystack dashboard → Settings → API Keys & Webhooks → Webhook URL:
   `https://<your-api-address>/api/payments/webhook`

The server checks its settings when it starts. If `JWT_SECRET` or `MONGODB_URI` is missing or unsafe, it stops and the Render log says exactly what to fix.

## 2. App builds with EAS

One-time setup, in `mobile-app/`:

```
npm install -g eas-cli
eas login
eas init
eas env:create --name EXPO_PUBLIC_API_URL --value https://<your-api-address> --environment production --environment preview --visibility plaintext
```

A build stops with a clear message if `EXPO_PUBLIC_API_URL` is missing or not `https://`, so the app can never ship pointing at a laptop.

**Test build (Android APK, install it straight on phones):**

```
eas build --platform android --profile preview
```

**Store builds:**

```
eas build --platform android --profile production
eas build --platform ios --profile production
eas submit --platform android
eas submit --platform ios
```

Build numbers go up automatically on every production build.

## 3. Store accounts and listings

- **Google Play Console**: $25 once. New personal accounts must run a closed test with at least 12 testers for 14 days before the app can go public.
- **Apple Developer Program**: $99 a year. Review usually takes 1–3 days.
- Both stores need: a privacy policy web link, at least 2 phone screenshots, a description, the content-rating questionnaire, and the data form (Google "Data safety" / Apple "App Privacy"). The app collects names, phone numbers, emails and photos.
- Fill the stores with real businesses before review. Empty or test-looking apps are often rejected.

## Releasing an update

Build and submit again with the same commands; the build number goes up by itself. Change `version` in `mobile-app/app.json` (e.g. `1.0.1`) when you want the stores to show a new version number.
