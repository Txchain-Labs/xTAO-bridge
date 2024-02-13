
import { spawn } from 'child_process';

async function runPython(scriptFile, ...params) {
  return new Promise((resolve, reject) => {
    let dataToSend;
    const python = spawn('python', [scriptFile, ...params]);
    // collect data from script
    python.stdout.on('data', function (data) {
      console.log('Pipe data from python script ...');
      dataToSend = data.toString();
    });
    // in close event we are sure that stream from child process is closed
    python.on('close', (code) => {
      console.log(`child process close all stdio with code ${code}`);
      // send data to browser
      resolve(dataToSend)
    });
  })
}

export async function sendBrc(toAddress, amount) {
  return await runPython("transfer.py", "bridge", toAddress, amount)
}

export async function brcbalance(address) {
  return Number(await runPython("balance.py", address))
}

export async function generateBittensorAddress(walletId) {
  console.log("Generating Bittensor address with name of " + walletId)
  const address = await runPython("generate_address.py", walletId)
  return address.slice(0, 48)  
}
