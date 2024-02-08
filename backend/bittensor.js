
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
  return await runPython("transfer.py", toAddress, amount)
}

export async function brcbalance(address) {
  return await runPython("balance.py", address)
}

export async function generateBittensorAddress() {
  return { receivingAddress: '5C8LGTTmdqqox8R9MGejBTCPENhq8asMLD8R1c1CmrLpgoCd' }
  return await runPython("generate_address.py")
}
