FROM node:20.19.0-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build --configuration=production

FROM nginx:alpine
COPY --from=build /app/dist/car-market-client/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Debug: List files to verify they exist - Force rebuild
RUN echo "Files copied successfully - $(date)"
RUN ls -la /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
