# RW Plugin Bridge

Transitional HTTP bridge for Rising World plugin data.

The bridge exposes data for one configured game server root under future-compatible plugin route paths:

- `GET /plugins/ozadminutils/map?lastChange=<date-or-ms>`
- `GET /plugins/ozadminutils/plugins?lastChange=<date-or-ms>`
- `GET /plugins/ozadminutils/playerlist?lastChange=<date-or-ms>`
- `GET /plugins/ozadminutils/server-config?lastChange=<date-or-ms>`
- `GET /plugins/ozadminutils/world-areas?lastChange=<date-or-ms>`
- `GET /plugins/ozgps/marker?type=global&lastChange=<date-or-ms>`
- `GET /plugins/ozmarketplace/zones?lastChange=<date-or-ms>`
- `GET /plugins/ozmarketplace/offers?areaId=<area-id>&lastChange=<date-or-ms>`
- `GET /plugins/ozshop/zones?lastChange=<date-or-ms>`
- `GET /plugins/ozlandclaim/claim-sales?lastChange=<date-or-ms>`

## Configuration

| Variable                            | Default                                  | Description                                                         |
| ----------------------------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| `PORT`                              | `3000`                                   | HTTP bind port.                                                     |
| `HOST`                              | `0.0.0.0`                                | HTTP bind host.                                                     |
| `SERVER_ROOT`                       | `/appdata/rising-world/dedicated-server` | Rising World dedicated server root.                                 |
| `ADMINUTILS_MAP_DB_PATH`            | empty                                    | Optional explicit Admin Utils map source database path.             |
| `ADMINUTILS_MAP_WORLD_NAME`         | empty                                    | Optional world name used to find `Plugins/OZAdminUtils/<world>.db`. |
| `EXPOSE_OZADMINUTILS_MAP`           | `true`                                   | Enables the Admin Utils map route.                                  |
| `EXPOSE_OZADMINUTILS_PLUGINS`       | `true`                                   | Enables the Admin Utils plugin list route.                          |
| `EXPOSE_OZADMINUTILS_PLAYERLIST`    | `true`                                   | Enables the Admin Utils player list route.                          |
| `EXPOSE_OZADMINUTILS_SERVER_CONFIG` | `true`                                   | Enables the Admin Utils server config route.                        |
| `EXPOSE_OZADMINUTILS_WORLD_AREAS`   | `true`                                   | Enables the Admin Utils world-area route.                           |
| `EXPOSE_OZGPS_MARKERS`              | `true`                                   | Enables the OZ GPS marker route.                                    |
| `EXPOSE_OZMARKETPLACE`              | `true`                                   | Enables the OZ Marketplace routes.                                  |
| `EXPOSE_OZSHOP`                     | `true`                                   | Enables the OZ Shop routes.                                         |
| `EXPOSE_OZLANDCLAIM`                | `true`                                   | Enables the OZ LandClaim routes.                                    |
| `SQLITE_BUSY_TIMEOUT_MS`            | `5000`                                   | SQLite busy timeout for read-only connections.                      |
| `LOG_LEVEL`                         | `info`                                   | `debug`, `info`, `warn`, `error`, or `off`.                         |

`lastChange` accepts epoch milliseconds or an ISO date string. Without `lastChange`, the map route returns all current rows.

Map BLOB fields are base64 encoded as `heightsBase64` and `texturesBase64`.

Server config values whose key contains `password` are masked as `***`.

## Validation

```sh
yarn build
yarn test
```
