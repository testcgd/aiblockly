FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy server code
COPY index.js ./

# Make the script executable
RUN chmod +x index.js

# Default command
CMD ["node", "index.js"]
