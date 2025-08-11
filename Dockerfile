# Multi-stage Docker build for production deployment

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --silent

# Copy source code
COPY . .

# Build application
ARG REACT_APP_MQTT_HOST=localhost
ARG REACT_APP_MQTT_PORT=1884
ENV REACT_APP_MQTT_HOST=$REACT_APP_MQTT_HOST
ENV REACT_APP_MQTT_PORT=$REACT_APP_MQTT_PORT
ENV GENERATE_SOURCEMAP=false

RUN npm run build

# Production stage
FROM nginx:alpine

# Install curl for health checks
RUN apk --no-cache add curl

# Copy custom nginx config
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=builder /app/build /usr/share/nginx/html

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health.json || exit 1

# Expose port
EXPOSE 80

# Labels for metadata
LABEL maintainer="Paradox Escape Rooms"
LABEL version="1.0.1"
LABEL description="Houdini Clock - Escape Room Countdown System"

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
