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
        "${PATH_TO_THE_PACKAGE}/node_modules/.bin/tsx",
        "${PATH_TO_THE_PACKAGE}/src/mcp/tx-builder-mcp.ts"
      ],
      "env": {
        "RPC_URL": "https://invictus.ambire.com/ethereum",
        "ETHERSCAN_API_KEY": "YOUR API KEY"
      }
    }
  }
}
```