
FROM node:20.19.0-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build --configuration=production

FROM node:20.19.0-alpine
WORKDIR /app

ENV NODE_ENV=production
COPY --from=build /app/dist ./dist

EXPOSE 8080
CMD ["node", "dist/car-market-client/server/server.mjs"]
