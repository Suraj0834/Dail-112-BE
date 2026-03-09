# ==============================================================================
# Dockerfile - Node.js Backend API
# ==============================================================================

FROM node:20-alpine

# Use PM2 globally for production process management
RUN npm install -g pm2

WORKDIR /usr/src/app

# Copy package dependencies first for caching layers
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

# Expose backend port
EXPOSE 5000

# Start backend via PM2
CMD ["pm2-runtime", "ecosystem.config.js", "--env", "production"]
