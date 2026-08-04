# Changelog

## Unreleased

### Added

* overlay fresh Admin Utils runtime positions on persisted player map data

## [0.2.0](https://github.com/Devidian/rw-plugin-bridge/compare/rw-plugin-bridge-v0.1.1...rw-plugin-bridge-v0.2.0) (2026-08-04)


### Added

* add live player map data overlay ([6ab46b4](https://github.com/Devidian/rw-plugin-bridge/commit/6ab46b48cadcfe66379b4c2fddc4f052fc1e0891))
* resolve map source from world config ([529f718](https://github.com/Devidian/rw-plugin-bridge/commit/529f718aa27f22a75483aff643236eea4b310d70))


### Fixed

* expose fresh online player presence ([34e2049](https://github.com/Devidian/rw-plugin-bridge/commit/34e2049c7147e21be8fe507604c1a960243abd19))


### Build

* **deps:** bump brace-expansion from 1.1.15 to 1.1.16 in the npm_and_yarn group across 1 directory ([fe3cfab](https://github.com/Devidian/rw-plugin-bridge/commit/fe3cfab86dbee9c52a5ff3f65a1333020d16dc3d))
* **deps:** bump the npm_and_yarn group across 1 directory with 2 updates ([ab10b04](https://github.com/Devidian/rw-plugin-bridge/commit/ab10b0440ed406cbb8311840a85995e0a466a4af))
* **deps:** bump the npm_and_yarn group across 1 directory with 2 updates ([e4446f7](https://github.com/Devidian/rw-plugin-bridge/commit/e4446f75ee039b37dbdeebfba49829c7c9440c56))
* update action versions ([af08a98](https://github.com/Devidian/rw-plugin-bridge/commit/af08a984ea796caabef15933db2ba04d151005fc))

## [0.1.1](https://github.com/Devidian/rw-plugin-bridge/compare/rw-plugin-bridge-v0.1.0...rw-plugin-bridge-v0.1.1) (2026-07-24)


### Fixed

* add land claim renew zones bridge route ([7d47009](https://github.com/Devidian/rw-plugin-bridge/commit/7d470097243b2d48c006e1182b9efb593f6b1562))
* input path ([088408f](https://github.com/Devidian/rw-plugin-bridge/commit/088408f03e5e1a9037d4c1c22494dfa4da36f96f))
* snapshot read-only world sqlite databases ([9837366](https://github.com/Devidian/rw-plugin-bridge/commit/9837366456942b11635baf6d83aa68680fc53be1))


### Tests

* cover renamed GPS marker icon keys ([a2acbda](https://github.com/Devidian/rw-plugin-bridge/commit/a2acbda8efa7920adbc42dba282ceffa0e88b96f))

## [Unreleased]

- change: resolve the Admin Utils map database from `World_Name` in `server.properties`
- change: update persisted GPS icon keys to the renamed semantic identifiers
- fix: read world map and player data from local SQLite snapshots when the game mount is read-only

## [0.1.0] - Unreleased

- Initial transitional plugin bridge scaffold.
