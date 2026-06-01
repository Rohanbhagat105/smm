# Deploy Proxy to Railway — Step by Step Guide

## What you need
- GitHub account (free) → github.com
- Railway account (free) → railway.app

---

## Step 1 — Put the proxy files on GitHub

1. Go to **github.com** → click **New repository**
2. Name it: `smm-proxy`
3. Set it to **Private** (your API key will be here)
4. Click **Create repository**
5. Upload these two files from the `railway-proxy` folder:
   - `proxy.js`
   - `package.json`

---

## Step 2 — Deploy to Railway

1. Go to **railway.app** → Sign up with GitHub
2. Click **New Project**
3. Click **Deploy from GitHub repo**
4. Select your `smm-proxy` repository
5. Railway auto-detects Node.js and starts deploying
6. Wait ~60 seconds — you'll see **"Active"** in green

---

## Step 3 — Get your Railway URL

1. In Railway, click your project
2. Click **Settings** → **Domains**
3. Click **Generate Domain**
4. You'll get a URL like:
   ```
   smm-proxy-production.up.railway.app
   ```

---

## Step 4 — Set environment variable (IMPORTANT for security)

1. In Railway → **Variables** tab
2. Add this variable:
   ```
   ALLOWED_ORIGIN = https://tubular-youtiao-50c94ef.netlify.app
   ```
   (Replace with your real Netlify URL if you add a custom domain later)

---

## Step 5 — Update dashboard.html

Open `dashboard.html` and find this line near the top of the script:

```js
const PROXY_URL = 'https://YOUR-APP.up.railway.app/proxy';
```

Replace `YOUR-APP` with your actual Railway subdomain:

```js
const PROXY_URL = 'https://smm-proxy-production.up.railway.app/proxy';
```

---

## Step 6 — Redeploy to Netlify

1. Go to your **Netlify dashboard**
2. Drag and drop your updated `dashboard.html`
3. Netlify redeploys in ~10 seconds

---

## Step 7 — Test it

1. Open your Netlify site
2. Look at the top-right corner of the dashboard
3. You should see **"proxy online"** in green
4. Create an order and run it — no more "Failed to fetch"!

---

## How it flows after deployment

```
Your Browser (Netlify)
        ↓  fetch POST /proxy
Railway Server (proxy.js)
        ↓  http POST (server-side, no CORS)
YoYoMedia API
        ↓  JSON response
Railway → Netlify → Your Dashboard
```

---

## Costs

| Service | Cost |
|---|---|
| Netlify (dashboard hosting) | Free forever |
| Railway (proxy server) | Free $5 credit/month — enough for light use |
| Total | **$0/month** for normal usage |

Railway's free tier gives you 500 hours/month which is more than enough
unless you're running campaigns 24/7.
