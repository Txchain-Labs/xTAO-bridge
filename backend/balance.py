import bittensor
import sys
config1 = bittensor.subtensor.config()
config1.subtensor.network = "local"
config1.subtensor.chain_endpoint = "ws://127.0.0.1:9946"
subtensor = bittensor.subtensor(config=config1) 


address = sys.argv[1]
after_balance = subtensor.get_balance(address)
print(after_balance)
