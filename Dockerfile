# Use the official Node.js 20 image.
FROM node:20

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this first prevents re-running npm install on every code change.
COPY package*.json ./

# Install production dependencies.
RUN npm install

# Copy local code to the container image.
COPY . .

# Build the Vite app for production.
RUN npm run build

# The "start" script in package.json is "vite preview --port $PORT"
# The parent image (node:20) sets the PORT environment variable.
CMD ["npm", "run", "start"]
