# Multi-stage build for Angular + Node.js

# Stage 1: Build Angular frontend
FROM node:20 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup Node.js backend and serve
FROM node:20-slim
WORKDIR /app

# Copy backend files
COPY package*.json ./
RUN npm ci --only=production

COPY backend/ ./backend/

# Copy built frontend from previous stage
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "backend/server.js"]

