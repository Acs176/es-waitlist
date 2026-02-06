# Earned Screen Waitlist (React + Vite + Express + DynamoDB)

This app now uses:
- React + Vite for the frontend
- Express for API endpoints
- DynamoDB for waitlist storage

## 1) DynamoDB table
Create a table with:
- Partition key: `email` (String)

## 2) Configure environment
Copy `.env.example` to `.env` and set values:
- `AWS_REGION` (example: `us-east-1`)
- `WAITLIST_TABLE` (your table name)
- `PORT` (optional, default `3000`)
- `ALLOWED_ORIGINS` (optional, comma-separated frontend origins for cross-origin API calls)
- `VITE_WAITLIST_API_URL` (optional absolute API URL for frontend)

Examples:
- Local dev with Vite proxy (recommended): leave `VITE_WAITLIST_API_URL` empty
- Separate frontend domain: `VITE_WAITLIST_API_URL=https://api.example.com/api/waitlist`

Notes:
- Include protocol and port where applicable.
- Do not include trailing slashes in `ALLOWED_ORIGINS`.
- `VITE_WAITLIST_API_URL` must include the full endpoint path, e.g. `http://localhost:3000/api/waitlist`.

## 3) Run (development)
```bash
npm install
npm run dev
```

This starts:
- API on `http://localhost:3000`
- Frontend on `http://localhost:5173`

Vite proxies `/api/*` to the API, so no CORS issues in local dev.

## 4) Run (production-style)
```bash
npm run build
npm start
```

`npm start` serves API and also serves the built frontend from `dist/`.

## API
- `POST /api/waitlist`
- Body: `{ "email": "you@example.com" }`
- Responses:
  - `201` on success
  - `409` if email already exists
  - `400` for invalid email

## Troubleshooting
- If the form shows a submit error, inspect the API directly:
```bash
curl -i -X POST http://localhost:3000/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```
- Common backend errors:
  - `Server is not configured.`: missing `AWS_REGION` or `WAITLIST_TABLE`
  - `DynamoDB table was not found.`: wrong `WAITLIST_TABLE` or region mismatch
  - `AWS credentials are not configured correctly`: set AWS credentials/profile for the API process
