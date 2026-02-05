FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production=false

COPY tsconfig.json ./
COPY src/ ./src/

RUN npx tsc || true

# Use tsx for running TypeScript directly
CMD ["npx", "tsx", "src/index.ts"]

EXPOSE 3210
