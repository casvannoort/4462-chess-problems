# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the webpack bundle
RUN npm run start

# Production stage
FROM nginx:alpine

# Copy built files to nginx (dist includes puzzles folder)
COPY --from=builder /app/dist /usr/share/nginx/html/
COPY --from=builder /app/node_modules/cm-chessboard/assets /usr/share/nginx/html/node_modules/cm-chessboard/assets/
COPY --from=builder /app/manifest.json /usr/share/nginx/html/
COPY --from=builder /app/icons /usr/share/nginx/html/icons/
COPY --from=builder /app/sw.js /usr/share/nginx/html/

# Copy nginx config for SPA support
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
