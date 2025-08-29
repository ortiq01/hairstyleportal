# hairstyleportal

Simple Node.js/Express app served by PM2 and Nginx Proxy Manager.

## Run locally
- Node.js 18+
- npm install
- npm start (or `node index.js`)
- Visit http://localhost:3008

Endpoints: `/health`, `/info`, and static `/` from `public/`.

## PM2
- pm2 start ecosystem.config.js --env development
- pm2 start ecosystem.config.js --env production
- pm2 save

## Docker (optional)
- docker build -t hairstyleportal:dev .
- docker run -p 3008:3008 hairstyleportal:dev

## CI
A minimal GitHub Actions workflow can be added under `.github/workflows/ci.yml` to run basic checks.
