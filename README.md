# Lux-Modern Renovations — Website

A dark, gold-accented marketing site for Lux-Modern Renovations, a handyman
and remodeling business serving Dayton, Ohio and the Miami Valley metro.

The AI "Project Intake Assistant" chat on the home page is powered by a
small Node/Express server (`server.js`) that proxies requests to the
Anthropic API. **Your Anthropic API key lives only on the server — it is
never sent to the browser.**

## What's new in this version

- Fixed: mobile hamburger menu now actually opens/closes
- Added: a Reviews page with placeholder customer testimonials
- The chat assistant now asks for name, phone, and email before finishing
  a project summary, and automatically **texts you that summary** via
  Twilio
- Visual refresh: gradient gold accents, glassmorphism panels, hover
  glows, and scroll-triggered fade-in animations throughout
- The home page chat window now has a subtle pulsing glow to draw the
  visitor's eye to it

## What's in here

```
lux-modern-site/
├── server.js              Node/Express server: serves the site + /api/chat proxy
├── package.json            Server dependencies (just Express)
├── .env.example            Template showing the env var the server expects
├── index.html              Home page — hero + live AI project intake assistant
├── services.html           Full services list
├── gallery.html             Project photo gallery (placeholder thumbnails)
├── blog.html                Local-SEO journal/blog page + sample articles
├── reviews.html             Customer reviews page (placeholder reviews)
├── about.html                About / service area page
├── contact.html              Contact form + phone/area info
├── css/style.css              All shared styles (design tokens, layout, components)
├── js/
│   ├── main.js                 Nav active-state highlighting
│   ├── quote-assistant.js      Chat logic — calls /api/chat (our server), not Anthropic directly
│   └── blog-admin.js            Placeholder "Generate today's article" button
└── images/                       Drop real project photos here later
```

## Step 1 — Upload the files to your GitHub repo

From inside this unzipped `lux-modern-site` folder:

**Option A — GitHub's web uploader (no terminal needed)**
1. Go to your repo on github.com.
2. Click **Add file → Upload files**.
3. Drag in *everything inside* `lux-modern-site/` (not the folder itself —
   its contents: `server.js`, `package.json`, `index.html`, the `css/`
   folder, the `js/` folder, etc.) so they land at the repo root.
4. Scroll down, add a commit message like "Initial site upload," and click
   **Commit changes**.

**Option B — git command line**
```bash
cd path/to/lux-modern-site
git init
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git add .
git commit -m "Initial site upload"
git branch -M main
git push -u origin main
```
If the repo already has a README or other files, you may need
`git pull origin main --allow-unrelated-histories` before pushing.

**Either way**, confirm `node_modules/` and `.env` are NOT in the repo —
`.gitignore` already excludes both, but double-check after uploading. Railway
installs dependencies itself from `package.json`; you never upload
`node_modules`.

## Step 2 — Deploy on Railway

1. Go to https://railway.app and sign in.
2. **New Project → Deploy from GitHub repo**, select this repo.
3. Railway will detect `package.json` and automatically run `npm install`
   and `npm start` (which runs `node server.js`). No build configuration
   needed.
4. Go to your new service's **Variables** tab and add:
   ```
   ANTHROPIC_API_KEY = sk-ant-your-real-key-here
   ```
   Get a key at https://console.anthropic.com/settings/keys if you don't
   have one yet.
5. To enable the "text me the lead" feature, also add these four
   variables (see "Texting yourself new leads" below for where to get
   them):
   ```
   TWILIO_ACCOUNT_SID = ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN  = xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_FROM_NUMBER = +1XXXXXXXXXX
   OWNER_PHONE_NUMBER = +13264670354
   ```
6. Railway will redeploy automatically after you save variables. Once
   it's live, open the generated `*.up.railway.app` URL — your site should
   load, and the home page chat should respond for real.
7. Optional: under **Settings → Networking**, add a custom domain once
   you're ready to point your real domain at it.

## Texting yourself new leads (Twilio setup)

The chat assistant now collects the visitor's name, phone, and email
before producing its final project summary. When that summary is ready,
the server automatically texts it to you.

1. Create a free account at https://www.twilio.com (free trial credit is
   enough to test; a real number costs about $1/month plus a small
   per-message fee after that).
2. From the Twilio Console dashboard, copy your **Account SID** and
   **Auth Token** — these go into `TWILIO_ACCOUNT_SID` and
   `TWILIO_AUTH_TOKEN`.
3. Buy a phone number under **Phone Numbers → Buy a number** (any number
   with SMS capability works). That number, in `+1XXXXXXXXXX` format,
   becomes `TWILIO_FROM_NUMBER`.
4. Set `OWNER_PHONE_NUMBER` to your real cell number in the same
   `+1XXXXXXXXXX` format — that's where the lead texts will arrive.
5. **Trial accounts**: Twilio trial numbers can only text phone numbers
   you've manually "verified" in the Twilio Console under
   **Phone Numbers → Verified Caller IDs** — verify your own cell there
   first, or texts will silently fail. Upgrading to a paid Twilio account
   removes this restriction.

If any of the four Twilio variables are missing, the server doesn't crash
— it just logs the summary to the Railway deploy logs instead of texting
it, so you can keep testing the chat without Twilio configured yet.

## Why this setup is safe

The browser only ever calls `/api/chat` on your own server. `server.js`
holds `ANTHROPIC_API_KEY` (and the Twilio credentials) as server-side
environment variables — none of them ever appear in any file the browser
downloads, so viewing page source or dev tools won't expose them. This is
the proper setup for a public, live site (unlike a GitHub-Pages-only
approach, where the key would have had to live in browser-visible JS).

The server also includes a basic per-IP rate limit (20 messages/minute) on
`/api/chat` so a bot or runaway script can't rack up unexpected API costs.

## Running it locally (optional, before deploying)

```bash
cd lux-modern-site
npm install
cp .env.example .env        # then edit .env and paste in your real key
node server.js
```
Visit `http://localhost:3000`. The `.env` file is git-ignored and is only
for local testing — Railway uses its own Variables tab instead, not this
file.

## What to give feedback on

This is still an early pass — structure, flow, and content placement. Good
things to react to once it's live:
- Does the dark/gold "craftsman's drafting table" feel match what you
  pictured?
- Is the home page hero (headline + live chat side-by-side) working, or
  would you rather the chat be a popup/modal instead?
- Are the 8 services, sample blog posts, and gallery captions close to your
  real offerings, or do they need to change?
- Anything missing from contact/about that customers would expect?
- How does the live AI chat feel once it's actually responding for real?

Send over your notes once you've used it and I'll refine.
