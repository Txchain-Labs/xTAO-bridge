import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.ATLAS_URI;
const client = new MongoClient(connectionString);
await client.connect();
export const db = client.db("xtao-bridge");
export const requestsCollection = await db.collection("requests");
export const btcKeyPairsCollection = await db.collection("tao_keypairs");
