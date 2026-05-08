# syntax=docker/dockerfile:1

FROM node:24.13.0-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build

COPY . .
RUN npm run build

FROM node:24.13.0-bookworm-slim AS runner

ENV NODE_ENV=production \
	HOST=0.0.0.0 \
	PORT=3000 \
	BODY_SIZE_LIMIT=8M \
	HEALTHZ_VERBOSE=false

WORKDIR /app

COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/.svelte-kit ./.svelte-kit
COPY --from=build --chown=node:node /app/static ./static
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/svelte.config.js /app/tsconfig.json /app/vite.config.ts ./

RUN mkdir -p /data /app/static/uploads /app/static/assets/uploads /app/static/assets/work \
	&& chown -R node:node /data /app/static/uploads /app/static/assets

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/healthz').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "build/index.js"]
