#!/bin/sh
# Substitute BACKEND_URL at container start.
# Default keeps Docker Compose local setup working without any env vars.
export BACKEND_URL=${BACKEND_URL:-https://cverify-backend.onrender.com}
export N8N_URL=${N8N_URL:-http://localhost:5678}

echo "🔧 Entrypoint: Substituting BACKEND_URL=$BACKEND_URL N8N_URL=$N8N_URL into nginx config..."
envsubst '$BACKEND_URL $N8N_URL' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "✅ Generated nginx config:"
cat /etc/nginx/conf.d/default.conf | grep -A 5 "location /api/"

echo "🚀 Starting nginx..."
exec nginx -g 'daemon off;'
