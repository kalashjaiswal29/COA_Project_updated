# AttendAI — Production Deployment Guide
### Render (Node.js + Python) & Vercel (React)

---

## ⚠️ Pre-Flight Security Warning

Your current `.env` files contain **real secrets** (MongoDB URI, Cloudinary keys, JWT secret). Before pushing to GitHub:
1. Add `.env` to **both** `/server/.gitignore` and `/python-cv/.gitignore` (already done ✅)
2. **Rotate** the exposed `INTERNAL_API_KEY` — the one in your local `.env` is now in this chat log.
3. Never commit `.env` files. You paste these values directly into Render's dashboard.

---

## Part 1 — Environment Variable Reference

### `/server/.env` — Node.js Backend (Render Service #1)

| Key | Example Value | Where to Get It |
|-----|--------------|-----------------|
| `PORT` | *(leave blank — set by Render)* | **Do NOT set this in Render.** Render injects `PORT` automatically. Your code already handles it with `process.env.PORT \|\| 5000` ✅ |
| `MONGO_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/attendai?retryWrites=true&w=majority` | **MongoDB Atlas** → Your Cluster → `Connect` → `Drivers` → Copy the connection string. Replace `<password>` with your DB user password. Append `?appName=COA` if needed. |
| `JWT_SECRET` | `9f1a6a066c4fe5a527a...` | Already generated ✅. This is your existing value. Keep it, just paste into Render. |
| `JWT_EXPIRES_IN` | `7d` | Your choice. Keep `7d`. |
| `CLIENT_URL` | `https://attend-ai.vercel.app` | **Vercel Dashboard** → Your project → `Domains` tab. Copy the `https://` URL. No trailing slash. |
| `INTERNAL_API_KEY` | `generate-a-new-one-now` | **You generate this.** Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` in your terminal. Must be **identical** in both services. |
| `CLOUDINARY_CLOUD_NAME` | `dmnv6twov` | **Cloudinary Dashboard** → Top of page, "Cloud Name". Already in your `.env` ✅ |
| `CLOUDINARY_API_KEY` | `937325548194921` | **Cloudinary Dashboard** → Settings → Access Keys. Already in your `.env` ✅ |
| `CLOUDINARY_API_SECRET` | `4KQTGbuxdVQNmPNiu17a2l1AMXc` | **Cloudinary Dashboard** → Settings → Access Keys. Already in your `.env` ✅ |
| `PYTHON_CV_URL` | `https://attendai-python.onrender.com` | **Render Dashboard** → Your Python service → Copy the `.onrender.com` URL. Set this AFTER deploying Python service. |

> [!IMPORTANT]
> `PYTHON_CV_URL` is your Node.js service's way of calling the Python service. It currently reads `http://localhost:8000` which will **break in production**. Update it to the live Render URL.

---

### `/python-cv/.env` — FastAPI Service (Render Service #2)

| Key | Example Value | Where to Get It |
|-----|--------------|-----------------|
| `PORT` | *(leave blank — set by Render)* | **Do NOT set this.** Render injects it. Your startup command will use `$PORT`. |
| `NODE_SERVER_URL` | `https://attendai-server.onrender.com` | **Render Dashboard** → Your Node.js service → Copy the `.onrender.com` URL. Set this AFTER deploying Node.js service. |
| `INTERNAL_API_KEY` | *(same value as server)* | **Must be byte-for-byte identical** to the value you set in the Node.js service. |
| `CLOUDINARY_CLOUD_NAME` | `dmnv6twov` | Same as server. |
| `CLOUDINARY_API_KEY` | `937325548194921` | Same as server. |
| `CLOUDINARY_API_SECRET` | `4KQTGbuxdVQNmPNiu17a2l1AMXc` | Same as server. |

---

### `/client/.env` — React Frontend (Vercel)

| Key | Example Value | Where to Get It |
|-----|--------------|-----------------|
| `VITE_API_URL` | `https://attendai-server.onrender.com` | **Render Dashboard** → Node.js service URL. No trailing slash. |
| `VITE_PYTHON_CV_URL` | `https://attendai-python.onrender.com` | **Render Dashboard** → Python service URL. |

> [!NOTE]
> In Vercel, set these under **Project → Settings → Environment Variables**. All Vite env vars must start with `VITE_` to be exposed to the browser bundle.

---

## Part 2 — Production Code Fixes

### Fix 1: `server/server.js` — CORS (Multi-Origin Support)

Your current CORS only allows one origin. For production, you may need to allow both your Vercel URL and localhost during testing. Replace the CORS block:

```javascript
// ── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,           // e.g. https://attend-ai.vercel.app
  "http://localhost:5173",           // local dev
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. Render health checks, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  })
);

// Socket.io CORS — update this block too
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});
```

The `app.listen` block is **already correct** for Render ✅:
```javascript
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀  Server running on port ${PORT}`);
    // IMPORTANT: Don't log "http://localhost" in production — misleading
  });
});
```

---

### Fix 2: `python-cv/main.py` — Uvicorn Render Startup

Your `main.py` has **no `__main__` block**. Render's start command must call uvicorn directly. Add this to the **bottom** of `main.py`:

```python
# ---------------------------------------------------------------------------
# Entrypoint — Render injects PORT via environment variable
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))   # Render sets PORT dynamically
    uvicorn.run(
        "main:app",
        host="0.0.0.0",   # CRITICAL: must bind to 0.0.0.0, not 127.0.0.1
        port=port,
        log_level="info",
        # workers=1 is fine for Render free tier (single-core)
    )
```

Then set the **Render Start Command** for the Python service to:
```
python main.py
```

> [!WARNING]
> Using `host="127.0.0.1"` will make Render's health checks fail and the service will be killed. Always use `host="0.0.0.0"` in containerized environments.

---

### Fix 3: `python-cv/main.py` — Read `NODE_SERVER_URL` Correctly

Your `face_engine.start()` call passes `NODE_SERVER_URL`. Make sure it's read **after** `load_dotenv()`. Your current code is correct ✅, but add a startup log to confirm:

```python
load_dotenv()

NODE_SERVER_URL = os.getenv("NODE_SERVER_URL", "http://localhost:5000")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"🔗 Connecting to Node.js backend at: {NODE_SERVER_URL}")
    face_engine.start(NODE_SERVER_URL)
    yield
    logger.info("🛑 CV service shutting down.")
```

---

## Part 3 — First-Time Deployment Sequence

### Phase 0: Pre-Deploy Checklist (Local)

```bash
# 1. Generate a NEW Internal API Key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# → Copy this. Update BOTH .env files locally. You'll paste into Render too.

# 2. Test your Node.js server starts without errors
cd server && node server.js

# 3. Test your Python service starts
cd python-cv && python main.py

# 4. Ensure your git repo is clean (no .env files committed)
git status   # .env files should NOT appear here
```

---

### Phase 1: Deploy Node.js to Render

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo → Select the repo
3. Configure:
   - **Name**: `attendai-server`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free
4. **Environment Variables** — click "Add Environment Variable" for each:
   ```
   MONGO_URI          = mongodb+srv://...your Atlas URI...
   JWT_SECRET         = your-jwt-secret
   JWT_EXPIRES_IN     = 7d
   CLIENT_URL         = https://YOUR-APP.vercel.app   ← come back and update this
   INTERNAL_API_KEY   = your-generated-hex-key
   PYTHON_CV_URL      = https://attendai-python.onrender.com  ← update after step 2
   CLOUDINARY_CLOUD_NAME = dmnv6twov
   CLOUDINARY_API_KEY    = 937325548194921
   CLOUDINARY_API_SECRET = 4KQTGbuxdVQNmPNiu17a2l1AMXc
   ```
5. Click **Deploy**. Wait for the build to succeed.
6. **Copy the service URL**: `https://attendai-server.onrender.com`

---

### Phase 2: Deploy Python FastAPI to Render

#### Handling OpenCV/Dlib on Render

> [!IMPORTANT]
> **Your `requirements.txt` is already using `opencv-python-headless`** ✅ — this is the correct package for a headless server (no display). `opencv-python` will **fail** on Render because it depends on GUI libraries. Do **not** change this.

If you ever need `dlib` (for face_recognition), add a **build script** because dlib requires cmake:

```
# render.yaml build command alternative:
apt-get install -y cmake libopenblas-dev liblapack-dev && pip install -r requirements.txt
```

But based on your current `requirements.txt`, you do **not** have `dlib` — your current setup should build fine.

**Your final `requirements.txt` for production:**
```
fastapi
uvicorn[standard]
python-multipart
opencv-python-headless
face-recognition      ← ADD if face_engine.py uses it
requests
python-dotenv
Pillow
httpx
numpy                 ← ADD explicitly (prevents version conflicts)
```

**Render Setup:**
1. **New → Web Service** → Same repo
2. Configure:
   - **Name**: `attendai-python`
   - **Root Directory**: `python-cv`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python main.py`
3. **Environment Variables**:
   ```
   NODE_SERVER_URL    = https://attendai-server.onrender.com
   INTERNAL_API_KEY   = (same key as Node.js service)
   CLOUDINARY_CLOUD_NAME = dmnv6twov
   CLOUDINARY_API_KEY    = 937325548194921
   CLOUDINARY_API_SECRET = 4KQTGbuxdVQNmPNiu17a2l1AMXc
   ```
4. Deploy. Copy the URL: `https://attendai-python.onrender.com`

---

### Phase 3: Update Cross-References

Go back to the **Node.js service on Render** → Environment → update:
```
PYTHON_CV_URL = https://attendai-python.onrender.com
```
Render will auto-redeploy on env var change.

---

### Phase 4: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → Import repo
2. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. **Environment Variables**:
   ```
   VITE_API_URL        = https://attendai-server.onrender.com
   VITE_PYTHON_CV_URL  = https://attendai-python.onrender.com
   ```
4. Deploy. Copy URL: `https://attend-ai.vercel.app`

Go back to **Node.js Render service** → update:
```
CLIENT_URL = https://attend-ai.vercel.app
```

---

### Phase 5: Verify the "Handshake" is Working

Once both services are live, run this **one-liner** in your terminal:

```bash
# Replace with YOUR actual URLs and key
curl -X GET "https://attendai-server.onrender.com/api/students/list" \
  -H "x-internal-api-key: YOUR_INTERNAL_API_KEY_HERE"
```

**Expected response** ✅:
```json
[{ "entryNumber": "2021CSB001", "faceImageUrl": "https://res.cloudinary.com/..." }, ...]
```

**If you get 401 Unauthorized** → The `INTERNAL_API_KEY` in one or both services is wrong. Double-check for spaces or quote characters in the Render env var field.

**If you get 503 / Connection Refused** → The Node.js service is sleeping (see below).

Also check the Python service health endpoint:
```bash
curl https://attendai-python.onrender.com/health
# Expected: {"status":"ok","service":"python-cv"}
```

---

### Phase 6: Solving Render Free Tier "Sleep" Issue

Render free services **spin down after 15 minutes of inactivity**. The first request after sleep takes ~30 seconds (cold start). Here are solutions ranked by difficulty:

#### Option A: UptimeRobot (Free — Recommended)
1. Go to [uptimerobot.com](https://uptimerobot.com) → Free account
2. **New Monitor** → HTTP(s)
3. Add both URLs with a ping every **5 minutes**:
   - `https://attendai-server.onrender.com/`  (returns `{"message":"Attendance API is running ✅"}`)
   - `https://attendai-python.onrender.com/health`
4. This keeps both services warm 24/7 at no cost.

#### Option B: Self-Ping from Node.js
Add to `server.js` (runs every 14 minutes to prevent sleep):

```javascript
// Keep-alive self-ping — only in production
if (process.env.NODE_ENV === "production") {
  const SELF_URL = process.env.RENDER_EXTERNAL_URL; // Auto-set by Render
  setInterval(async () => {
    try {
      await fetch(`${SELF_URL}/`);
      console.log("💓 Keep-alive ping sent");
    } catch (e) {
      console.warn("Keep-alive ping failed:", e.message);
    }
  }, 14 * 60 * 1000); // 14 minutes
}
```

#### Option C: Upgrade to Render Paid ($7/month)
Paid instances never sleep. Worth it for demo/production use.

> [!TIP]
> `RENDER_EXTERNAL_URL` is an environment variable that Render **automatically** injects into every service — it's the `https://your-service.onrender.com` URL. You don't need to set it manually.

---

## Quick Reference — Final URLs Checklist

| Service | Platform | URL Pattern |
|---------|----------|-------------|
| Node.js Backend | Render | `https://attendai-server.onrender.com` |
| Python CV Service | Render | `https://attendai-python.onrender.com` |
| React Frontend | Vercel | `https://attend-ai.vercel.app` |
| MongoDB | Atlas | (not a URL, it's a connection string in `MONGO_URI`) |
| Images | Cloudinary | `https://res.cloudinary.com/dmnv6twov/...` |

---

## Deployment Order Summary

```
1. Deploy Node.js to Render     → get Node URL
2. Deploy Python to Render      → get Python URL
3. Update PYTHON_CV_URL in Node's Render env
4. Deploy React to Vercel       → get Vercel URL
5. Update CLIENT_URL in Node's Render env
6. Set up UptimeRobot with both Render URLs
7. Test handshake with curl
```
