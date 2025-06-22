---
'@oversightstudio/mux-video': minor
---

* **Add `extendCollection` option**: Introduces a new configuration option that allows extending an existing collection with Mux video functionality instead of creating a new "mux-video" collection
* **Fix webhook endpoint for custom API routes**: Properly account for custom API endpoints configured via `routes.api` in Payload config (by @slavanossar)
* **Add support for `video.asset.updated` webhook**: Handle Mux `video.asset.updated` webhook events to keep video metadata in sync
* **Dependencies**: Upgrade package dependencies to latest versions
