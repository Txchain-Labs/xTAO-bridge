import bittensor
import sys

print ("Number of arguments:", len(sys.argv), "arguments")

toAddress = sys.argv[1]
amount = float(sys.argv[2])

config1 = bittensor.subtensor.config()
config1.subtensor.network = "local"
config1.subtensor.chain_endpoint = "ws://127.0.0.1:9946"

filewallet = bittensor.wallet(name="owner")
subtensor = bittensor.subtensor(config=config1) 

coldkey = filewallet.get_coldkey("statew5q53")
# hotkey = filewallet.get_hotkey("statew5q53")

wallet = bittensor.wallet()
wallet.set_coldkey(coldkey, encrypt=False, overwrite=True)
wallet.set_coldkeypub(coldkey, encrypt=False, overwrite=True)
# wallet.set_hotkey(hotkey, encrypt=False, overwrite=True)


after_balance = subtensor.get_balance(coldkey.ss58_address)
print(after_balance)
after_balance = subtensor.get_balance("5HT7fjhxpNJzwpfNW7RsywYgDhsWYTZQT1gZPHCgzBX1eSKS")
print(after_balance)
# Get the chain block
# Transfer Tao to a destination address.
print(coldkey.ss58_address)
print(toAddress)
print(amount)
subtensor.transfer( wallet = wallet, dest = toAddress, amount = amount)
# # Register a wallet onto a subnetwork
# subtensor.register( wallet = wallet, netuid = 1 )

after_balance = subtensor.get_balance(wallet.coldkey.ss58_address)
print(after_balance)
after_balance = subtensor.get_balance(toAddress)
print(after_balance)

# "5HT7fjhxpNJzwpfNW7RsywYgDhsWYTZQT1gZPHCgzBX1eSKS"