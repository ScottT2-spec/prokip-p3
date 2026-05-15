FROM node:20-slim

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY src ./src/

RUN mkdir -p /tmp/uploads && chmod 777 /tmp/uploads

ENV NODE_ENV=production
ENV UPLOAD_DIR=/tmp/uploads
EXPOSE 7860

COPY start.sh ./
RUN chmod +x start.sh

CMD ["./start.sh"]
