# Earned Screen Waitlist

Frontend is React + Vite.
Backend is AWS Lambda (`lambda/waitlist.mjs`) + DynamoDB via SAM (`template.yaml`).

## Frontend setup
Copy env file and run:

```bash
cp .env.example .env
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Frontend production build
```bash
npm run build
```

`VITE_WAITLIST_API_URL` is read from `.env.production` during build.

## Lambda deploy (SAM)
Build and deploy the backend:

```bash
npm run sam:build
npm run sam:deploy
```

Or first-time guided deploy:

```bash
sam deploy --guided
```

## Environment files
- `.env`: local dev only. Never commit secrets.
- `.env.production`: build-time frontend config for production (safe if it only contains public API URLs).
- `samconfig.toml`: SAM deploy defaults (stack name/region/options), not credentials.
