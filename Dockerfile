# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    fontconfig \
    libx11-6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy production dependencies definition
COPY package*.json ./
# Install ONLY production dependencies
RUN npm install --production --legacy-peer-deps

# Copy the built output from builder
COPY --from=builder /app/dist ./dist

# Optional: copy any static assets if they are served outside of dist
COPY firebase-applet-config.json* ./

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/server.cjs"]
