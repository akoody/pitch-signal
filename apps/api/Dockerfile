FROM node:20.19-bookworm-slim AS build
WORKDIR /app
RUN npm install --global npm@11.6.2

COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/provider-api-football/package.json packages/provider-api-football/package.json
COPY packages/provider-footballdata-io/package.json packages/provider-footballdata-io/package.json
RUN npm ci

COPY apps/api apps/api
COPY packages packages
RUN npm run build -w @pitch-signal/core \
  && npm run build -w @pitch-signal/provider-footballdata-io \
  && npm run build -w @pitch-signal/api

FROM node:20.19-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/migrations ./apps/api/migrations
COPY --from=build /app/packages/core ./packages/core
COPY --from=build /app/packages/provider-footballdata-io ./packages/provider-footballdata-io
WORKDIR /app/apps/api
EXPOSE 4100
CMD ["sh", "-c", "node dist/cli.js migrate && node dist/server.js"]
