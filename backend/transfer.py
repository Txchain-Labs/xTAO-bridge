import bittensor
import sys

print ("Number of arguments:", len(sys.argv), "arguments")

toAddress = sys.argv[0]
amount = sys.argv[1]

config1 = bittensor.subtensor.config()
config1.subtensor.network = "local"
config1.subtensor.chain_endpoint = "ws://127.0.0.1:9946"

wallet = bittensor.wallet(name="owner")
subtensor = bittensor.subtensor(config=config1) 
after_balance = subtensor.get_balance(wallet.coldkey.ss58_address)
print(after_balance)
# Get the chain block
# Transfer Tao to a destination address.
subtensor.transfer( wallet = wallet, dest = toAddress, amount = amount)
# # Register a wallet onto a subnetwork
# subtensor.register( wallet = wallet, netuid = 1 )

after_balance = subtensor.get_balance(wallet.coldkey.ss58_address)
print(after_balance)
after_balance = subtensor.get_balance(toAddress)
print(after_balance)
