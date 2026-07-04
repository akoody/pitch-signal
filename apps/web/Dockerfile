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

COPY apps/web apps/web
COPY packages/core packages/core
RUN npm run build -w @pitch-signal/core && npm run build -w @pitch-signal/web

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
