# Ruhuna Hockey — Deployment Guide

This guide describes how to deploy the Ruhuna Hockey web application to production on **Vercel** or **Netlify**.

---

## 1. Prerequisites & Environment Setup

Ensure you have your Supabase project credentials ready:
- **`VITE_SUPABASE_URL`**: Your Supabase project URL (e.g. `https://your-project.supabase.co`).
- **`VITE_SUPABASE_ANON_KEY`**: Your Supabase public anonymous API key (`anon` `public`).

> ⚠️ **CRITICAL SECURITY NOTE:**
> - Never expose or commit the `service_role` secret key!
> - `.env` is git-ignored and must never be pushed to your repository.
> - Public sign-ups **MUST stay disabled** in your Supabase Dashboard (`Authentication` → `Providers` → `Email` → Turn OFF "Allow new users to sign up"). Admin users are invited or created manually in Supabase.

---

## 2. Build Verification

Before deploying, run the production build locally:

```bash
# Typecheck and production bundle build
npm run build

# Lint verification
npm run lint
```

The production output will be generated in the `dist/` directory.

---

## 3. Deploying to Vercel (Recommended)

1. **Import Project**:
   - Push your code to your GitHub/GitLab repository.
   - Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
   - Select your `Ruhuna-Hockey` repository.

2. **Framework & Build Settings**:
   - Framework Preset: **Vite**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Environment Variables**:
   In Vercel project settings, add the following under **Environment Variables**:
   - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-public-key`

4. **SPA Rewrites**:
   - An SPA rewrite configuration is already included in [`vercel.json`](./vercel.json):
     ```json
     {
       "rewrites": [
         {
           "source": "/(.*)",
           "destination": "/"
         }
       ]
     }
     ```

5. Click **Deploy**.

---

## 4. Deploying to Netlify

1. **Import Project**:
   - Log in to [netlify.com](https://netlify.com) and click **"Add new site"** → **"Import an existing project"**.
   - Connect your Git repository.

2. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Environment Variables**:
   Under **Site configuration** → **Environment variables**, set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. **SPA Fallback Redirect**:
   - An SPA redirect rule is already provided in [`public/_redirects`](./public/_redirects):
     ```
     /* /index.html 200
     ```

5. Click **Deploy Site**.

---

## 5. Supabase Auth Configuration (Post-Deployment)

Once your production domain is live (e.g. `https://ruhuna-hockey.vercel.app`):

1. Go to your **Supabase Dashboard**.
2. Navigate to **Authentication** → **URL Configuration**.
3. Set **Site URL** to your production URL:
   ```
   https://ruhuna-hockey.vercel.app
   ```
4. Under **Redirect URLs**, add:
   ```
   https://ruhuna-hockey.vercel.app/*
   https://ruhuna-hockey.vercel.app/login
   ```
5. Navigate to **Authentication** → **Providers** → **Email**:
   - Ensure **"Allow new users to sign up" is OFF** (unchecked).

---

## 6. Storage Bucket Configuration

Ensure your Supabase project contains the public storage bucket named:
- **`hockey-media`** (Public bucket)
- RLS Policies:
  - `SELECT`: Publicly accessible (`true`).
  - `INSERT`, `UPDATE`, `DELETE`: Restricted to authenticated users (`auth.role() = 'authenticated'`).
