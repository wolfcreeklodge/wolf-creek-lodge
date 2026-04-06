FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY sync-ical.mjs ./
CMD ["sh", "-c", "while true; do node sync-ical.mjs; echo 'Next sync in 15 minutes...'; sleep 900; done"]
