FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

FROM node:20-alpine AS frontend
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json vite.config.js tailwind.config.js postcss.config.js index.html ./
COPY src/ ./src/
RUN npx vite build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev
COPY server/ ./server/
COPY --from=frontend /app/dist ./dist/
EXPOSE 3000
CMD ["node", "server/index.js"]
