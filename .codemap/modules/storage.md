# Game persistence readers
<!-- codemap-id: rw-plugin-bridge/storage -->

## Responsibility

Read game and plugin databases with read-only SQLite adapters and snapshots. Data schemas remain owned by the game and individual plugins.

## Source and tests

- [SQLite helper](../../src/utils/sqlite.ts), [snapshot helper](../../src/utils/sqlite-snapshot.ts), and [player service](../../src/service/player-service.ts) implement game reads.
- [GPS](../../src/service/gps-marker-service.ts), [claim](../../src/service/land-claim-service.ts), [marketplace](../../src/service/marketplace-service.ts), [shop](../../src/service/shop-service.ts), and [map](../../src/service/map-source-service.ts) adapters read plugin data.
- [Player tests](../../tests/player-service.test.ts) and [market tests](../../tests/marketplace-service.test.ts) exercise adapter behavior.

## Dependencies

- `rw-plugin-oz-gps` — reads GPS persistence. [GPS adapter](../../src/service/gps-marker-service.ts)
- `rw-plugin-oz-land-claim` — reads claim persistence. [Claim adapter](../../src/service/land-claim-service.ts)
- `rw-plugin-oz-marketplace` — reads marketplace persistence. [Market adapter](../../src/service/marketplace-service.ts)
- `rw-plugin-oz-shop` — reads shop persistence. [Shop adapter](../../src/service/shop-service.ts)
- `rw-plugin-oz-admin-utils/map-export` — reads map persistence. [Map adapter](../../src/service/map-source-service.ts)
