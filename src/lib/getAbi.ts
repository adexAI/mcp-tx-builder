
import { getAddress } from "ethers"

export async function fetchAbiFromEtherscan(chainId: string, address: string) {
    const chainid = String(chainId ?? 1)
    const addr = getAddress(address)
    const apiKey = process.env.ETHERSCAN_API_KEY
    if (!apiKey) throw new Error("Missing ETHERSCAN_API_KEY env var")
    
    
    const url = new URL("https://api.etherscan.io/v2/api")
    url.searchParams.set("chainid", chainid)
    url.searchParams.set("module", "contract")
    url.searchParams.set("action", "getsourcecode")
    url.searchParams.set("address", addr)
    url.searchParams.set("apikey", apiKey)
  
    return fetch(url)
  }
  
  export async function getAbiFromEtherscan(chainId: string, address: string) {
    const chainid = String(chainId ?? 1)
    const addr = getAddress(address)
    const res = await fetchAbiFromEtherscan(chainid, addr)
    if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`)
    const json = (await res.json()) as { status: string; message: string; result: Array<{ ABI: string, Implementation: string }> }
    if (json.status !== "1") throw new Error(`Etherscan error: ${json.message}: ${json.result}`)
  
    if (json.result.length === 0) throw new Error(`Etherscan error: No source code found for contract ${address}`)
    if (json.result[0]?.Implementation) {
      const proxyRes = await fetchAbiFromEtherscan(chainid, json.result[0]?.Implementation)
      if (!proxyRes.ok) throw new Error(`Etherscan HTTP ${proxyRes.status}`)
      const proxyJson = (await proxyRes.json()) as { status: string; message: string; result: Array<{ ABI: string, Implementation: string }> }
      if (proxyJson.status !== "1") throw new Error(`Etherscan error: ${proxyJson.message}: ${proxyJson.result}`)
      if (proxyJson.result.length === 0) throw new Error(`Etherscan error: No source code found for contract ${json.result[0]?.Implementation}`)
      if (proxyJson.result[0]?.ABI) {
        const abiImpStr = proxyJson.result[0]?.ABI;
        if (typeof abiImpStr !== 'string') {
          throw new Error("Etherscan returned undefined ABI string");
        }
        const abiImp = JSON.parse(abiImpStr);
        return { abi: abiImp };
      }
    }
    const abiStr = json.result[0]?.ABI;
    if (typeof abiStr !== 'string') {
      throw new Error("Etherscan returned undefined ABI string");
    }
    const abi = JSON.parse(abiStr);
    return { abi };
  }
  