import bittensor
# Bittensor's chain interface.


config1 = bittensor.subtensor.config()
config1.subtensor.network = "local"
config1.subtensor.chain_endpoint = "ws://127.0.0.1:9946"

wallet = bittensor.wallet(name="owner")
subtensor = bittensor.subtensor(config=config1) 
after_balance = subtensor.get_balance(wallet.coldkey.ss58_address)
print(after_balance)
# Get the chain block
# Transfer Tao to a destination address.
subtensor.transfer( wallet = wallet, dest = "5HT7fjhxpNJzwpfNW7RsywYgDhsWYTZQT1gZPHCgzBX1eSKS", amount = 10.0)
# # Register a wallet onto a subnetwork
# subtensor.register( wallet = wallet, netuid = 1 )

after_balance = subtensor.get_balance(wallet.coldkey.ss58_address)
print(after_balance)
after_balance = subtensor.get_balance("5HT7fjhxpNJzwpfNW7RsywYgDhsWYTZQT1gZPHCgzBX1eSKS")
print(after_balance)
