FROM node:24-slim AS builder

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
RUN corepack enable
RUN corepack yarn install --immutable

COPY tsconfig.json .
COPY src ./src

RUN corepack yarn build

FROM node:24-slim

WORKDIR /app
ENV SERVER_ROOT=/appdata/rising-world/dedicated-server
ENV PORT=3000
ENV HOST=0.0.0.0
ENV EXPOSE_OZADMINUTILS_MAP=true
ENV EXPOSE_OZADMINUTILS_PLUGINS=true
ENV EXPOSE_OZADMINUTILS_PLAYERLIST=true
ENV EXPOSE_OZADMINUTILS_SERVER_CONFIG=true
ENV EXPOSE_OZGPS_MARKERS=true
ENV SQLITE_BUSY_TIMEOUT_MS=5000
ENV LOG_LEVEL=info

COPY package.json yarn.lock .yarnrc.yml ./
RUN corepack enable
RUN corepack yarn workspaces focus --production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
