FROM node:22-alpine

WORKDIR /app

# Step 1: Copy package.json (and optionally package-lock.json) and install dependencies
COPY server/docker-package.json ./package.json
# COPY package-lock.json ./    # Uncomment if you use it
RUN npm install

# Step 3: Copy dist/ and server/ separately — these change frequently
COPY dist/ ./

CMD ["npm", "start"]
