import { MongoClient, ObjectId } from "mongodb";
import fetch from 'node-fetch';
import { ethers } from 'ethers';
import Web3 from "web3";
import {
  mintTokens,
  approveForBurn,
  burnTokens,
} from './contract-methods.js'

import QCHSD_ABIJSON from './DChainstackDollars.json' assert { type: "json" };
import { requestsCollection, db } from "./mongoConfig.js";
import { sendBrc, brcbalance } from "./bittensor.js";

const provider = new ethers.AnkrProvider('goerli', process.env.ANKR_KEY);

let THIRTY_MINUTES = 5 * 60 * 1000;

const DESTINATION_TOKEN_CONTRACT_ADDRESS =
  process.env.DESTINATION_TOKEN_CONTRACT_ADDRESS
const BRIDGE_WALLET = process.env.BRIDGE_WALLET
const BRIDGE_WALLET_KEY = process.env.BRIDGE_PRIV_KEY

const destinationWebSockerProvider = new Web3("wss://goerli.infura.io/ws/v3/ef80761adf9346b6b4ec941fdb91de64", {
  reconnect: {
    auto: true,
    delay: 5000, // ms
    maxAttempts: 5,
    onTimeout: false
  }
})

// adds account to sign transactions
destinationWebSockerProvider.eth.accounts.wallet.add(BRIDGE_WALLET_KEY)
const destinationTokenContract = new destinationWebSockerProvider.eth.Contract(QCHSD_ABIJSON.abi, DESTINATION_TOKEN_CONTRACT_ADDRESS);


export async function checkDeposit() {
  console.log("💰 DEPOSIT CHECKING")
  let query = { $and: [{ type: 0 }, { completed: false }, { deposited: false }] };
  let result = await requestsCollection.find(query)
    .toArray();

  for (let i = 0; i < result.length; i++) {
    const balance = await brcbalance(result[i].btcAddress)
    if (balance >= result[i].amount) {
      await requestsCollection.updateOne(result[i], { $set: { deposited: true } })
      console.log("💰 DEPOSITed! So minting now!")
      await mintTokens(destinationWebSockerProvider, destinationTokenContract, ethers.parseUnits(String(result[i].amount), 18), result[i].ethAddress)
    }
  }
}


export async function checkJunks() {
  console.log("🔂 JUNK REQUESTS CHECKING")
  let result = await requestsCollection.find({ completed: false })
    .toArray();

  if (result.length === 0) {
    console.log("No pending requests");
    return;
  }

  let deleted = 0;
  for (let i = 0; i < result.length; i++) {
    if (new Date().valueOf() - new ObjectId(result[i]._id).getTimestamp().valueOf() > THIRTY_MINUTES) {
      await requestsCollection.updateOne(result[i], { $set: { completed: true } })
      deleted++;
    }
  }
  console.log(`🧹 Cleared ${deleted} requests of ${result.length}`);
}

const handleMintedEvent = async (
  to, value,
  providerDest,
  contractDest
) => {
  console.log('handleMintedEvent')
  console.log('from :>> ', to)
  console.log('value :>> ', value)
  console.log('============================')

  console.log('Tokens minted')

  let query = { $and: [{ completed: false }, { deposited: true }, { ethAddress: to }] };
  let result = await requestsCollection.findOne(query)
  if (result) {
    try {
      await requestsCollection.updateOne(result, { $set: { completed: true } })
      console.log(`✅ Bridge Finished. ${result.amount} xTAO minted on ${result.ethAddress} of Ethereum`);
    } catch (e) {
      console.log(e)
    }
  }
}

const handleDestinationEvent = async (
  from, to, value,
  providerDest,
  contractDest
) => {
  console.log('handleDestinationEvent')
  console.log('to :>> ', to)
  console.log('from :>> ', from)
  console.log('value :>> ', value)
  console.log('============================')

  if (from == process.env.WALLET_ZERO) {
    handleMintedEvent(to, value, providerDest, contractDest)
    return
  }
  if (to == BRIDGE_WALLET && to != from) {
    console.log(
      'Tokens received on bridge from destination chain! Time to bridge back!'
    )
    try {
      // we need to approve burn, then burn
      const tokenBurnApproved = await approveForBurn(
        providerDest,
        contractDest,
        value
      )
      if (!tokenBurnApproved) return
      console.log('Tokens approved to be burnt')
      const tokensBurnt = await burnTokens(providerDest, contractDest, value)

      if (!tokensBurnt) return
      console.log(
        'Tokens burnt on destination, time to transfer tokens in BTC side'
      )
      // SEND ORDIANL TO RECEVING ADDRESS!!
      // const transferBack = await transferToEthWallet(
      //   provider,
      //   contract,
      //   value,
      //   from
      // )

      let query = { $and: [{ completed: false }, { burnt: false }, { ethAddress: from }] };
      let result = await requestsCollection.find(query).limit(1)
        .toArray();
      if (result.length == 0) {
        console.log("NO DB RECORD??")
        return;
      }
      await requestsCollection.updateOne(result[0], { $set: { burnt: true } });
      await sendBrc(result[0].btcAddress, ethers.formatEther(value))
      await requestsCollection.updateOne(result[0], { $set: { completed: true } });
      // Save TxID
      console.log(`✅ Bridge Back Finished. ${result[0].amount} xTAO bridged back from ${result[0].ethAddress} of Ethereum to ${result[0].btcAddress} of Bittensor`);
    } catch (err) {
      console.error('Error processing transaction', err)
      // TODO: return funds
    }
  } else {
    console.log('Something else triggered Transfer event')
  }
}

export const main = async () => {
  let options = {
    // filter: {
    //   value: ['1000', '1337'], //Only get events where transfer value was 1000 or 1337
    // },
    // fromBlock: 0, //Number || "earliest" || "pending" || "latest"
    // toBlock: 'latest',
  }
  destinationTokenContract.events
    .allEvents(options, (event) => {
      console.log({ event })
    })

  destinationTokenContract.events
    .Transfer(options)
    .on('data', async (event) => {
      handleDestinationEvent(
        event.returnValues.from, event.returnValues.to, event.returnValues.value,
        destinationWebSockerProvider,
        destinationTokenContract
      )
    })

  // const anotherWallet = "tb1qny6666d9cy39q4mxm9gauwk8ky9xx0r692vvun"
  // // const transferBack = await sendBrc(anotherWallet, 'euph', '10')

  // await sendInscription("a667d99e4f082a90abb964ab17f57f17c89ba19a00b109760f0769ee0401f1d9i0", anotherWallet)
}
