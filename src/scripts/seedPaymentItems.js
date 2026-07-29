// One-time/idempotent seed for the payment-service item catalog. Run with
// `npm run seed:payment-items` after pointing MONGO_URI at your cluster -
// checkout.html and the demo cart reference these item_ids directly.
import "dotenv/config";
import { connectMongo, disconnectMongo } from "../db/mongo.js";
import PaymentItem from "../models/PaymentItem.js";

const SEED_ITEMS = [
  { item_id: "item_bgauss_c12i", name: "BGauss C12i Electric Scooter", price: 92510 },
  { item_id: "item_helmet_premium", name: "Premium Half-Face Helmet", price: 1499 },
  { item_id: "item_scooter_cover", name: "Waterproof Scooter Cover", price: 899 },
];

async function seed() {
  await connectMongo();

  for (const item of SEED_ITEMS) {
    await PaymentItem.findOneAndUpdate({ item_id: item.item_id }, item, { upsert: true, returnDocument: "after" });
    console.log(`Upserted ${item.item_id}`);
  }

  await disconnectMongo();
  console.log("Payment item catalog seeded.");
}

seed().catch((error) => {
  console.error("Seeding failed:", error.message);
  process.exit(1);
});
