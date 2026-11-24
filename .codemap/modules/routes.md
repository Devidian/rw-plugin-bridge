# Route adapters
<!-- codemap-id: rw-plugin-bridge/routes -->

## Responsibility

Expose compatible plugin route shapes, validate requests, and delegate to read-only adapters. Route availability is configurable.

## Source and tests

- [`pluginRouter`](../../src/router/plugin-router.ts), [handlers](../../src/handler/), [DTOs](../../src/dto/), and [configuration](../../src/utils/app-config.ts) define the route layer.
- [Route tests](../../tests/plugin-routes.test.ts) cover exposure and behavior. See [storage](storage.md) for underlying data.
