# School Management System

Multi-tenant school management (students, classes, attendance, exams and report cards, fees, timetable, parent / teacher / accountant logins).
Built with Next.js 16, React 19 and Postgres (Supabase). Deploys to Vercel.

## 1. Set up the database (Supabase)

1. Create a project at https://supabase.com. Pick the region closest to your users and save the database password.
2. Nothing else to do: the app creates the shared tables (`schools`, `users`, `login_attempts`) by itself the first time it connects to an empty database, and every school gets **its own set of tables** (a separate Postgres schema called `school_<id>`: students, classes, attendance, fees, ...) the moment it registers. See `lib/db.js`; the SQL is in `supabase/migrations/20260101000000_init.sql` (shared) and `supabase/school_schema.sql` (per school). If you change either SQL file, regenerate `lib/schema.js` from them.
3. Click **Connect** at the top of the dashboard and copy the **Transaction pooler** connection string (port `6543`).
   Replace `[YOUR-PASSWORD]` with your database password. This is your `DATABASE_URL`.

## 2. Run it on your computer

```bash
npm install
cp .env.example .env.local      # then fill in the values (see below)
npm run db:owner                # optional: the owner login is also created automatically if SUPERADMIN_PASSWORD is set
npm run dev                     # http://localhost:3000
```

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Supabase transaction pooler string from step 1 |
| `JWT_SECRET` | Long random text that signs login cookies. Make one with `openssl rand -base64 48` |
| `APP_URL` | Public address of the site, no trailing slash (`http://localhost:3000` locally) |
| `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` | Platform owner login (password: at least 10 characters). Used by `npm run db:owner`; the email also receives "new school" alerts |
| `SMTP_*`, `MAIL_FROM` | Optional email alerts. Without them emails are skipped |

## 3. Put it on GitHub

```bash
git init
git add .
git commit -m "School management system"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

`.env.local` is ignored by git; never commit real passwords. Check `git status` shows no `.env` file before you push.

## 4. Deploy on Vercel

1. Vercel dashboard > **Add New > Project** > import the GitHub repository.
2. Under **Environment Variables** add: `DATABASE_URL`, `JWT_SECRET`, `APP_URL` (your final site address, for example `https://your-school.vercel.app` or your own domain), `SUPERADMIN_EMAIL`, and the optional `SMTP_*` values. (`SUPERADMIN_PASSWORD` is only needed on your computer for `npm run db:owner`.)
3. Deploy. In **Project Settings > Functions** set the region closest to your Supabase region (fewer milliseconds per query).
4. Open `https://<your-site>/api/health`. `{"ok":true}` means the site can reach the database.
5. Run `npm run db:owner` once from your computer (the owner is stored in the database, so this works for the live site too).
6. Sign in at `/login` with the owner email and password, then approve schools at `/platform`.

If you change `APP_URL` or any variable later, redeploy so it takes effect.

## How it works

- **Home page:** a school registers with an email and password and stays pending until the platform owner approves it. Each school's data lives in its own tables (schema `school_<id>`), and the app only ever points a signed-in user at their own school's schema.
- **Staff:** teachers and accountants join with the school code and wait for the school admin to approve them. Teacher logins: Teachers > Edit. Parent logins: Students > Edit. Accountants: Accountants page.
- **Import:** Students > Import from Excel (`.xlsx` or `.csv` with Name and Class columns).
- **Database access** goes through `lib/db.js` only. Queries use `?` placeholders and are always parameterised.

## Production notes

- **Backups:** Supabase's free plan has no point-in-time recovery and pauses projects after a week without activity. For a real school use a paid plan (daily backups) and enable the backup add-ons you need.
- **Keys:** this app does not use Supabase's `anon` or `service_role` keys. Never put them in the project. If your database password leaks, reset it in Supabase and update `DATABASE_URL`.
- **Sign-in protection:** after 10 wrong passwords for one email (or 30 from one address) in 15 minutes sign-in is blocked for 15 minutes.
- **Cookies** are `httpOnly`, `SameSite=lax` and `Secure` in production (use https; Vercel does).
- **Connections:** the app keeps at most 3 database connections per server instance (`DB_POOL_MAX`). Supabase's transaction pooler shares them, so this is safe on Vercel.
