import cors from 'cors';
import express, { request } from 'express';
import session from 'express-session';
import cookieSession from 'cookie-session';
import { generateNonce, SiweMessage } from 'siwe';
import dotenv from 'dotenv';
dotenv.config();
import { requestsCollection, btcKeyPairsCollection } from './mongoConfig.js'
import { checkDeposit, checkJunks, main } from './controller.js';
import { generateBittensorAddress } from './bittensor.js'
import cron from 'node-cron';

cron.schedule('* * * * *', () => {
  console.log("======= CRON ========")
  checkDeposit();
  checkJunks();
});

main();

const app = express();
app.use(express.json());

//  Session setup
app.use(session({
  secret: 'wow very secret',
  cookie: {
    maxAge: 600000,
    secure: false
  },
  saveUninitialized: false,
  resave: false,
  unset: 'keep'
}));

app.use(cors({
  origin: ['http://localhost:3001', 'http://24.199.116.139:3001'],
  credentials: true,
  exposedHeaders: ['set-cookie']
}))

app.get('/nonce', async function (req, res) {
  req.session.nonce = generateNonce();
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send(req.session.nonce);
});

app.post('/verify', async function (req, res) {
  try {
    if (!req.body.message) {
      res.status(422).json({ message: 'Expected prepareMessage object as body.' });
      return;
    }

    let SIWEObject = new SiweMessage(req.body.message);
    const { data: message } = await SIWEObject.verify({ signature: req.body.signature, nonce: req.session.nonce });

    req.session.siwe = message;
    // req.session.cookie.expires = new Date(message.expirationTime);
    req.session.save(() => res.status(200).send(true));
  } catch (e) {
    req.session.siwe = null;
    req.session.nonce = null;
    console.error(e);
    switch (e) {
      // case ErrorTypes.EXPIRED_MESSAGE: {
      //   req.session.save(() => res.status(440).json({ message: e.message }));
      //   break;
      // }
      // case ErrorTypes.INVALID_SIGNATURE: {
      //   req.session.save(() => res.status(422).json({ message: e.message }));
      //   break;
      // }
      default: {
        req.session.save(() => res.status(500).json({ message: e.message }));
        break;
      }
    }
  }
});

app.get('/personal_information', function (req, res) {
  if (!req.session.siwe) {
    res.status(401).json({ message: 'You have to first sign_in' });
    return;
  }
  console.log("User is authenticated!");
  res.setHeader('Content-Type', 'text/plain');
  res.send(`You are authenticated and your address is: ${req.session.siwe.address}`);
});

const getPendingRequest = async function (address) {
  return await requestsCollection.findOne({ $and: [{ type: 0 }, { completed: false, ethAddress: address }] });
}

app.post('/receive_address', async function (req, res) {
  if (!req.session.siwe) {
    res.status(401).json({ message: 'You have to first sign_in' });
    return;
  }
  const request = await getPendingRequest(req.session.siwe.address);
  if (request) {
    res.status(200).json(request)
    return;
  }
  res.status(500).json({ message: `Please request first` });
});

app.post('/request_brc_to_erc', async function (req, res) {
  if (!req.session.siwe) {
    res.status(401).json({ message: 'You have to first sign_in' });
    return;
  }
  const pendingRequest = await getPendingRequest(req.session.siwe.address);
  if (pendingRequest) {
    res.status(500).json(pendingRequest);
    return;
  }
  // Store request
  const request = await requestsCollection.insertOne({
    type: 0,
    completed: false,
    deposited: false,
    burnt: false,
    ethAddress: req.session.siwe.address,
    amount: Number(req.body.amount),
  });
  const toAddress = await generateBittensorAddress(request.insertedId)
  await requestsCollection.updateOne({ _id: request.insertedId }, { $set: { btcAddress: toAddress } });
  res.status(200).json({ btcAddress: toAddress, amount: req.body.amount })
})

app.post('/request_erc_to_brc', async function (req, res) {
  if (!req.session.siwe) {
    res.status(401).json({ message: 'You have to first sign_in' });
    return;
  }
  await requestsCollection.insertOne({
    type: 1,
    completed: false,
    deposited: false,
    burnt: false,
    btcAddress: req.body.btcAddress,
    ethAddress: req.session.siwe.address,
  });
  res.status(200).json(true)
})


app.listen(4001, '0.0.0.0');
