import { Chat, LMStudioClient, tool } from "@lmstudio/sdk"
// import { z } from "zod"
import * as z from "zod"
import { Interface, getAddress, parseEther } from "ethers"
import { createInterface } from "readline/promises"
import express from "express"
import path from "path"
import { fileURLToPath } from "url";
import { getAbiFromEtherscan } from "./lib/getAbi.js"
import { getRelatedContracts, getRelatedContractsByProtocolName } from "./lib/relatedContracts.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ABIS = {} 

const app = express()
app.use(express.json())

app.use(express.static(path.join(__dirname, "../", "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../" ,"public", "index.html"))
});

const PORT = 3333

const rl = createInterface({ input: process.stdin, output: process.stdout })
const client = new LMStudioClient({})
const model = await client.llm.model("openai/gpt-oss-20b")

/** Tool: encodeTransaction */
const createTransaction = tool({
  name: "createTransaction",
  description: "Encode EVM tx calldata from ABI or function signature.",
  parameters: {
    to: z.string(),
    // abi: z.array(z.any()),
    signature: z.string(),       // "transfer(address,uint256)"
    functionName: z.string(),    // required if abi is provided
    args: z.array(z.any()).default([]),
    valueEth: z.string().optional(),        // "0.01"
  },
  implementation: ({ to, signature, functionName, args, valueEth }) => {
    console.log({ to, signature, functionName, args, valueEth });
    
    const toAddr = getAddress(to)

    let iface: Interface
    let fnName: string
    const abi = ABIS[toAddr.toString() as keyof typeof ABIS] as object[];

    const value = valueEth ? `0x${parseEther(valueEth).toString(16)}` : "0x0"

    if (abi && abi.length > 0 && functionName) {
      iface = new Interface(abi)
      fnName = functionName
    } else if (signature && signature !== '') {
      const i = signature.indexOf("(")
      if (i === -1) throw new Error("Invalid signature expected name(types)")
      fnName = signature.slice(0, i)
      iface = new Interface([`function ${signature}`])
    } else if (valueEth !== '' && toAddr){
      return { to: toAddr, data: '0x', value }
    } else {
      throw new Error("Provide either {abi + functionName} or {signature}")
    }

    const data = iface.encodeFunctionData(fnName, args.map((arg: any) => arg.toString()))

    return { to: toAddr, data, value }
  },
})

const relatedContracts = tool({
  name: "relatedContracts",
  description: "return the related contracts for ethereum contract by providing the chain id and contract address",
  parameters: {
    chainId: z.union([z.string(), z.number()]).optional(),
    address: z.string().optional(),
    protocolName: z.string().optional(),
  },
  implementation: async ({ chainId, address, protocolName }) => {
    const chainid = String(chainId ?? 1)
    
    if (address) {
      const addr = getAddress(address)
      return getRelatedContracts(chainid, addr)
    }

    if (protocolName) {
      return getRelatedContractsByProtocolName(protocolName)
    }
  }
})

/** Tool: getABI (Etherscan v2) */
const getAbi = tool({
  name: "getABI",
  description: "return the ABI for ethereum contract by providing the chain id and contract address",
  parameters: {
    chainId: z.union([z.string(), z.number()]).optional(),
    address: z.string(),
  },
  implementation: async ({ chainId, address }) => {
    const chainid = String(chainId ?? 1)
    const addr = getAddress(address)
    
    const { abi } = await getAbiFromEtherscan(chainid, addr)

    // Add index signature to ABIS and type it to avoid TS error
    // @ts-ignore
    ABIS[addr.toString()] = abi

    const solidityAbi: string[] = []
    if (abi && Array.isArray(abi)) {
      abi.forEach((fn: any) => {
        if (
          fn.type === "function" &&
          typeof fn.name === "string" &&
          Array.isArray(fn.inputs) &&
          Array.isArray(fn.outputs) &&
          typeof fn.stateMutability === "string"
        ) {
          const inputs = fn.inputs.map((i: any) =>
            `${i.type}${i.name ? " " + i.name : ""}`
          ).join(', ');
          const outputs = fn.outputs.map((o: any) => o.type).join(', ')
          const soliditySig =
            `function ${fn.name}(${inputs}) public ${fn.stateMutability}` +
            (outputs.length > 0 ? ` returns(${outputs})` : '')
          solidityAbi.push(soliditySig);
        }
      })
    }
   console.log({solidityAbi})
    return { solidityAbi }
  }
})


	app.use(function (req, res, next) {
		const okCors = (
			req.headers.origin && (
				req.headers.origin.startsWith('http://localhost:') ||
				req.headers.origin.startsWith('http://127.0.0.1:'))
		)
		if (!okCors) return next()
		res.header('Access-Control-Allow-Origin', req.headers.origin)
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-User-Signature, X-User-Address, X-Auth-Token, Authorization, SDK-DApp-Origin, x-app-source, x-app-version')
		res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS')
		next()
	})


app.post("/encode", async (req: any, res: any) => {
  const { message } = req.body
  
  const chat = Chat.empty()
  chat.append("system", `Chain ID: 1`)
  chat.append("system", `USDC contract address: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`)
  chat.append("system", 'Find the related contracts by using relatedContracts tool, by passing the chainId and contract address.')
  chat.append("system", 'Find the ABI by using getABI tool, by passing the chainId and contract address.')
  chat.append("system", 'Use the related contracts to find the function and the parameters. Then check the parametest from user text and try for provide it on the right way to the createTransaction tool.')
  // chat.append("system", 'All the time use createTransaction tool and provide ONLY a valid JSON object in this exact format: {"to": "0x...", "data": "0x..."} that returned by createTransaction tool.')
  chat.append("system", 'Do NOT assume functions ABI and data. All the time use getAbi tool.')
  chat.append("system", 'Use the ABI to find the function and the parameters. Then check the parametest from user text and try for provide it on the right way to the createTransaction tool.')
  chat.append("system", 'All the time use createTransaction tool and provide ONLY a valid JSON object in this exact format: {"to": "0x...", "data": "0x..."} that returned by createTransaction tool.')

  chat.append("user", message.replaceAll('\n', ''))


  let finalAssistantMessage: string = ''
  await model.act(chat, [getAbi, createTransaction, relatedContracts], {
    onMessage: (message) => {
      // This is called for FULL messages only
      if (message.getRole() === "tool") {
      finalAssistantMessage = message.toString() ?? null
    }
    },
    onPredictionFragment: ({ content }) => {
      process.stdout.write(content)
    },
  })

  if (finalAssistantMessage) {
    console.log({finalAssistantMessage})
    const result = JSON.parse(finalAssistantMessage.split('tool: ')[1]!)
    res.json(result)
  } else {
    res.json({error: true})
  }

})

app.listen(PORT, () => {
  console.log(`HTTP server listening on http://localhost:${PORT}`)
})
