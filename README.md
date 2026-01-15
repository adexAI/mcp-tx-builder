## TXN-Builder server for lmstudio

### Server
to start server 

set `ETHERSCAN_API_KEY` env with etherscan api key 

```
npm install
npm run server
```

server start listening on `http://127.0.0.1:3333`

Open in browser `http://127.0.0.1:3333` to open the FE


### mcp.json for lmstudio
```
{
  "mcpServers": {
    "tx-builder": {
      "command": "node",
      "args": [
        "/Users/elmoto/Dev/AmbireTech/mcp-tx-builder/node_modules/.bin/tsx",
        "/Users/elmoto/Dev/AmbireTech/mcp-tx-builder/src/tx-builder-mcp.ts"
      ],
      "env": {
        "RPC_URL": "https://invictus.ambire.com/ethereum",
        "ETHERSCAN_API_KEY": "YOUR API KEY"
      }
    }
  }
}
```