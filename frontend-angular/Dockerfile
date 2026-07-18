# Stage 1: Build
FROM node:18-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build -- --configuration production

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist/cverify-frontend/browser /usr/share/nginx/html

# Template config — BACKEND_URL / N8N_URL are substituted at container start
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
