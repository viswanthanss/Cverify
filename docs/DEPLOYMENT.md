# CVerify — Deployment Guide

## Development (local)

```bash
# 1. Clone and enter the repo
git clone <repo-url> && cd project-cv-ml-fr-main

# 2. Copy env template and fill in your values
cp .env.example .env
# Edit .env — set AZURE_SQL_* if you want Azure jobs, leave blank for demo seed

# 3. Start all services
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# App is available at:
#   Frontend  http://localhost:8080
#   Backend   http://localhost:8000
#   API docs  http://localhost:8000/docs
#   n8n       http://localhost:5679
```

### Dev compose overrides

`docker-compose.dev.yml` adds:
- Volume mounts so backend code changes are reflected without a rebuild
- n8n port remapped to `5679` (avoids conflict with other local services)

---

## Production (Docker + Traefik)

### Prerequisites

- A server with Docker Engine + Docker Compose v2
- A domain pointing to the server (e.g. `cverify.yourdomain.com`)
- Traefik v3 running as a reverse proxy (see `docker-compose.prod.yml`)

### Steps

```bash
# 1. Pull latest images from Docker Hub
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull

# 2. Start in detached mode
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 3. Verify all services are healthy
docker compose ps
```

`docker-compose.prod.yml` adds Traefik labels for automatic HTTPS via Let's Encrypt.

### Environment for production

Set these on the server (not in a file):
```bash
export JWT_SECRET="$(openssl rand -hex 32)"
export AZURE_SQL_SERVER=cverify.database.windows.net
export AZURE_SQL_DB=Jobs_DW
export AZURE_SQL_USER=cverify_test
export AZURE_SQL_PASSWORD=<rotated-password>
export AZURE_SQL_IMPORT_LIMIT=5000
```

Or use a secrets manager (Doppler, Vault, GitLab CI/CD variables).

---

## CI/CD Pipeline (GitLab)

Defined in `.gitlab-ci.yml`. Three stages:

### Stage 1 — models
Downloads trained ML models from Kaggle if they don't exist in the cache.

### Stage 2 — build
```
docker build -t attiaimeed/cverify-backend:latest ./backend
docker build -t attiaimeed/cverify-frontend:latest ./frontend-angular
docker push attiaimeed/cverify-backend:latest
docker push attiaimeed/cverify-frontend:latest
```

### Stage 3 — deploy
SSH into the production server and runs `deploy.sh`:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans
```

### Variables required in GitLab CI/CD

| Variable              | Where to set        |
|-----------------------|---------------------|
| `DOCKER_HUB_TOKEN`    | GitLab → Settings → CI/CD → Variables |
| `SSH_PRIVATE_KEY`     | Same               |
| `DEPLOY_HOST`         | Server IP/hostname |
| `AZURE_SQL_PASSWORD`  | Masked variable    |

---

## Useful commands

```bash
# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Rebuild only the backend
docker compose -f docker-compose.yml -f docker-compose.dev.yml build backend
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --no-deps backend

# Database shell
docker exec -it project-cv-ml-fr-main-db-1 psql -U cverify -d cverify

# Run admin import manually
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cverify.com","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
curl -X POST "http://localhost:8000/admin/import-jobs-azure?limit=5000" \
  -H "Authorization: Bearer $TOKEN"

# Check service health
curl http://localhost:8000/health
wget -qO- http://localhost:8080/

# Full reset (WARNING: deletes all data)
docker compose down -v
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

---

## Health Checks

All services have Docker health checks. The startup dependency chain is:
```
db (healthy) → backend (healthy) → frontend (healthy)
               db (healthy) → n8n (healthy)
```

| Service  | Health endpoint                          | Interval |
|----------|------------------------------------------|----------|
| db       | `pg_isready -U cverify`                  | 5s       |
| backend  | `GET http://localhost:8000/health`       | 10s      |
| frontend | `wget 127.0.0.1:80`                      | 10s      |
| n8n      | `wget http://localhost:5678/healthz`     | 15s      |

---

## Docker Hub Images

| Image                              | Built from         |
|------------------------------------|--------------------|
| `attiaimeed/cverify-backend:latest` | `backend/`        |
| `attiaimeed/cverify-frontend:latest`| `frontend-angular/`|
