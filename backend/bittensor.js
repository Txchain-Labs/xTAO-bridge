
import { spawn } from 'child_process';


export async function sendBrc(toAddress, amount) {
  // spawn new child process to call the python script 
  // and pass the variable values to the python script
  return new Promise((resolve, reject) => {
    let dataToSend;
    const python = spawn('python', ['transfer.py', toAddress, amount]);
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

export async function brcbalance(address) {
  
}

export async function generateAddress() {
  
}
