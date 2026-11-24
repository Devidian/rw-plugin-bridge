# Rising World plugin bridge
<!-- codemap-id: rw-plugin-bridge -->

## Purpose

Transitional Express service exposing plugin-shaped routes for one game server. [Startup](../src/index.ts) and [server](../src/server.ts) wire [plugin router](../src/router/plugin-router.ts); game and plugin data is read-only.

## Modules

- [Route adapters](modules/routes.md)
- [Game persistence readers](modules/storage.md)

## Build and tests

[Package scripts](../package.json) define `yarn build` and `yarn test`; [tests](../tests/) cover routes and source adapters.
