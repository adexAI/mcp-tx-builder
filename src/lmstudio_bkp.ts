import { Chat, LMStudioClient, tool } from "@lmstudio/sdk"
// import { z } from "zod"
import * as z from "zod"
import { Interface, getAddress, parseEther } from "ethers"
import { createInterface } from "readline/promises"
import express from "express"

const app = express()
app.use(express.json())

// HTTP PORT (what you want)
const PORT = 3333

const rl = createInterface({ input: process.stdin, output: process.stdout })
const client = new LMStudioClient({})
const model = await client.llm.model("openai/gpt-oss-20b")
const chat = Chat.empty()

/** Tool: encodeTransaction */
const createTransaction = tool({
  name: "createTransaction",
  description: "Encode EVM tx calldata from ABI or function signature.",
  parameters: {
    to: z.string(),
    abi: z.array(z.any()),
    signature: z.string(),       // "transfer(address,uint256)"
    functionName: z.string(),    // required if abi is provided
    args: z.array(z.any()).default([]),
    valueEth: z.string().optional(),        // "0.01"
  },
  implementation: ({ to, abi, signature, functionName, args, valueEth }) => {
    const toAddr = getAddress(to)

    let iface: Interface
    let fnName: string

    if (abi && functionName) {
      iface = new Interface(abi)
      fnName = functionName
    } else if (signature) {
      const i = signature.indexOf("(")
      if (i === -1) throw new Error("Invalid signature expected name(types)")
      fnName = signature.slice(0, i)
      iface = new Interface([`function ${signature}`])
    } else {
      throw new Error("Provide either {abi + functionName} or {signature}")
    }

    const data = iface.encodeFunctionData(fnName, args)
    const value = valueEth ? parseEther(valueEth).toString() : "0x0"

    return { to: toAddr, data, value }
  },
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
    const apiKey = process.env.ETHERSCAN_API_KEY
    if (!apiKey) throw new Error("Missing ETHERSCAN_API_KEY env var")

    const url = new URL("https://api.etherscan.io/v2/api")
    url.searchParams.set("chainid", chainid)
    url.searchParams.set("module", "contract")
    url.searchParams.set("action", "getabi")
    url.searchParams.set("address", addr)
    url.searchParams.set("apikey", apiKey)

    const res = await fetch(url)
    if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`)

    const json = (await res.json()) as { status: string; message: string; result: string }
    if (json.status !== "1") throw new Error(`Etherscan error: ${json.message}: ${json.result}`)

    const abi = JSON.parse(json.result)
    return { abi }
  }
})


	app.use(function (req, res, next) {
		const okCors = (
			req.headers.origin && (
				req.headers.origin.startsWith('http://127.0.0.1:') ||
				req.headers.origin.startsWith('http://192.168.10.')
			)
		)
		if (!okCors) return next()
		res.header('Access-Control-Allow-Origin', req.headers.origin)
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-User-Signature, X-User-Address, X-Auth-Token, Authorization, SDK-DApp-Origin, x-app-source, x-app-version')
		res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS')
		next()
	})


app.post("/encode", async (req: any, res: any) => {
  const { message } = req.body
  
  chat.append("system", 'Find the ABI by using getABI tool, by passing the chainId and contract address.')
  chat.append("system", 'Do NOT assume functions ABI and data. All the time use getAbi tool.')
  chat.append("system", 'Use the ABI to find the function and the parameters. Then check the parametest from user text and try for provide it on the right way to the createTransaction tool.')
  chat.append("system", 'All the time use createTransaction tool and provide ONLY a valid JSON object in this exact format: {"to": "0x...", "data": "0x..."} that returned by createTransaction tool.')

  chat.append("user", message.replaceAll('\n', ''))

  // await model.act(chat, [getAbi, createTransaction], {
  //   // When the model finish the entire message, push it to the chat
  //   onMessage: (message) => chat.append(message),
  //   onPredictionFragment: ({ content }) => {
  //     process.stdout.write(content)
  //   },
  // })


  let finalAssistantMessage: string = ''
  await model.act(chat, [getAbi, createTransaction], {
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





// while (true) {
//   const input = await rl.question("You: ")
//   // Append the user input to the chat
//   chat.append("system", 'Find the ABI by using getABI tool, by passing the chainId and contract address.')
//   chat.append("system", 'Do NOT assume functions ABI and data. All the time use getAbi tool.')
//   chat.append("system", 'Use the ABI to find the function and the parameters. Then check the parametest from user text and try for provide it on the right way to the createTransaction tool.')
//   chat.append("system", 'All the time use createTransaction tool and provide ONLY a valid JSON object in this exact format: {"to": "0x...", "data": "0x..."} that returned by createTransaction tool.')
// //   chat.append("system", 'Do NOT assume functions ABI and data. All the time use getAbi tool. When get the ABI, parse the data and provide it to createTransaction tool. When given a transaction request, respond with ONLY a valid JSON object in this exact format: {"to": "0x...", "data": "0x..."}. The "to" field should be a valid Ethereum address (42 characters starting with 0x). The "data" field should be a hex string starting with 0x, or an empty string "0x" if no data is needed. Do not include any explanation, just the JSON object.')
  
//   chat.append("user", input)

//   process.stdout.write("Bot: ")
//   let finalAssistantMessage: string | null = null
//    await model.act(chat, [getAbi, createTransaction], {
//     onMessage: (message) => {
//       // This is called for FULL messages only
//       if (message.getRole() === "assistant") {
//         finalAssistantMessage = message.getText()?.toString() ?? null
//         chat.append(message)
//       }

//       // If a tool returns the final JSON, capture it here
//       if (message.getRole() === "tool") {
//         finalAssistantMessage = message.getText()?.toString() ?? null
//         chat.append(message)
//       }
//     },
//   })

//   if (finalAssistantMessage) {
//     console.log(finalAssistantMessage)
//   }
// }
