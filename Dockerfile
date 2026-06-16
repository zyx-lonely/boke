FROM node:20-alpine AS backend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY web/package*.json ./web/
RUN cd web && npm ci
COPY web/ ./web/
RUN cd web && npm run build

FROM node:20-alpine
RUN apk add --no-cache tzdata
WORKDIR /app
COPY --from=backend-build /app /app
COPY --from=frontend-build /app/web/dist ./web/dist
EXPOSE 3000
CMD ["node", "server.js"]
