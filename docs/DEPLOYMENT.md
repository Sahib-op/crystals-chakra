# Production deployment runbook

Production runs on **Vercel** (static frontend), **Render** (API) and **Supabase** (PostgreSQL and owner Auth). Local development stays local: the isolated PostgreSQL cluster in ignored `work/`, the loopback-only studio fixture and the preview shop. Nothing in this repository creates accounts, buys plans or deploys by itself. Decisions referenced as D1–D17 are in [LAUNCH-PLAN.md §6](LAUNCH-PLAN.md#6-decision-register--needed-before-launch).

## 0. Before you start

- `npm run launch:check -- --strict` passes (business facts confirmed in `shared/business.js`, real portrait, confirmed prices).
- Accounts exist and are paid at the needed tier (D10): Vercel, Render Starter or higher, Supabase Pro (daily backups) in the Mumbai region (D11).
- The domain is decided (D9). The examples below use `crystalschakra.com` for the site and `api.crystalschakra.com` for the API.

## 1. Supabase (database and Auth)

1. Create the project in **Mumbai (ap-south-1)**. Enable MFA (TOTP) in Auth settings; disable public sign-ups. Set the Site URL to the frontend origin.
2. In **Connect**, copy the **session pooler** connection (port 5432) for migrations. Port 6543 is transaction mode and is refused by the migration script.
3. Download the project's CA certificate (Database settings → SSL).
4. Apply migrations from a trusted machine, never from CI:

   ```sh
   MIGRATION_DATABASE_URL='postgresql://postgres.<ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres' \
   DATABASE_CA_CERT_FILE=/path/to/supabase-ca.crt npm run db:migrate -- --seed-catalogue
   ```

   `--seed-catalogue` is only for the first run. Do not run `tests/database/bootstrap.sql` on Supabase.

5. Create the restricted runtime login used by the API (SQL editor, as `postgres`):

   ```sql
   create role chakra_api_prod login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls password '<long random password>';
   grant chakra_runtime to chakra_api_prod;
   ```

   The API refuses to start if its login can bypass RLS or has elevated rights.

6. Invite the owner (D12) from Auth → Users, then allowlist them:

   ```sql
   insert into studio.owner_access(user_id) values ('<auth user id>');
   ```

   The owner enrols an authenticator app at first sign-in; studio APIs require AAL2.

## 2. Render (API)

1. New → **Blueprint** → this repository. `render.yaml` creates `crystals-chakra-api` in **Singapore** on the **Starter** plan with auto-deploy off.
2. Upload the Supabase CA as a **Secret File** named `supabase-ca.crt` (mounted at `/etc/secrets/supabase-ca.crt`).
3. Set the `sync: false` variables:

| Variable                   | Value                                                                           |
| -------------------------- | ------------------------------------------------------------------------------- |
| `FRONTEND_URL`             | `https://crystalschakra.com` (exact origin, no trailing slash)                  |
| `DATABASE_URL`             | `chakra_api_prod` login via the session pooler                                  |
| `MIGRATION_DATABASE_URL`   | privileged `postgres` session-pooler URL (used only by the pre-deploy step)     |
| `SUPABASE_URL`             | `https://<ref>.supabase.co`                                                     |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` (public key; never the service-role key)                     |
| `SHOPIFY_STORE_DOMAIN`     | `<store>.myshopify.com` — leave unset to keep the preview shop                  |
| `SHOPIFY_STOREFRONT_TOKEN` | Storefront API token (not an Admin token)                                       |
| `SHOPIFY_CHECKOUT_HOST`    | custom checkout host if the store uses one, e.g. `shop.crystalschakra.com`      |
| `SHOPIFY_WEBHOOK_SECRET`   | the signing key shown under Shopify admin → Settings → Notifications → Webhooks |

4. Deploy. `preDeployCommand` runs migrations first; a failure stops the deploy and keeps the previous version serving.
5. Add the custom domain `api.crystalschakra.com` and verify `https://api.crystalschakra.com/api/ready` returns `{"status":"ready","database":"ok"}`. Point an uptime monitor at `/api/ready`.

## 3. Shopify (shop, payments and order notifications)

1. Shopify Payments is not available to India-based merchants. Connect a gateway inside Shopify (Razorpay, PayU, Cashfree, …) after its KYC (D7). Card and UPI details never touch this site.
2. Create a headless/Storefront channel token with product and cart scopes.
3. Under Settings → Notifications → Webhooks, create JSON webhooks to `https://api.crystalschakra.com/api/webhooks/shopify` for: Order creation, Order update, Order payment, Order cancellation, Order fulfilment. Copy the signing key into `SHOPIFY_WEBHOOK_SECRET`.
4. Send a test notification; it must return 200. The API verifies the HMAC on the raw body, rejects other shops, deduplicates on `X-Shopify-Webhook-Id` and stores only operational order state (no names, emails, phones or addresses).
5. Run a test-mode order end to end, then a cancellation and a refund, and confirm each appears in `commerce.orders`.
6. Add product data with Legal Metrology declarations (D6) before enabling live checkout.

## 4. Vercel (frontend)

1. Import the repository. `vercel.json` sets the Vite framework, `npm run build` (which prerenders `/`, `/shop` and `/policies`), the rewrites and the security headers.
2. Environment variable: `VITE_API_URL=https://api.crystalschakra.com` (public; never put secrets in `VITE_` variables).
3. Add the domain and set it as primary. Vercel provides TLS and HSTS.
4. Content-Security-Policy currently allows `connect-src https://*.onrender.com https://*.supabase.co`. Once the API domain and Supabase project ref are known, narrow it to exactly `https://api.crystalschakra.com https://<ref>.supabase.co`, rebuild, and run `npm run test:e2e` locally against the same headers.
5. Check the live site: security headers on `/`, `/shop`, `/policies`; WhatsApp and call links; welcome screen; studio sign-in with MFA; a WhatsApp link preview showing `og-image.jpg`.

## 5. Operations

- **Backups:** Supabase Pro keeps daily backups for 7 days; add PITR if order volume justifies it. Rehearse a restore into a scratch project before launch and record the result.
- **Rollback:** Vercel and Render keep previous deployments; promote the last good one. Database migrations are forward-only: fix forward with a new migration, never edit an applied one (the runner refuses changed SQL).
- **Secrets:** rotate the runtime password, Storefront token and webhook key in the provider dashboards; never commit them. `.env` and `work/` are git-ignored.
- **Incidents:** the API logs route, status, timing and a request ID, never bodies or query strings. Ask customers for the request ID shown in error messages.
- **Grievances:** acknowledge within 48 hours, resolve within one month (Consumer Protection (E-Commerce) Rules).

## Local stays local

Local commands (`scripts/start-local-postgres.sh`, `npm run db:local:setup`, `npm run dev:api`, `npm run dev:studio-auth`) refuse non-loopback databases and production mode. `npm run preview:prod` serves the production build locally with the same rewrites and headers as Vercel.
