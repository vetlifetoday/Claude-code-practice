# VETLIFE CRM — Setup Guide (no coding required)

This guide puts the VETLIFE CRM online so you can sign in from any browser.
It takes about **30–45 minutes**. You'll create two free accounts:

- **Supabase** — stores the data, logins, and uploaded files.
- **Vercel** — runs the website.

You only do this once. After that, every change pushed to GitHub updates the site automatically.

> **Tip:** Keep a private note (a password manager is best) open while you work. You'll copy a few
> values from one website to another. Treat anything labeled **secret** like a bank password.

---

## Before you start

You need:

1. Access to the GitHub repository **vetlifetoday/Claude-code-practice** (you already have it).
2. An email address you'll use as the **first administrator** of the CRM.

---

## Part 1 — Create the database (Supabase)

### 1.1 Create a project

1. Go to **https://supabase.com** and click **Start your project**. Sign up (signing in with GitHub is easiest).
2. Click **New project**.
3. Fill in:
   - **Name:** `vetlife-crm`
   - **Database password:** click **Generate a password**, then **save it in your private note**.
   - **Region:** pick the one closest to you (for Florida, an **East US** region).
4. Click **Create new project** and wait 1–2 minutes until it says the project is ready.

### 1.2 Build the tables (run two SQL files)

You'll copy two files from GitHub and paste them into Supabase. You don't need to understand them.

**Step A — the database structure and security rules (required):**

The folder **`supabase/migrations`** on GitHub holds several `.sql` files. Run **each one, in order**
(their names start with a date, so the list is already in order):

| Order | File |
| --- | --- |
| 1 | `20261007000001_core_schema.sql` |
| 2 | `20261008000001_phase2_sorting.sql` |

For each file:

1. In a new browser tab, open GitHub and go to the repository → folder **`supabase/migrations`** → open the file.
2. Click the **Copy raw file** button (two overlapping squares, top-right of the file).
3. Back in Supabase, click **SQL Editor** in the left menu, then **+ New query** (or a blank query tab).
4. Paste (Ctrl+V / Cmd+V) and click **Run**.
5. You should see **"Success. No rows returned."**
   - If Supabase shows a warning about "destructive operations", that's expected — click **Run this query**.
6. Move on to the next file. **Run each file only once.**

**Step B — the 10 sample contacts (optional, recommended for testing):**

1. In GitHub, open **`supabase/seed.sql`** and click **Copy raw file**.
2. In the SQL Editor, open a **new** query tab, paste, and click **Run**.

> Later, when you start using the CRM for real, you can archive the sample contacts from inside the app.
> They are clearly fictional (emails end in `example.org`, phone numbers use 555).

**Check it worked:** click **Table Editor** in the left menu. You should see tables named
`contacts`, `categories`, `subcategories`, and others. Click `categories` — you should see 11 rows
(Veteran, Military Family, Volunteer, …).

### 1.3 Turn off public sign-ups

Only people you invite should be able to get in.

1. Left menu → **Authentication** → **Sign In / Providers** (sometimes under **Configuration**).
2. Find **Allow new users to sign up** and turn it **OFF**. Click **Save**.
3. On the same page, make sure the **Email** provider is **enabled** (it is by default). Don't turn Email off —
   that's how everyone signs in.

### 1.4 Make sure two-step verification (MFA) is allowed

1. **Authentication** → **Multi-Factor** (or **MFA**).
2. Make sure **TOTP (App Authenticator)** is **enabled**. Save if you changed anything.

### 1.5 Copy your keys

1. Left menu → **Project Settings** (gear icon) → **API Keys**. (On some screens this is under **Connect**.)
2. Copy these three values into your private note:

| What to copy | Where it is | Looks like |
| --- | --- | --- |
| **Project URL** | Project Settings → **Data API** (or the **Connect** button) | `https://abcdefgh.supabase.co` |
| **Publishable key** | API Keys | starts with `sb_publishable_` |
| **Secret key** — **keep private!** | API Keys → click to reveal | starts with `sb_secret_` |

> If you only see keys called **anon** and **service_role**, that's the older naming and works the same:
> use **anon** as the publishable key and **service_role** as the secret key.

---

## Part 2 — Put the website online (Vercel)

### 2.1 Import the project

1. Go to **https://vercel.com** and sign up with **Continue with GitHub**. Choose the free **Hobby** plan.
2. Click **Add New… → Project**.
3. Find **Claude-code-practice** in the list and click **Import**.
   - If you don't see it, click **Adjust GitHub App Permissions** and give Vercel access to that repository.
4. Leave **Framework Preset** as **Next.js** and the other build settings as they are.

### 2.2 Add the environment variables

Still on the import screen, open **Environment Variables** and add these four, one at a time
(name on the left, value on the right — no quotes, no spaces):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase **Project URL** |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your **Publishable key** |
| `SUPABASE_SECRET_KEY` | your **Secret key** |
| `NEXT_PUBLIC_SITE_URL` | `https://placeholder.vercel.app` for now — you'll fix it in step 2.4 |

Click **Deploy**. Wait 1–3 minutes until you see **Congratulations**.

### 2.3 Find your website address

Click **Continue to Dashboard**. Under **Domains** you'll see your address, for example
`claude-code-practice-abc.vercel.app`. Copy it into your note **with** `https://` in front.

### 2.4 Tell Vercel its real address

1. In your Vercel project → **Settings** → **Environment Variables**.
2. Edit `NEXT_PUBLIC_SITE_URL` and set it to your real address, e.g. `https://claude-code-practice-abc.vercel.app`
   (no slash at the end). Save.
3. Go to **Deployments**, click the **⋯** menu on the newest deployment → **Redeploy** → **Redeploy**.

### 2.5 Tell Supabase the website address

Back in Supabase:

1. **Authentication** → **URL Configuration**.
2. **Site URL:** paste your Vercel address (e.g. `https://claude-code-practice-abc.vercel.app`). Save.
3. **Redirect URLs:** click **Add URL** and add your address followed by `/**`,
   e.g. `https://claude-code-practice-abc.vercel.app/**`. Save.

### 2.6 Update the two email templates

The invitation and password-reset emails need to point at your site in a specific way.

1. Supabase → **Authentication** → **Emails** (or **Email Templates**).
2. Open **Invite user**:
   - **Subject:** `You're invited to the VETLIFE CRM`
   - **Body:** in GitHub open **`supabase/templates/invite.html`**, click **Copy raw file**, and paste it in,
     replacing everything that was there. Save.
3. Open **Reset password** (sometimes "Reset Password" or "Recovery"):
   - **Subject:** `Reset your VETLIFE CRM password`
   - **Body:** copy **`supabase/templates/recovery.html`** the same way and paste it in. Save.

---

## Part 3 — Create the first administrator

The **very first account** created automatically becomes the Admin.

1. Supabase → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter **your** email and a strong password. Tick **Auto Confirm User**. Click **Create user**.
3. Open your Vercel address in a browser and sign in with that email and password.
4. You should see **Dashboard, Contacts**, and an **Admin** section (Categories, Users, Archive) on the left.
5. Click your name at the bottom-left → **My account** → enter your name → **Save name**.
6. **Strongly recommended:** on the same page, click **Set up authenticator app** and scan the QR code with
   Google Authenticator, Microsoft Authenticator, or 1Password.

---

## Part 4 — Inviting your team

Go to **Admin → Users**, enter their email, name, and role, and click **Send invite**.
They get an email with a button to set their password.

| Role | Can do |
| --- | --- |
| **Admin** | Everything, including users, categories, archive/restore, and the audit log |
| **Staff** | Add, edit, and view contacts, notes, and files |
| **Viewer** | Look only |

> ### ⚠️ Important: Supabase's built-in email is for testing only
> Supabase's free built-in email service sends only a **few emails per hour**, and usually only to people who
> are **members of your Supabase organization**. So an invitation to a new volunteer may never arrive.
>
> **For testing right now**, add people directly instead: Supabase → **Authentication → Users → Add user →
> Create new user** (tick **Auto Confirm**), give them the password privately, then set their role in the CRM
> under **Admin → Users**. New accounts start as **Viewer**.
>
> **Before real use**, connect a proper email service (for example Resend, which has a free tier):
> Supabase → **Project Settings → Authentication → SMTP Settings** → **Enable custom SMTP**, and enter the
> details from your email provider. Ask Claude for step-by-step help with this when you're ready.

### If someone loses their phone (MFA)
**Admin → Users** → find the person → **Reset MFA**. They can sign in with just their password and set it up again.

### If someone leaves
**Admin → Users** → untick **Active** → **Save**. They are signed out and blocked immediately. Their past work
stays in the audit trail.

---

## Installing updates later

When Claude adds features, two things can happen:

- **Website code changes** are picked up automatically: Vercel redeploys within a few minutes of each update on GitHub.
- **Database changes** arrive as a **new file** in `supabase/migrations`. Claude will tell you the file name.
  Run **only the new file** in the Supabase SQL Editor (same steps as Part 1.2), ideally right after the
  update lands. Never re-run a file you've already run.

| File | Added in | What it does |
| --- | --- | --- |
| `20261007000001_core_schema.sql` | Phase 1 | Tables, security rules, default categories |
| `20261008000001_phase2_sorting.sql` | Phase 2 | Better sorting of the contact list by name |

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Vercel build fails with "Missing environment variable" | Check the four names in **Settings → Environment Variables** are spelled exactly as above, then **Redeploy**. |
| "Invalid login credentials" | Check the email/password. In Supabase → Authentication → Users, make sure the user shows as confirmed. |
| Invite/reset link says "invalid or has expired" | Links last 1 hour and work once. Check step 2.5 (Site URL) and 2.6 (templates), then send a new one. |
| Invite email never arrives | See the **built-in email** warning above. Check spam too. |
| Users page says it "could not load sign-in details" | The `SUPABASE_SECRET_KEY` in Vercel is missing or wrong. Fix it and **Redeploy**. |
| Signed in but see "You don't have access to that page" | Your role doesn't allow that page. An Admin can change it under **Admin → Users**. |
| Contact list shows "column contacts.sort_name does not exist" | The Phase 2 database file hasn't been run yet. Run `20261008000001_phase2_sorting.sql` (see **Installing updates later**). |
| A screen in Supabase or Vercel looks different from this guide | These sites update their menus often. Look for the same words nearby, or send Claude a screenshot. |

---

## Keeping things safe

- Never share the **Secret key** or put it in an email, chat, or document. If it leaks, Supabase →
  **Project Settings → API Keys** lets you create a new one; then update it in Vercel and redeploy.
- Give people the **lowest role** they need.
- Ask every Admin to turn on **two-step verification**.
- Don't record health, medical, or diagnosis information anywhere in the CRM, including notes and uploaded files.
