---
'@oversightstudio/mux-video': patch
---

Remove debug console.log/console.error statements from mux-video plugin. Error logging in webhook handler now uses Payload's built-in logger.
