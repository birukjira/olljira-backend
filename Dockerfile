# syntax=docker/dockerfile:1
# OllJira backend — production image for Dokploy.
# Uses pnpm with retries: plain npm install crashes on this network path
# (see Homelab_Deployment_Handover.md §7 "The npm Bug").
FROM node:20-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm@9
COPY package.json ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    set -e; ok=0; \
    for i in 1 2 3 4; do \
      echo "=== pnpm install attempt $i ==="; \
      if pnpm install --no-frozen-lockfile; then ok=1; break; fi; \
      echo "attempt $i failed - retrying in 15s"; sleep 15; \
    done; \
    if [ "$ok" != "1" ]; then echo "pnpm failed after 4 attempts"; exit 1; fi; \
    node -e "require('hono'); require('mysql2'); require('drizzle-orm'); console.log('deps verified OK')"

FROM node:20-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@9
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

FROM node:20-alpine
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "dist/boot.js"]
