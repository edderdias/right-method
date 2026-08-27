FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run prisma:generate && npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate
COPY --from=build /app/dist ./dist
EXPOSE 3333
# Apply any pending migrations before the app boots — keeps the prod DB schema in step with the
# Prisma Client the build was generated against. `migrate deploy` only runs committed migrations
# and is a no-op when the DB is already current.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
