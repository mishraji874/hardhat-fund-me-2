// function deployFunc() {
//     console.log("Hi!")
// }

const { getNamedAccounts, deployments } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const {network} = require("hardhat")
const {verify} = require("../utils/verify")
// const helperConfig = require("../helper-hardhat-config")
// const networkConfig = helperConfig.networkConfig

// module.exports.default = deployFunc


// module.exports = async(hre) => {
//     const ( getNamedAccounts, deployments ) = hre
//     //hre.getNamedAccounts
//     //hre.deployments
// }



module.exports = async({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    //if chainId is X then use Y
    //if chainId is Z then use A

    // const ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]

    let ethUsdPriceFeedAddress
    if(developmentChains.includes(network.name)) {
        const ethUsdAggregator = await deployments.get("MockV3Aggregator")
        ethUsdPriceFeedAddress = ethUsdAggregator.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    }

    //well what happens when we want to change chains??
    //when going for localhost or hardhat network we want to use a mock

    const address = "0x9cc68505B2fa69a936E032B12c654E5bA8b52bcE"

    const args = [ethUsdPriceFeedAddress]
    const fundMe = await deploy("FundMe", {
        from: deployer,
        args: args, //put price feed address
        logs: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if(!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        //verify
        await verify(fundMe.address, args)
    }
    log("---------------------------------------------------------------")
}

module.exports.tags = ["all", "fundMe"]