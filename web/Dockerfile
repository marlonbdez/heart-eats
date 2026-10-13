# Web de HeartEats para desarrollo local con docker compose (recarga al guardar).
# En producción la web es estática y la sirve Netlify, no este contenedor.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=development NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
