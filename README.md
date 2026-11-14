# ⛏️ Minecraft "All Items" Vanilla Survival Co-op Tracker

A clean, fast, and responsive real-time multiplayer web app designed to track a **"Collect Every Item in Vanilla Survival Minecraft"** challenge co-op simultaneously with friends on a second monitor while playing.

---

## ✨ Features

* **📦 Complete 1,420 Items Catalog:** Bundled statically from `minecraft_all_items_checklist.md` into `src/data/itemsData.js` across all 21 categories with exact rarity tiers (`Common`, `Uncommon`, `Rare`, `Epic`, `Legendary`).
* **⚡ Supabase Realtime Sync:** Live instant updates when any player checks, unchecks, or claims an item—no page refresh required.
* **💾 Local-First Fallback:** Works immediately in local storage mode if Supabase credentials are not yet configured.
* **🔒 Frictionless Auth:** Single shared password (`VITE_SITE_PASSWORD`) + Minecraft display name prompt with header quick-switch.
* **📊 Top Dashboard:** Real-time progress bar (`X / 1420`), completion percentage, rarity breakdown mini-gauges, and player leaderboard.
* **🔍 Sticky Filter & Search Toolbar:**
  * Instant search by item name with clear button
  * Category dropdown (all 21 categories with category completion counters)
  * Multi-select rarity toggle pills
  * Status filter (`All`, `Remaining`, `Completed`, `Claimed by Me`)
* **🏆 Dedicated Completed Section (Trophy Room):** Chronological log of secured items, who found them, and when.
* **🎯 Pick a Random Target:** 1-click modal to roll a random uncompleted & unclaimed item respecting current filters.
* **🏹 Hunting / Claim Toggle:** Claim an item to mark you are currently hunting it to prevent duplicate player effort.
* **📖 Quick Minecraft Wiki Lookup:** 1-click external link to crafting recipes, mob drop rates, and biomes on `minecraft.wiki`.
* **↩️ Undo Toast Notification:** Instant undo toast on check/uncheck to prevent accidental clicks.

---

## 🚀 Quick Setup Guide

### 1. Free Supabase Database Setup (Takes ~2 minutes)

1. Sign up / log into [Supabase](https://supabase.com/) (100% free tier).
2. Click **New Project**, choose a name (e.g., `minecraft-tracker`) and a database password.
3. Once the project is ready, click **SQL Editor** in the left sidebar.
4. Open [supabase_setup.sql](file:///home/calvin/Games/minecraft/supabase_setup.sql) from this project, paste its contents into the SQL editor, and click **Run**:

```sql
-- 1. Create table for item progress
CREATE TABLE IF NOT EXISTS public.minecraft_item_progress (
  item_id TEXT PRIMARY KEY,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_by TEXT,
  completed_at TIMESTAMPTZ,
  claimed_by TEXT,
  claimed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.minecraft_item_progress ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow public read and write access for authorized tracker players
CREATE POLICY "Allow public all access on minecraft_item_progress" 
  ON public.minecraft_item_progress 
  FOR ALL 
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Enable Supabase Realtime broadcast for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.minecraft_item_progress;
```

5. Go to **Project Settings** (gear icon) > **API**:
   * Copy the **Project URL**
   * Copy the **anon public key**

---

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Fill in your credentials:

```ini
# Shared password you and your friend enter to access the site
VITE_SITE_PASSWORD=your_custom_password

# Supabase Credentials
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 3. Local Development

Install dependencies and start the local development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 🔄 Adding or Updating Items (Future Game Updates)

If a Minecraft update drops (e.g. 1.21.4 Pale Garden / Creaking, 1.22) or you find any missing item, you can add them seamlessly in 2 seconds:

1. Open `minecraft_all_items_checklist.md` and add your item under any category:
   ```markdown
   * [ ] Resin Clump `[Common]`
   * [ ] Creaking Heart `[Rare]`
   ```
2. Run the update script:
   ```bash
   npm run update-items
   ```

**Important:** Because all progress is saved by item ID, adding, editing, or reordering items **will NEVER wipe or alter your existing collected progress**! Existing items stay checked or claimed.

---

### 4. Deploying for You & Your Friend

#### Option A: Deploy to Vercel (Recommended, Free)
1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import your GitHub repository.
4. Under **Environment Variables**, add:
   * `VITE_SITE_PASSWORD`: your shared site password
   * `VITE_SUPABASE_URL`: your Supabase Project URL
   * `VITE_SUPABASE_ANON_KEY`: your Supabase Anon Key
5. Click **Deploy**. Vercel will build and deploy your app with a free HTTPS URL to share with your friend!

#### Option B: Deploy to Netlify (Free)
1. Push your repository to GitHub.
2. Go to [Netlify](https://www.netlify.com/) and click **Add new site** > **Import an existing project**.
3. Select your repository. Build settings are auto-detected (`npm run build` / `dist`).
4. Under **Environment variables**, set `VITE_SITE_PASSWORD`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`.
5. Click **Deploy**.

---

## 📁 Project Structure

```
├── src/
│   ├── components/
│   │   ├── AuthModal.jsx          # Site password & display name entry / user switcher
│   │   ├── CategorySection.jsx    # Collapsible category accordion with progress
│   │   ├── CompletedView.jsx      # Dedicated "Completed" trophy room & player log
│   │   ├── FilterBar.jsx          # Search, category, rarity pills, status filters
│   │   ├── Header.jsx             # Top dashboard, progress bar, tier gauges, leaderboard
│   │   ├── ItemCard.jsx           # Item row with checkbox, claim hunt, wiki link
│   │   ├── RandomItemModal.jsx    # "Pick a Random Target" modal
│   │   └── Toast.jsx              # Undo action notification toast
│   ├── context/
│   │   ├── AuthContext.jsx        # Auth state & localStorage username handler
│   │   └── ItemsContext.jsx       # Realtime sync, optimistic updates, and filters
│   ├── data/
│   │   └── itemsData.js           # 1,420 items bundled directly (read-only)
│   ├── lib/
│   │   └── supabase.js            # Supabase client & connection validator
│   ├── App.jsx                    # Root app layout
│   ├── index.css                  # Tailwind styles & sleek dark theme
│   └── main.jsx                   # React DOM root
├── .env.example                   # Environment variable template
├── index.html                     # HTML shell
├── package.json                   # Dependencies & scripts
├── supabase_setup.sql             # 1-click database schema & realtime configuration
├── tailwind.config.js             # Tailwind CSS theme
└── vite.config.js                 # Vite bundler configuration
```
