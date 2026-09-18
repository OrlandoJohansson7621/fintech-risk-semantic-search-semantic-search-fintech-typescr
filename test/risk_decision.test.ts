import assert from "node:assert/strict";
import test from "node:test";
import type { SemanticIndex } from "../src/infrai_vector.js";
import { assessPaymentRisk } from "../src/risk_decision.js";

test("routes a payment to review and records the matching evidence", async () => {
  const index: SemanticIndex = {
    embed: async () => [0.1, 0.2],
    createCollection: async () => undefined,
    upsertPaymentEvents: async () => undefined,
    query: async () => [
      { id: "evt_wire_1042", score: 0.91, metadata: { riskScore: 0.93 } },
      { id: "evt_card_2088", score: 0.72, metadata: { riskScore: 0.08 } },
    ],
  };

  const result = await assessPaymentRisk(index, "payment-risk-events", {
    paymentId: "pay_9001",
    query: "new beneficiary followed by an unusual international wire",
    reviewThreshold: 0.8,
    topK: 5,
  });

  assert.equal(result.action, "review");
  assert.deepEqual(result.notification.evidenceIds, ["evt_wire_1042"]);
  assert.equal(result.notification.kind, "payment.risk_assessed");
});
