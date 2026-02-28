FROM node:24-slim

# SQLite typically needs python and build basics if prebuilt binaries are not available
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace configs and install deps
COPY package*.json ./
COPY start.js ./
COPY apps/frontend/package*.json apps/frontend/
COPY apps/backend/package*.json apps/backend/

RUN npm install

# Copy source codes
COPY . .

# Build Backend
RUN npm run build -w apps/backend

# Build Frontend
# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w apps/frontend

# Expose port (Cloud Run sets PORT to 8080 by default)
ENV PORT=8080
ENV API_PORT=8081
ENV GEMINI_API_KEY=AIzaSyBD8sIuv-KZWh45eMCuBvWu11bjGvwB1QU
EXPOSE 8080 8081

# Run the wrapper script that spawns both apps
CMD ["node", "start.js"]
