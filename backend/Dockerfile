FROM node:18-alpine

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies (this will rebuild native modules for Alpine Linux)
# In development, we need dev dependencies too, so we check NODE_ENV
ARG NODE_ENV=production
RUN if [ "$NODE_ENV" = "development" ]; then npm ci; else npm ci --omit=dev; fi

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "server.js"]
