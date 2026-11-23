# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# Resume Builder web (Next.js) - production image, standalone output
#
#   deps    -> npm ci
#   build   -> next build with NEXT_STANDALONE=1 (output: "standalone")
#   runtime -> only .next/standalone + static + public, non-root "node" user
# -----------------------------------------------------------------------------
ARG NODE_IMAGE=node:22-alpine

# ---------- deps ----------
FROM ${NODE_IMAGE} AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# ---------- build ----------
FROM deps AS build
WORKDIR /app
COPY . .
# Server-side calls (SSR / route handlers) reach the API on the internal Docker network.
# The browser always uses the same-origin /rb-api path (see src/lib/api.ts).
ARG NEXT_PUBLIC_API_URL=http://backend:4000
# Public site origin, e.g. https://resume.example.com (used for canonical links, sitemap, robots).
ARG NEXT_PUBLIC_SITE_URL=
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_STANDALONE=1 \
    NODE_ENV=production
RUN npm run build

# ---------- runtime ----------
FROM ${NODE_IMAGE} AS runtime
RUN apk add --no-cache libc6-compat tini
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    API_INTERNAL_URL=http://backend:4000 \
    API_URL=http://backend:4000

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# Lifts Node's 5-minute request timeout so slow 100 MB audio uploads are not cut off.
COPY --from=build --chown=node:node /app/server-timeouts.cjs ./server-timeouts.cjs

USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--require", "./server-timeouts.cjs", "server.js"]
