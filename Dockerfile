# Use Node.js base image
FROM node:18

# Set working directory inside the container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# ✅ Copy your .env file into the image
COPY .env /app/.env

# Copy the rest of your backend code
COPY . /app

# Start your backend
CMD ["npm", "start"]