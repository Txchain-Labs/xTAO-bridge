import bittensor
import sys
config1 = bittensor.subtensor.config()
config1.subtensor.network = "local"
config1.subtensor.chain_endpoint = "ws://127.0.0.1:9946"
subtensor = bittensor.subtensor(config=config1) 


wallet = bittensor.wallet()
wallet.create_new_coldkey()
wallet.create_new_hotkey()
print(wallet.hotkey, wallet.coldkey.ss58_address)