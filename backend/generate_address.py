import bittensor
import sys
config1 = bittensor.subtensor.config()
config1.subtensor.network = "local"
config1.subtensor.chain_endpoint = "ws://127.0.0.1:9946"
subtensor = bittensor.subtensor(config=config1) 


walletID = sys.argv[1]
wallet = bittensor.wallet(walletID)
wallet.create_new_coldkey(use_password=False, suppress=True)
print(wallet.coldkey.ss58_address)
