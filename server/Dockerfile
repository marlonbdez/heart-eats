# API de HeartEats. Dos destinos:
#   dev        desarrollo local con docker compose (recarga al guardar)
#   production lo que se despliega (Railway construye este, el último)
# La versión de Node es la del CI.
FROM node:24-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

# --- Desarrollo ---------------------------------------------------------
FROM base AS dev
ENV NODE_ENV=development
RUN npm ci
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]

# --- Compilación --------------------------------------------------------
FROM base AS build
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# --- Producción ---------------------------------------------------------
FROM base AS production
ENV NODE_ENV=production
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3001
CMD ["node", "dist/server.js"]
