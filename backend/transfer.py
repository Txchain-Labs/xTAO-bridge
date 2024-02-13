import bittensor
import sys

fromWalletName = sys.argv[1]
toAddress = sys.argv[2]
amount = float(sys.argv[3])

config = bittensor.subtensor.config()
config.subtensor.network = "local"
config.subtensor.chain_endpoint = "ws://127.0.0.1:9946"

wallet = bittensor.wallet(name=fromWalletName)
subtensor = bittensor.subtensor(config=config) 

subtensor.transfer( wallet = wallet, dest = toAddress, amount = amount)

after_balance = subtensor.get_balance(wallet.coldkey.ss58_address)
print("Sender Balance:")
print(after_balance)
after_balance = subtensor.get_balance(toAddress)
print("Receiver Balance:")
print(after_balance)
