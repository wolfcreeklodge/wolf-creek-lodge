FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public* ./public/

# next/image writes optimized variants to .next/cache at runtime. Everything
# above is copied in as root, so without this the nextjs user gets
# "EACCES: mkdir '/app/.next/cache'" on every optimized image and re-encodes
# the source on each request.
RUN mkdir -p /app/.next/cache/images && chown -R nextjs:nodejs /app/.next/cache

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
