FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json prisma.config.ts ./
COPY prisma ./prisma
# prisma.config.ts reads DIRECT_URL; generate doesn't connect, so a placeholder is fine
ENV DIRECT_URL=postgresql://build:build@localhost:5432/build
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
EXPOSE 8000
CMD ["node", "dist/src/server.js"]
