# AGENTS.md

## Previewing wireframes in a browser

Don't start a web server yourself: `file://` URLs are blocked, and a server
started from a sandboxed shell isn't reachable from the browser. When you need
the server for testing, first check if the server is already running, and if
it's not, ask the user to run it. Give them the command for the directory in
question — serve the wireframe directory itself, not the repo root:

```
cd ameliorate-v2/wireframe && python3 -m http.server 8777
```

Then browse `http://localhost:8777/<page>.html`. If the port is dead, say so
rather than starting your own server.
