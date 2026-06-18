# Backend Deployment

This repo is prepared for backend-only CI/CD with GitHub Actions and Docker.

## What Runs Automatically

On every push to `main`, `master`, or `chess-Game-Application-BY-Gautam-Vidhate`, GitHub Actions will:

1. Install backend dependencies with `npm ci`.
2. Build TypeScript with `npm run build`.
3. Build the backend Docker image.
4. Deploy to the server only when deployment secrets are configured.

## Required Server Setup

The deployment server needs:

- Docker
- Docker Compose plugin
- SSH access from GitHub Actions
- An open backend port, usually `5000`

## Required GitHub Secrets

Add these in GitHub:

`Settings -> Secrets and variables -> Actions -> New repository secret`

Required for deployment:

- `DEPLOY_HOST`: server IP or hostname
- `DEPLOY_USER`: SSH username
- `DEPLOY_SSH_KEY`: private SSH key allowed to log in to the server
- `DEPLOY_PATH`: absolute deploy folder, for example `/opt/omenxis`

Optional deployment secret:

- `DEPLOY_PORT`: SSH port, defaults to `22`

Required backend runtime secrets:

- `MONGO_URI`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Recommended backend runtime secrets:

- `PORT`: defaults to `5000`
- `JWT_EXPIRES_IN`: defaults to `7d`
- `ALLOWED_ORIGIN`: frontend URL, or `*` while testing
- `ADMIN_USERNAME`: defaults to `admin`

Firebase secrets, if push notifications are used:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_PROJECT_NUMBER`
- `FIREBASE_APP_ID`
- `FIREBASE_SERVICE_ACCOUNT_BASE64`

To generate `FIREBASE_SERVICE_ACCOUNT_BASE64`, base64 encode the Firebase service account JSON and store the result as one line.

## Manual Server Check

After deployment, check:

```bash
docker ps
curl http://localhost:5000/health
```

The health endpoint should return:

```json
{"status":"ok"}
```
