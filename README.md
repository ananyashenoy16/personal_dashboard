# My Little Space — Personal Life Dashboard

A pastel, Pinterest-inspired personal dashboard built with React + Vite, Express, MongoDB Atlas, and Mongoose. The layout includes Home, Habit Tracker, Journal, Work Tracker, Period Tracker, and DSA Tracker. Mobile styles target narrow screens such as the Samsung Galaxy S25, and the site includes a web app manifest so it can be added to the phone's Home screen after HTTPS deployment.

## What is connected in this version

- Express API with MongoDB Atlas connection.
- Email/password registration and sign-in. Passwords are hashed with bcrypt.
- Server-side session JWT stored in an HttpOnly cookie; frontend requests include credentials.
- Optional Google sign-in endpoint and UI, enabled with Google OAuth client IDs.
- User-scoped cloud storage for habits, habit logs, journal entries, work logs, cycle records, and DSA entries.
- Browser-local data can be imported into an account at sign-in by checking the optional import checkbox.
- Mobile drawer navigation, touch-sized controls, responsive forms/cards, horizontally scrollable tables, safe-area spacing, and PWA manifest.

## 1. Create a MongoDB Atlas database

1. Create a free cluster at https://www.mongodb.com/atlas/database.
2. Create a database user and a strong password.
3. In **Network Access**, allow your development IP. Avoid `0.0.0.0/0` for a private production database unless you understand the exposure and have compensating controls.
4. Choose **Connect → Drivers → Node.js** and copy the connection string.
5. Replace the username, password, and cluster host in the connection string. URL-encode special characters in the database password.

## 2. Configure the backend

In a terminal:

```bash
cd server
npm install
```

Copy `server/.env.example` to `server/.env` and fill in:

```env
MONGODB_URI=mongodb+srv://YOUR_DB_USER:YOUR_DB_PASSWORD@YOUR_CLUSTER.mongodb.net/personal_life_dashboard?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
GOOGLE_CLIENT_ID=
NODE_ENV=development
```

Generate a secret locally if needed with Node:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Start the API:

```bash
npm run dev
```

The API listens on `http://localhost:4000`. Open `http://localhost:4000/api/health`; it should return JSON with `database: "connected"`.

## 3. Configure and run the frontend

Open a second terminal:

```bash
cd client
npm install
```

Copy `client/.env.example` to `client/.env`. For local development, keep:

```env
VITE_API_URL=http://localhost:4000
VITE_GOOGLE_CLIENT_ID=
```

Start React:

```bash
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`. Create an account and test a habit or work item. Check MongoDB Atlas **Browse Collections** to see the `users` and `userdatas` collections. Each user's data is scoped to their authenticated account.

## 4. Enable Google sign-in (optional)

1. In Google Cloud Console, configure an OAuth consent screen and create an **OAuth Client ID → Web application**.
2. Add `http://localhost:5173` to **Authorized JavaScript origins** for local testing.
3. Put the same client ID in both `server/.env` (`GOOGLE_CLIENT_ID`) and `client/.env` (`VITE_GOOGLE_CLIENT_ID`).
4. Restart both servers. For production, add your actual HTTPS website origin and use the deployed API URL; never commit environment files.

## 5. Open it on your Samsung Galaxy S25

### While testing on your local Wi-Fi

1. Make sure the laptop and phone are on the same trusted Wi-Fi network.
2. Find your laptop's local IPv4 address (Windows: run `ipconfig` and look for the Wi-Fi IPv4 address).
3. Temporarily set `VITE_API_URL=http://YOUR_LAPTOP_IP:4000` in `client/.env` and set `CLIENT_ORIGIN=http://YOUR_LAPTOP_IP:5173` in `server/.env`.
4. Restart both dev servers. Visit `http://YOUR_LAPTOP_IP:5173` on the phone. Your firewall may ask you to allow Node.js on your private network.
5. Restore local-only environment values when you finish testing.

Local HTTP testing is only for a trusted development network. For normal phone access anywhere, deploy the frontend and API to HTTPS hosting and use the deployed API URL. Update the API's `CLIENT_ORIGIN` to the exact deployed frontend origin. The frontend and API should be configured so the browser can send the HttpOnly session cookie with credentialed requests. If hosting them on unrelated sites, cookie `SameSite` settings may need adjustment; preferably use a same-site deployment.

### Install it like an app

After the frontend is deployed over HTTPS, open its URL in Chrome on the S25 → tap **⋮** → **Add to Home screen** or **Install app** (wording depends on Chrome). The manifest supplies the app name, theme, and icon. This is a responsive web app, not a native Android APK.

## Data and privacy notes

- Real MongoDB connection and cloud sync work only after you add your own Atlas URI and run/deploy the API. This ZIP cannot connect to your private Atlas cluster without credentials.
- The app stores compressed journal photos as data URLs inside journal data documents for this starter. This is suitable for light testing, not a long-term photo-storage architecture. Before keeping lots of personal photos, move them to private object storage with signed URLs and size limits.
- Do not commit `.env` files or share your Atlas password. Use HTTPS in production, restrict Atlas network access, and set a strong `JWT_SECRET`.
- Period/journal records are private account data, but this is still a starter implementation and has not had a formal security audit. Do not use it as a production medical-record system.
- Local storage remains as a browser cache/import source. If you already have browser data, tick **Import the data currently saved in this browser** when you first sign in to migrate it to an empty account. Only do this on your own device/account.
- There is no password-reset/email-verification flow yet. Google sign-in requires the optional configuration above.

## Main structure

```text
personal-life-dashboard/
  client/  # React + Vite UI, auth screen, responsive CSS, API client
  server/  # Express API, MongoDB models, auth and user data routes
```
