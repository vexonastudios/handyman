# PostCraft — Setup Guide

This guide walks you through setting up your Google Cloud project and Gemini API key so PostCraft can automatically post to your Google Business Profile.

---

## Step 1: Get a Gemini API Key (5 minutes — Free)

1. Go to [https://aistudio.google.com](https://aistudio.google.com)
2. Sign in with your Google account
3. Click **"Get API key"** in the top right
4. Click **"Create API key"** → Select a project (or create new)
5. Copy the key that looks like `AIzaSy...`
6. Open `.env.local` and paste it after `GEMINI_API_KEY=`

---

## Step 2: Create a Google Cloud Project (10 minutes)

### 2a. Create the Project
1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown at the top → **"New Project"**
3. Name it something like `PostCraft GBP` → Click **Create**

### 2b. Enable the Business Profile API
1. In your new project, go to **APIs & Services → Library**
2. Search for **"My Business Account Management API"** → Enable it
3. Search for **"My Business Business Information API"** → Enable it
4. Search for **"My Business Lodging API"** is NOT needed, skip

### 2c. Create OAuth Credentials
1. Go to **APIs & Services → Credentials**
2. Click **"+ Create Credentials" → "OAuth client ID"**
3. If prompted, configure the **OAuth consent screen** first:
   - User type: **External**
   - App name: `PostCraft`
   - User support email: your email
   - Add your email to **Test users**
   - Scopes: add `https://www.googleapis.com/auth/business.manage`
4. Back at Create OAuth client ID:
   - Application type: **Web application**
   - Name: `PostCraft`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
   - Click **Create**
5. Copy the **Client ID** and **Client Secret**
6. Open `.env.local` and fill in:
   ```
   GOOGLE_CLIENT_ID=your-client-id-here
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   ```

---

## Step 3: Start the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Step 4: Connect Everything in Settings

1. Go to **Settings** (⚙️ in sidebar)
2. Paste your **Gemini API Key**
3. Click **"Connect Google Account"** → sign in and approve permissions
4. Select your **Business Account** and **Location**
5. Set your **Daily Post Time**
6. Click **Save Settings**

---

## Step 5: Upload Your First Photos!

1. Go to **Upload Photo** (📷 in sidebar)
2. Select or drag in a job photo
3. Click **"Generate Description with Gemini"**
4. Review and edit the description if needed
5. Click **"Add to Queue"**

Repeat for as many photos as you want. PostCraft will publish **one per day** at your chosen time.

---

## Troubleshooting

| Issue | Solution |
|---|---|
| "Gemini API key not configured" | Add your key in Settings |
| "Google account not connected" | Click "Connect Google Account" in Settings |
| "No GBP location configured" | Select your business location in Settings |
| Port 3001 instead of 3000 | Another app is using 3000 — access at http://localhost:3001 |
| Photos show as "pending" on Google | Normal — Google reviews photos before they go live |

---

## Running Permanently (Optional)

To keep PostCraft running in the background on Windows, you can use **PM2**:

```bash
npm install -g pm2
pm2 start "npm run dev" --name postcraft
pm2 startup
pm2 save
```
