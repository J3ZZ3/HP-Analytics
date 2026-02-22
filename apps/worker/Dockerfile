FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npx tsc -p tsconfig.json
RUN npm prune --omit=dev

ENV NODE_ENV=production

CMD ["node", "dist/worker.js"]
