const { assert, expect } = require("chai")
const { network, deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

describe("FundMe", async function () {
    let deployer
    let fundMe
    let mockV3Aggregator
    const sendValue = ethers.utils.parseEther("1") //1 eth = 10^18
    beforeEach(async function () {
        //deploy the contract
        //using hardhat-deploy
        // const accounts = await ethers.getSigners()
        // const accountZero = accounts[0]
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"]) //fixture is used to deploy all the factors which are present in the deploy folder
        fundMe = await ethers.getContract("FundMe", deployer)
        mockV3Aggregator = await ethers.getContract(
            "MockV3Aggregator",
            deployer
        )
    })
    describe("constructor", async function () {
        it("sets the aggregator address correctly", async function () {
            const response = await fundMe.priceFeed()
            assert.equal(response, mockV3Aggregator.address)
        })
    })

    describe("fund", async function () {
        it("fails if you don't send enough ETH", async function () {
            await expect(fundMe.fund()).to.be.revertedWith(
                "You need to spend more ETH!"
            )
        })
        it("updated the amount funded data structure", async function () {
            await fundMe.fund({ value: sendValue })
            const response = await fundMe.addressToAmountFunded(deployer)
            assert.equal(response.toString(), sendValue.toString())
        })
        it("adds funder to array of funders", async function () {
            await fundMe.fund({ value: sendValue })
            const funder = await fundMe.funders(0)
            assert.equal(funder, deployer)
        })
    })

    describe("withdraw", async function () {
        beforeEach(async function () {
            await fundMe.fund({ value: sendValue })
        })

        it("withdraw ETH from a single funder", async function () {
            //arrange
            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const startingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )

            //act
            const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = await transactionResponse.wait(1)
            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)

            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )

            //gasCost

            //assert
            assert.equal(endingFundMeBalance, 0)
            assert.equal(
                startingFundMeBalance.add(startingDeployerBalance),
                endingDeployerBalance.add(gasCost).toString()
            )
        })

        it("allows us to withdraw with multiple funders", async function () {
            //arrange
            const accounts = await ethers.getSigners()
            for (let i = 1; i < 6; i++) {
                const fundMeConnectedContract = await fundMe.connect(
                    accounts[i]
                )
                await fundMeConnectedContract.fund({ value: sendValue })
            }
            const startingFundMeBalance = await fundMe.getBalance(
                fundMe.address
            )
            const startingDeployerBalance = await fundMe.getBalance(deployer)

            //act
            const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = await transactionResponse.wait(1)
            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)

            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )

            //gasCost

            //assert
            assert.equal(endingFundMeBalance, 0)
            assert.equal(
                startingFundMeBalance.add(startingDeployerBalance),
                endingDeployerBalance.add(gasCost).toString()
            )

            //make sure that funders array is reset properly
            await expect(fundMe.funders(0)).to.be.reverted

            for(i = 1; i < 6; i++) {
                assert.equal(await fundMe.addressToAmountFunded(accounts[i].address), 0)
            }
        })

        it("only allows the ownerr to withdraw", async function() {
            const accounts = ethers.getSigners()
            const attacker = accounts[1]
            const attackerConnectedContract = await fundMe.connect(attacker)
            await expect(attackerConnectedContract.withdraw()).to.be.revertedWWith("FundMe__NotOwner")
        })
    })
})
