FROM node:20-alpine

WORKDIR /app

COPY apps/api/package.json apps/api/package-lock.json* ./
RUN npm install

COPY apps/api/tsconfig.json ./
COPY apps/api/src ./src
COPY openapi.yaml ./openapi.yaml

RUN npx tsc -p tsconfig.json
RUN npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "dist/server.js"]
