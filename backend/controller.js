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

let THIRTY_MINUTES = 10 * 60 * 1000;

const DESTINATION_TOKEN_CONTRACT_ADDRESS =
  process.env.DESTINATION_TOKEN_CONTRACT_ADDRESS
const BRIDGE_WALLET = process.env.BRIDGE_WALLET


const wsProvider = new Web3.providers.WebsocketProvider(
  "wss://eth-sepolia.g.alchemy.com/v2/EiMk6jiht1swIUQsPCnIJcNLku7kMMw-",
  {
    clientConfig: {
      keepalive: true,
      keepaliveInterval: 60000
    },
    reconnect: {
      auto: true,
      delay: 5000,
      maxAttempts: 5,
      onTimeout: false
    }
  }
);
wsProvider.on('connect', () => {
  console.log("Websocket connected.");
});
wsProvider.on('close', (event) => {
  console.log(event);
  console.log("Websocket closed.");
});
wsProvider.on('error', (error) => {
  console.error(error);
});
const destinationWebSockerProvider = new Web3(wsProvider);
const destinationTokenContract = new destinationWebSockerProvider.eth.Contract(QCHSD_ABIJSON.abi, DESTINATION_TOKEN_CONTRACT_ADDRESS);
destinationWebSockerProvider.eth.subscribe("newBlockHeaders")
  .on('data', (data) => {
    console.log(
      `Received block header for block number ${data.number}.`
    );
  }).on('error', (error) => {
    console.error(error);
    console.error(
      "An error occured on the new blocks subscription."
    );
  }).on('connected', (id) => {
    console.log(
      `NewBlockHeaders subscription connected (${id})`
    );
  });


let options = {
  // filter: {
  //   value: ['1000', '1337'], //Only get events where transfer value was 1000 or 1337
  // },
  // fromBlock: 0, //Number || "earliest" || "pending" || "latest"
  // toBlock: 'latest',
}
destinationTokenContract.events
  .Transfer(options)
  .on('data', async (event) => {
    handleDestinationEvent(
      event.returnValues.from, event.returnValues.to, event.returnValues.value,
    )
  })

export async function checkDeposit() {
  console.log("💰 DEPOSIT CHECKING")
  let query = { $and: [{ type: 0 }, { completed: false }, { deposited: false }] };
  let result = await requestsCollection.find(query)
    .toArray();
  if (result.length == 0) return;
  for (let i = 0; i < result.length; i++) {
    const balance = await brcbalance(result[i].btcAddress)
    if (balance >= result[i].amount) {
      await requestsCollection.updateOne(result[i], { $set: { deposited: true } })
      console.log("💰 DEPOSITed! So minting now!")
      await mintTokens(ethers.parseUnits(String(result[i].amount), 18), result[i].ethAddress)
    }
  }
}

export async function checkJunks() {
  console.log("🔂 JUNK REQUESTS CHECKING")
  let bridges = await requestsCollection.find({ type: 0, completed: false, deposited: false })
    .toArray();
  let bridgeBacks = await requestsCollection.find({ type: 1, completed: false, transferred: false })
    .toArray();
  const result = [...bridges, ...bridgeBacks]

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
) => {
  console.log('handleMintedEvent')
  console.log('from :>> ', to)
  console.log('value :>> ', value)
  console.log('============================')

  console.log('Tokens minted')

  let query = { $and: [{ type: 0 }, { completed: false }, { deposited: true }, { ethAddress: to }] };
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
) => {
  console.log('handleDestinationEvent')
  console.log('to :>> ', to)
  console.log('from :>> ', from)
  console.log('value :>> ', value)
  console.log('============================')

  if (from == process.env.WALLET_ZERO) {
    handleMintedEvent(to, value)
    return
  }
  if (to == BRIDGE_WALLET && to != from) {
    console.log(
      'Tokens received on bridge from destination chain! Time to bridge back!'
    )
    let query = { $and: [{ type: 1 }, { completed: false }, { transferred: false }, { ethAddress: from }] };
    let result = await requestsCollection.find(query).limit(1)
      .toArray();

    if (result.length == 0) {
      console.log("NO DB RECORD??")
      return;
    }
    await requestsCollection.updateOne(result[0], { $set: { transferred: true } });

    try {
      // we need to approve burn, then burn
      const tokenBurnApproved = await approveForBurn(
        value
      )
      if (!tokenBurnApproved) return
      console.log('Tokens approved to be burnt')
      const tokensBurnt = await burnTokens(value)
      if (!tokensBurnt) return
      console.log(
        'Tokens burnt on destination, time to transfer tokens in BTC side'
      )
      await requestsCollection.updateOne({ _id: result[0]._id }, { $set: { burnt: true } });
      await sendBrc(result[0].btcAddress, ethers.formatEther(value))
      await requestsCollection.updateOne({ _id: result[0]._id }, { $set: { completed: true } });
      // Save TxID
      console.log(`✅ Bridge Back Finished. ${ethers.formatEther(value)} xTAO bridged back from ${result[0].ethAddress} of Ethereum to ${result[0].btcAddress} of Bittensor`);
    } catch (err) {
      console.error('Error processing transaction', err)
      // TODO: return funds
    }
  } else {
    console.log('Something else triggered Transfer event')
  }
}
