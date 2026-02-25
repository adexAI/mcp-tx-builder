import { getAddress } from "ethers/address"

const CONTRACTS = [
    {
        protocolName: "aave",
        contracts: [
            {
                name: "Pool",
                address: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
            },
            {
                name: "WrappedTokenGateway",
                address: "0xd01607c3C5eCABa394D8be377a08590149325722",
            },
            {
                name: "PoolAddressesProvider",
                address: "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e",
            },
            {
                name: "PoolConfigurator",
                address: "0x64b761D848206f447Fe2dd461b0c635Ec39EbB27",
            },
            {
                name: "UiPoolDataProvider",
                address: "0x56b7A1012765C285afAC8b8F25C69Bf10ccfE978",
            },
            {
                name: "UiIncentiveDataProvider",
                address: "0xe3dFf4052F0bF6134ACb73bEaE8fe2317d71F047",
            },
            {
                name: "ACLManager",
                address: "0xc2aaCf6553D20d1e9d78E365AAba8032af9c85b0",
            },
            {
                name: "WalletBalanceProvider",
                address: "0xC7be5307ba715ce89b152f3Df0658295b3dbA8E2",
            },
            {
                name: "TreasuryCollector",
                address: "0x464C71f6c2F760DdA6093dCB91C24c39e5d6e18c",
            },
            {
                name: "AaveProtocolDataProvider",
                address: "0x0a16f2FCC0D44FaE41cc54e079281D84A363bECD",
            },
            {
                name: "RiskSteward",
                address: "0xFCE597866Ffaf617EFdcA1C1Ad50eBCB16B5171E",
            },
            {
                name: "DefaultIncentivesController",
                address: "0x8164Cc65827dcFe994AB23944CBC90e0aa80bFcb",
            },
            {
                name: "IncentivesEmissionManager",
                address: "0x223d844fc4B006D67c0cDbd39371A9F73f69d974",
            },
            {
                name: "PoolAddressesProviderRegistry",
                address: "0xbaA999AC55EAce41CcAE355c77809e68Bb345170",
            },
            {
                name: "AaveOracle",
                address: "0x54586bE62E3c3580375aE3723C145253060Ca0C2",
            },
            {
                name: "RepayWithCollateral",
                address: "0x35bb522b102326ea3F1141661dF4626C87000e3E",
            },
            {
                name: "CollateralSwitch",
                address: "0xADC0A53095A0af87F3aa29FE0715B5c28016364e",
            },
            {
                name: "DebtSwitch",
                address: "0xd7852E139a7097E119623de0751AE53a61efb442",
            },
            {
                name: "WithdrawSwitchAdapter",
                address: "0x78F8Bd884C3D738B74B420540659c82f392820e0",
            },
            {
                name: "ACLAdmin",
                address: "0x5300A1a15135EA4dc7aD5a167152C01EFc9b192A",
            },
            {
                name: "AUSDC",
                address: "0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c",
            },
            {
                name: "AWSTETH",
                address: "0x0B925eD163218f6662a35e0f0371Ac234f9E9371",
            }
        ]
    }
]

function findRelatedContracts(chainId: string, address: string) {
    const chainid = String(chainId ?? 1)
    const addr = getAddress(address)
    let contracts: any[] = []

    CONTRACTS.forEach((platform, index) => {
        platform.contracts.forEach(contract => {
            if (getAddress(contract.address) === addr) {
                contracts = CONTRACTS[index]?.contracts ?? []
            }
        })
    })

    if (contracts.length === 0) {
        return null
    }

    return contracts
}

export async function getRelatedContracts(chainId: string, address: string) {
    const chainid = String(chainId ?? 1)
    const addr = getAddress(address)
    const contracts = findRelatedContracts(chainid, addr)
    return { contracts }
}

export async function getRelatedContractsByProtocolName(protocolName: string) {
    const contracts = CONTRACTS.find(contract => contract.protocolName.toLowerCase() === protocolName.toLowerCase())
    return { contracts }
}