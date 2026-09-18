import { InfraiVectorClient, type PaymentEvent } from "./infrai_vector.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before seeding payment events");

const collection = process.env.INFRAI_COLLECTION ?? "payment-risk-events";
const events: PaymentEvent[] = [
  {
    id: "evt_wire_1042",
    narrative: "New device initiated a high-value cross-border wire shortly after beneficiary creation",
    riskScore: 0.93,
    merchant: "International Wire",
    occurredAt: "2026-08-19T10:14:00Z",
  },
  {
    id: "evt_card_2088",
    narrative: "Recurring card payment to an established utility provider from the usual device",
    riskScore: 0.08,
    merchant: "North Grid Utility",
    occurredAt: "2026-08-20T08:00:00Z",
  },
];

const index = new InfraiVectorClient(apiKey);
const dimension = (await index.embed(events[0].narrative)).length;
await index.createCollection(collection, dimension);
await index.upsertPaymentEvents(collection, events);
console.log(JSON.stringify({ collection, indexed: events.map((event) => event.id) }, null, 2));
