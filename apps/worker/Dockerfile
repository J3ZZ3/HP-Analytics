FROM node:20-alpine

WORKDIR /app

COPY apps/worker/package.json apps/worker/package-lock.json* ./
RUN npm install

COPY apps/worker/tsconfig.json ./
COPY apps/worker/src ./src

RUN npx tsc -p tsconfig.json
RUN npm prune --omit=dev

ENV NODE_ENV=production

CMD ["node", "dist/worker.js"]
