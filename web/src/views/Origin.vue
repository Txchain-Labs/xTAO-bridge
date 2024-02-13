<template>
  <div class="text-center pt-12">
    <h1 class="text-2xl font-bold mb-8">
      Bridge from {{ originNetwork }} to {{ destinationNetwork }}
    </h1>

    <p>
      This bridge allows you to send TAO from {{ originNetwork }} to {{ destinationNetwork }}.
    </p>
    <p>
      You'll be given your address to send when you click Bridge.
    </p>
    <p>Once you send tao to the address, same amount of xTao tokens will be minted on your {{ destinationNetwork }} wallet
      connected.</p>

    <div style="margin-top: 100px;"></div>
    <WalletConnect class="my-4" :targetNetwork="originNetwork" :targetNetworkId="originNetworkId" :currency="ETH"
      :decimals="18" />
    <div v-if="walletStore.signature">
      <div v-if="pendingStatus == 1" style="margin-top: 20px;">
        Wait! You already have pending request:
      </div>
      <div v-if="pendingStatus == 2" style="margin-top: 20px;">
        You don't have pending request
      </div>
      <div style="margin-top: 20px;" v-if="walletStore.btcReceivingAddress != ''">
        You should send <b>{{ walletStore.pendingAmount }}</b> Tao to <b>{{ walletStore.btcReceivingAddress }}</b>
      </div>
      <button style="margin-top: 20px;" v-else v-if="!pendingStatus" type="button" @click="checkPendingRequest"
        class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500">
        Check pending request
      </button>
      <form class="w-96 mt-8 mx-auto" v-if="walletStore.btcReceivingAddress == ''">
        <label for="price" class="block mb-2 font-medium text-gray-700">How much TAO do you want to bridge?</label>
        <div class="mt-4 w-2/3 mx-auto relative rounded-md shadow-sm">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span class="text-gray-500 sm:text-sm">τ</span>
          </div>
          <input type="number" v-model="amount" name="price" id="price"
            class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
            placeholder="0.00" aria-describedby="price-currency" />
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span class="text-gray-500 sm:text-sm" id="price-currency">
              TAO
            </span>
          </div>
        </div>
        <button type="button" 
          :disabled="walletStore.address == '' || amount == '' || trxInProgress"
          :class="walletStore.address == '' || amount == '' || trxInProgress ? 'bg-gray-400' : 'hover:bg-indigo-600 bg-indigo-500'"
          class="inline-flex items-center px-4 py-2 mt-4 border border-transparent shadow-sm text-base font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          @click="sendTokens">
          <svg xmlns="http://www.w3.org/2000/svg" class="m-ml-1 mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {{
            trxInProgress ? `Processing...` : `Bridge to ${destinationNetwork}`
          }}
        </button>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { ethers, BigNumber } from 'ethers'

import { useWalletStore } from '../stores/wallet'
import WalletConnect from '@/components/WalletConnect.vue'

import ChainstackDollars from '@/artifacts/contracts/OriginToken.sol/ChainstackDollars.json'

import axios from "axios";

export default defineComponent({
  components: { WalletConnect },
  setup() {
    const trxInProgress = ref<boolean>(false)
    const walletStore = useWalletStore()
    const amount = ref<String>('')
    const pendingStatus = ref<number>(0)

    const originTokenAddress = import.meta.env.VITE_ORIGIN_TOKEN_ADDRESS

    const originNetwork = import.meta.env.VITE_ORIGIN_NETWORK_NAME
    const originNetworkId = import.meta.env.VITE_ORIGIN_NETWORK_ID
    const destinationNetwork = import.meta.env.VITE_DESTINATION_NETWORK_NAME

    const bridgeWallet = import.meta.env.VITE_BRIDGE_WALLET

    const provider = new ethers.BrowserProvider(window.ethereum)
    // get the account that will pay for the trasaction
    const signer = provider.getSigner()

    let contract = new ethers.Contract(
      originTokenAddress,
      ChainstackDollars.abi,
      signer
    )

    const checkPendingRequest = async function () {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const { data } = await axios.post(import.meta.env.VITE_BACKEND_API + '/receive_address', {}, { withCredentials: true })
          walletStore.savePendingRequestInfo(data.btcAddress, data.amount);
          pendingStatus.value = 1
        } catch (error: any) {
          pendingStatus.value = 2
        }
      }
    }

    const sendTokens = async function () {
      const amountFormatted = ethers.parseUnits(String(amount.value), 18)
      console.log('amountFormatted :>> ', amountFormatted)
      console.log('amountFormatted.toString() :>> ', amountFormatted.toString())

      //@ts-expect-error Window.ethers not TS
      if (typeof window.ethereum !== 'undefined') {
        trxInProgress.value = true
        //@ts-expect-error Window.ethers not TS
        // const provider = new ethers.providers.Web3Provider(window.ethereum)
        // get the account that will pay for the trasaction
        // const signer = provider.getSigner()
        // as the operation we're going to do is a transaction,
        // we pass the signer instead of the provider
        // const contract = new ethers.Contract(
        //   contractAddress,
        //   ChainstackDollars.abi,
        //   signer
        // )
        try {
          const { data } = await axios.post(import.meta.env.VITE_BACKEND_API + '/request_brc_to_erc', {
            amount: amount.value,
          }, { withCredentials: true })
          walletStore.savePendingRequestInfo(data?.btcAddress, data?.amount);
          pendingStatus.value = 0
        } catch (error: any) {
          if (error.response.status === 401) {
            alert("You need to sign in first");
          } else if (error.response.status === 500) {
            pendingStatus.value = 1
            walletStore.savePendingRequestInfo(error?.response?.data?.btcAddress, error?.response?.data?.amount);
          }
        }
        trxInProgress.value = false

      }
    }


    return {
      walletStore,
      trxInProgress,
      amount,
      sendTokens,
      originNetwork,
      originNetworkId,
      destinationNetwork,
      checkPendingRequest,
      pendingStatus,
    }
  },

  mounted() {
  },

  computed: {
    accAvailable() {
      return useWalletStore().address
    },
  },
})
</script>
