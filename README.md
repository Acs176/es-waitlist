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
`VITE_BASE_PATH` controls GitHub Pages subpath base (for this repo: `/es-waitlist/`).

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

## Publish on GitHub Pages
This repo includes a workflow at `.github/workflows/deploy-pages.yml` that deploys on push to `main`.

1. Push your changes to `main`.
2. In GitHub repo settings, go to `Settings -> Pages`.
3. Set `Build and deployment` source to `GitHub Actions`.
4. Wait for the `Deploy To GitHub Pages` workflow to complete.

Your site URL will be:
- `https://Acs176.github.io/es-waitlist/`
