> **Project Goal:** Build a clean, fast, and responsive real-time multiplayer web application for my friend and I to track a "Collect Every Item in Vanilla Survival Minecraft" challenge simultaneously.
> **Simplest Possible Auth & Real-Time Statefulness:**
> * **Shared Site Password Auth:** Keep login friction to absolute zero. Instead of user accounts, use a single global site password (e.g., set via an environment variable `VITE_SITE_PASSWORD = "yourpassword"`). When a user opens the app, prompt them for this password once.
> * **Display Name Prompt:** Immediately after entering the site password, prompt them to type a quick display name (e.g., their Minecraft username) so their name attaches to items they check off or claim. Store this in `localStorage` for the session.
> * **Free Database & Real-Time Sync (Supabase):** Use a free Supabase instance. Any time a user checks/unchecks an item, claims an item, or updates progress, sync it instantly to the database and broadcast it in real time to all connected clients using Supabase Realtime channels so my friend and I see updates live without refreshing.
> * Provide clear step-by-step instructions in a `README.md` on how to set up the free Supabase table and configure the environment variables for deployment (e.g., on Vercel or Netlify).
> 
> 
> **Core Data Setup:**
> * Using the attached `minecraft_all_items_checklist.md` file as your complete data source, bundle **every single static item definition (ID, name, category, and rarity tag)** directly into a dedicated read-only data file (`itemsData.js`). Only store user progress/state (completed status, claimed by, completed by, timestamp) in the Supabase database so database reads/writes stay tiny and fast.
> * **Important:** Do not summarize, truncate, or omit any items from the reference file—include all 1,300+ items across every category (`## Category Name`) with their exact rarity (`Common`, `Uncommon`, `Rare`, `Epic`, `Legendary`).
> 
> 
> **Layout & UI Design:**
> * Keep the UI clean, modern, and uncluttered (dark mode by default, inspired by sleek developer tools like Linear or Notion, with subtle Minecraft-inspired color accents for the rarity badges).
> * **Top Dashboard / Header:**
> * Overall progress bar showing total items collected (`X / Total`) and overall completion percentage.
> * Quick breakdown mini-bars or counters for each Rarity tier (`Common`, `Uncommon`, `Rare`, `Epic`, `Legendary`), plus a friendly leaderboard tracking items collected per player.
> * Current user pill showing display name with a quick "Switch User" option.
> 
> 
> * **Sticky Filter & Search Bar:**
> * **Instant Search Input:** Real-time text search by item name (with a quick clear `X` button).
> * **Category Filter:** Dropdown or horizontal scrollable pill selector (`All Categories`, plus each category from the reference list).
> * **Rarity Filter:** Multi-select toggle pills for `Common`, `Uncommon`, `Rare`, `Epic`, and `Legendary` with distinct badge colors.
> * **Status / Player Filter:** Toggle between `All`, `Remaining (Unchecked)`, `Completed`, and `Claimed by Me`.
> 
> 
> * **Main Item View & Completed Section:**
> * Group items under collapsible Category headers that display category-specific progress (e.g., `Potions & Brewing (12/84)`).
> * Ensure the list renders smoothly across 1,300+ items (use clean rendering or pagination per category if needed).
> * **Dedicated "Completed" Section:** Provide a clear tab or view toggle (`Checklist` vs. `Completed`) so we can easily review everything we've checked off (along with who found it) without cluttering the active hunt.
> 
> 
> 
> 
> **Helpful Quality-of-Life Features:**
> * **"Pick a Random Target" Button:** Picks 1 random *uncollected & unclaimed* item (respecting active filters) to help decide what to hunt next.
> * **"Claim / Hunting" Toggle:** A quick button on uncollected items allowing a player to mark an item as *"Hunting"* with their name so you don't duplicate work on the server.
> * **Quick Wiki Lookup:** A subtle external-link icon next to each item that opens its `minecraft.wiki` page in a new tab for crafting recipes or drop rates.
> * **Undo Toast:** When checking or unchecking an item, show a brief toast notification with an "Undo" button in case of accidental clicks.
> 
> 
> **Tech Stack & Constraints:**
> * React (Vite) + Tailwind CSS + Supabase JS Client. Fully responsive for use on a second monitor while playing Minecraft.
> 
>