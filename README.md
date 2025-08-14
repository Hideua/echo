# Echo API (Vercel + Supabase)

Minimal serverless API for Echo: recipients, messages, deliveries + cron worker that sends emails via Resend.

## Endpoints

- `GET /api/health` — health check
- `GET /api/recipients` — list recipients
- `POST /api/recipients` — create recipient: `{ email, name? }`
- `GET /api/messages?recipient_id=...&limit=...` — list messages
- `POST /api/messages` — create message: `{ recipient_id, title, content, deliver_at }`
- `GET /api/deliveries?status=pending&since=...&limit=...` — list deliveries
- `GET /api/worker/check-deliveries` — cron worker (also accepts `POST`). Requires `Authorization: Bearer $CRON_SECRET` if set.

## Env

See `.env.example`. Required:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional (email):
- `RESEND_API_KEY`
- `FROM_EMAIL` — e.g. `Echo <no-reply@your-domain.com>`

Worker auth:
- `CRON_SECRET` — any strong secret; Vercel Cron should call with header `Authorization: Bearer $CRON_SECRET`

CORS:
- `CORS_ORIGIN` — domain allowed, or `*`

## Deploy

- Push to GitHub → Import to Vercel (Node 18)
- Add env vars from `.env.example`
- Ensure cron in `vercel.json`:
```json
{
  "crons": [{ "path": "/api/worker/check-deliveries", "schedule": "*/2 * * * *" }]
}
```
