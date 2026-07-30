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
1. **Authentication → Sign In / Providers → Email**: make sure Email is enabled.
2. **Authentication → Emails (email templates) → Magic Link**: make sure the message
   body includes the one-time code, e.g.:

   ```html
   <h2>Your DPPI sign-in code</h2>
   <p>Enter this code in the app: <b>{{ .Token }}</b></p>
   ```

   (The default template only contains a link — the app uses the 6-digit
   `{{ .Token }}` code instead, which works much better on iPhone home-screen apps.)

## 4. Connect the app
The project URL and public key are already built into the app — on any device,
just open **Settings → Cloud sync → Sign in**, enter your email, and type in the
code it sends you. Done.

The **first person to sign in becomes the owner.**

## Adding people (all in-app)
In the app: **Team → Add Person** — name, email, role and permissions.
Saving records the invite in the cloud, and you can send them a ready-made
invite email. When they sign in with that email, they automatically get exactly
the role and permissions you chose — nothing to do in the Supabase dashboard.

Role presets map to cloud access like this: Owner/Admin and Tech can make
changes that sync; Viewer is read-only everywhere (and by default sees no
pricing at all).

## 5. Other devices
Open <https://kristianwood.github.io/DPPI-inventory/> on each device and sign in —
everything stays in sync automatically, including gear photos, jobs, invoices
and team permissions.

On iPhone/iPad: open the site in Safari → Share → **Add to Home Screen** and it
installs like a native app. Same on Mac with Safari (File → Add to Dock) or
Chrome (Install).
