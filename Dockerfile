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

RUN npm install --omit=dev && npm cache clean --force

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", ".output/server/index.mjs"]
