import "dotenv/config";
import process from "node:process";
import app from "./app.js";
import { disconnectMongo } from "./db/mongo.js";

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Maacko backend running on port ${PORT}`);
});

function shutdown() {
  server.close(async () => {
    await disconnectMongo();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
