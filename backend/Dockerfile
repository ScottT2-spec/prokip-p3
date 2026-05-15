FROM node:20-slim

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
COPY src ./src/
COPY start.sh ./
RUN chmod +x start.sh

# Generate Prisma client AFTER full schema is in place
RUN npx prisma generate

RUN mkdir -p /tmp/uploads && chmod 777 /tmp/uploads
# Ensure node_modules is writable for runtime prisma generate
RUN chmod -R 777 /app/node_modules/.prisma

ENV NODE_ENV=production
ENV UPLOAD_DIR=/tmp/uploads
EXPOSE 7860

CMD ["./start.sh"]
