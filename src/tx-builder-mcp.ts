import { z } from "zod"
import { Interface, getAddress, parseEther } from "ethers"

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

const EncodeInput = z.object({
  to: z.string(),
  abi: z.array(z.any()).optional(),
  signature: z.string().optional(),
  functionName: z.string().optional(),
  args: z.array(z.any()).default([]),
  valueEth: z.string().optional()
})


const GetAbiInput = z.object({
  chainId: z.union([z.string(), z.number()]).default(1),
  address: z.string()
})


const server = new McpServer({ name: "tx-builder", version: "0.1.0" })

server.tool(
  "encodeTransaction",
  "Encode EVM tx calldata from ABI or function signature",
  EncodeInput.shape,
  async (input) => {
    const to = getAddress(input.to)

    let iface: Interface
    let fnName: string

    if (input.abi && input.functionName) {
      iface = new Interface(input.abi)
      fnName = input.functionName
    } else if (input.signature) {
      fnName = input.signature.slice(0, input.signature.indexOf("("))
      iface = new Interface([`function ${input.signature}`])
    } else {
      throw new Error("Provide either {abi + functionName} or {signature}")
    }

    const data = iface.encodeFunctionData(fnName, input.args)
    const value = input.valueEth ? parseEther(input.valueEth).toString() : undefined

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ to, data, value }, null, 2),
        },
      ],
    }
  }
)

server.tool(
  "getABI",
  "Fetch verified contract ABI from Etherscan (v2)",
  GetAbiInput.shape,
  async (input) => {
    const chainid = String(input.chainId)
    const address = getAddress(input.address)

    const apiKey = process.env.ETHERSCAN_API_KEY
    if (!apiKey) throw new Error("Missing ETHERSCAN_API_KEY (env) or apiKey param")

    const url = new URL("https://api.etherscan.io/v2/api")
    url.searchParams.set("chainid", chainid)
    url.searchParams.set("module", "contract")
    url.searchParams.set("action", "getabi")
    url.searchParams.set("address", address)
    url.searchParams.set("apikey", apiKey)

    const res = await fetch(url)
    if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`)

    const json = await res.json() as { status: string; message: string; result: string }

    if (json.status !== "1") {
      throw new Error(`Etherscan error: ${json.message}: ${json.result}`)
    }

    const abi = JSON.parse(json.result) // result е JSON string
    return {
      content: [{ type: "text", text: JSON.stringify({ abi }, null, 2) }],
    }
  }
)

const transport = new StdioServerTransport()
server.connect(transport)
console.log(server.server)