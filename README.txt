=====================================================
  CESLA BILLING SYSTEM — Node.js + PostgreSQL
  Deploy to Render.com (Free Hosting)
=====================================================

FILES:
  server.js          ← Express + PostgreSQL backend
  package.json       ← Dependencies
  public/
    index.html       ← Frontend (ang billing system)
  .env.example       ← Template for environment vars

=====================================================
  STEP 1 — UPLOAD TO GITHUB
=====================================================

1. Go to https://github.com → Sign in / Sign up
2. Click "New repository"
   - Name: cesla-billing-system
   - Private: ✅ (recommended)
   - Click "Create repository"
3. Upload files:
   - Click "uploading an existing file"
   - Upload: server.js, package.json, .env.example
   - Create folder "public" → upload index.html inside it
4. Click "Commit changes"

=====================================================
  STEP 2 — CREATE DATABASE ON RENDER
=====================================================

1. Go to https://render.com → Sign in / Sign up
2. Click "New +" → "PostgreSQL"
3. Fill in:
   - Name: cesla-billing-db
   - Region: Singapore (closest sa PH)
   - Plan: Free
4. Click "Create Database"
5. Wait ~2 minutes...
6. COPY the "Internal Database URL" (magamit sa Step 3)

=====================================================
  STEP 3 — DEPLOY WEB SERVICE ON RENDER
=====================================================

1. Click "New +" → "Web Service"
2. Connect your GitHub repo (cesla-billing-system)
3. Fill in:
   - Name: cesla-billing
   - Region: Singapore
   - Branch: main
   - Runtime: Node
   - Build Command: npm install
   - Start Command: node server.js
   - Plan: Free
4. Under "Environment Variables":
   - Click "Add Environment Variable"
   - Key:   DATABASE_URL
   - Value: [paste ang Internal Database URL gikan sa Step 2]
   - Key:   NODE_ENV
   - Value: production
5. Click "Create Web Service"
6. Wait 3-5 minutes...
7. Ang URL nimo: https://cesla-billing.onrender.com

=====================================================
  STEP 4 — ACCESS THE SYSTEM
=====================================================

- URL: https://cesla-billing.onrender.com
- Share this URL sa imong colleagues

NOTE: Free plan mag-sleep after 15 minutes of inactivity.
First load after sleep = 30-60 seconds.
Para dili mag-sleep: register sa https://uptimerobot.com
  → Add monitor → HTTP(s) → imong URL → every 14 minutes

=====================================================
  LOCAL TESTING (optional)
=====================================================

1. Install Node.js: https://nodejs.org
2. Install PostgreSQL: https://www.postgresql.org
3. Copy .env.example to .env, fill in DATABASE_URL
4. Run:
   npm install
   node server.js
5. Open: http://localhost:3000

=====================================================
  FREE PLAN LIMITS (Render.com)
=====================================================

Web Service:
  - 750 hours/month (enough for 1 service)
  - Sleeps after 15 min inactivity
  - Auto-wakes on request

PostgreSQL Database:
  - FREE for 90 days only!
  - After 90 days: upgrade to $7/month
  - OR: export data and recreate database

DATA BACKUP:
  - Render Dashboard → Database → "PSQL Command"
  - Run: pg_dump $DATABASE_URL > backup.sql

=====================================================
