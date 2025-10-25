# Build stage
FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:24-alpine
WORKDIR /app

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/env.ts ./env.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/enable-unaccent.js ./enable-unaccent.js
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN npm install --omit=dev && npm cache clean --force

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["./docker-entrypoint.sh"]
