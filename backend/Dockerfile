FROM node:20-slim

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY src ./src/

ENV NODE_ENV=production
EXPOSE 7860

CMD npx prisma db push --accept-data-loss && node src/index.js
