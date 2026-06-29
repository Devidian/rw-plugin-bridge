# AGENTS.md

## Repository Purpose

This repository owns the transitional Rising World plugin data bridge.

It is a standalone TypeScript/Express service that exposes current plugin-backed data under route shapes compatible with future Rising World native plugin routes.

## Ownership

Owns:

- bridge REST API behavior under `/plugins/<pluginName>/<path>`
- per-route expose flags
- local read-only adapters for one configured Rising World server root
- Docker deployment behavior for the bridge
- bridge runtime, validation, and test coverage

Does not own:

- manager frontend API behavior
- map tile rendering
- in-game plugin business logic
- workspace-root orchestration rules

## Mandatory Workflow Rules

- Use Yarn, not npm or pnpm.
- Preserve the configured Node.js LTS baseline and keep `package.json`, Docker, CI, and docs aligned when runtime changes.
- Preserve source layering: router, handler, DTO, validator, service, mapper, interfaces, utils.
- Keep TypeScript files in kebab-case.
- Keep all game/plugin persistence reads read-only.
- Keep README and deployment examples aligned with behavior or structure changes.

## Validation

- Run `yarn build` for build-impacting changes.
- Run `yarn test` when tests are present or behavior changes.
- Review Docker and compose files when runtime, packaging, or deployment behavior changes.
