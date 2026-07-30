# DPPI Inventory — Cloud Sync Setup

The app works fully offline out of the box (everything is saved on the device).
To sync across your iPhone, iPad and Mac, connect it to a free Supabase project.
Takes about 5 minutes, one time.

> Use your **existing Supabase account**, but create a **brand-new project just for
> DPPI** — never reuse the Set Assist project. Projects are fully isolated from each
> other (separate database, users and keys), so nothing is shared between the two apps.

## 1. Create the project
1. Go to <https://supabase.com/dashboard> → sign in with your existing account → **New project**.
2. Name it `dppi-inventory`, pick a region near you (e.g. Central Canada / East US), create it.
3. Wait ~2 minutes while it provisions.

## 2. Run the schema
1. In the Supabase dashboard, open **SQL Editor**.
2. Paste the entire contents of `supabase-schema.sql` (in this folder) and press **Run**.

## 3. Turn on email codes (no passwords)
1. **Authentication → Providers → Email**: make sure Email is enabled.
2. That's it — the app signs people in with a 6-digit code emailed to them.

## 4. Connect the app
1. In Supabase: **Project Settings → API** — copy the **Project URL** and the **anon public** key.
2. In the DPPI app: **Settings → Cloud sync** — paste both, press **Save & Connect**.
3. Sign in with your email and the code it sends you.

The **first person to sign in becomes the owner.** Everyone who signs in after
starts as a read-only *viewer* until you promote them:
**Dashboard → Table Editor → profiles → change their `role`** to
`editor` or `admin` (they can then make changes that sync).

## 5. Other devices
Open the same site on each device, enter the same URL + anon key in Settings
(one time per device), sign in — everything stays in sync automatically,
including gear photos, jobs, invoices and team permissions.

## Hosting the site
Any static host works (GitHub Pages, Netlify, …). Upload this folder as-is.
On iPhone/iPad: open the site in Safari → Share → **Add to Home Screen** and it
installs like a native app. Same on Mac with Safari (File → Add to Dock) or
Chrome (Install).
