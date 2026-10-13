# Build context must be the repo root so this can COPY both web/ and
# web/server/'s own .env.example-documented env vars stay container-only —
# actual secrets come from Dokploy's env injection at deploy time, never
# baked into the image.

FROM node:22-alpine AS deps
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm install

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY web/ ./
# Both of these must be build args, not plain Dokploy runtime env vars:
# NEXT_PUBLIC_* is inlined into the client bundle, and next.config.ts's
# rewrites() destination gets resolved once into routes-manifest.json at
# `next build` time (not re-read per request in standalone/production mode,
# confirmed by a real failed proxy call during deploy testing) — setting
# NOTERIV_API_ORIGIN only at `docker run` time silently falls back to its
# http://127.0.0.1:4001 default and the frontend can't reach the backend.
ARG NEXT_PUBLIC_COLLAB_WS_URL
ARG NOTERIV_API_ORIGIN
ENV NEXT_PUBLIC_COLLAB_WS_URL=${NEXT_PUBLIC_COLLAB_WS_URL}
ENV NOTERIV_API_ORIGIN=${NOTERIV_API_ORIGIN}
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
