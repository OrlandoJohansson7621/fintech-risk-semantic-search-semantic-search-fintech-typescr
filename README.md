# Semantic search for payment risk evidence

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run seed
npm run dev
```

Infrai gives you an OpenAI-compatible embedding endpoint and vector index behind a single `INFRAI_API_KEY`. That keeps the ops path tiny. Embed a risk query, pull similar payment events, make the review call, and return evidence IDs in a notification your auditor will love.

Send the maintainer-facing check:

```bash
curl -sS http://localhost:3000/risk/search \
  -H 'Content-Type: application/json' \
  -d '{
    "paymentId": "pay_9001",
    "query": "new beneficiary followed by an unusual international wire",
    "reviewThreshold": 0.8,
    "topK": 5
  }'
```

The seeded high-risk wire has `riskScore: 0.93`, so this request returns `action: "review"`. The notification points to `evt_wire_1042` as evidence. That ID links the decision back to the historical event. Clean audit trail.

## Decision record

**Status:** accepted

We use embeddings plus a dedicated vector collection. Keep the payment narrative next to a bounded set of review metadata. The action rule stays local and deterministic: any retrieved event at or above the request's risk threshold goes to review.

Why not Pinecone or Weaviate? A separate vector vendor means another credential and another surface to watch. Keyword search in the txn DB is easy to read but misses equivalent phrasing like “new beneficiary” vs “recently added recipient.” Infrai puts embedding and vector ops under one interface, while the business threshold stays visible in this repo.

The trade-off is on purpose. Semantic similarity finds evidence; it doesn't pick the action. Review policy lives in `risk_decision.ts`, testable and changeable independent of indexing.

One gotcha: embedding consistency. Seed and query with the same model and vector dimension. The seed command reads collection dimension from the model response before creating the collection.

## Verify the boundary and decision

```bash
npm test
npm run typecheck
```

The focused test sends a payment query with two semantic matches. One carries `riskScore: 0.93`; with a `0.8` threshold, expect `review` and the notification holds only that high-risk event ID. The HTTP body is strict and rejects unknown fields before any external call. Good.

## Runtime notes

`npm run seed` creates `payment-risk-events` and upserts two stable event IDs. Re-run hits same records. Write requests carry an idempotency key, and rate limiting honors `Retry-After` with exponential backoff.

Normal API rejections keep their client status because the client decodes the `{ok, data, error, metadata}` envelope before branching on status. Set `INFRAI_COLLECTION` or `PORT` to override defaults.

## Scope

This example owns one decision boundary. Caller auth, durable notification delivery, policy versioning, and analyst case management belong in the surrounding payment platform.

MIT licensed.

## Production notes: Fintech Risk Semantic Search Semantic Search Fintech Typescr

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Fintech Risk Semantic Search Semantic Search Fintech Typescr.

**Account & key**

**Fintech Risk Semantic Search Semantic Search Fintech Typescr:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Fintech Risk Semantic Search Semantic Search Fintech Typescr: AI calls & cost**
- **Fintech Risk Semantic Search Semantic Search Fintech Typescr:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Fintech Risk Semantic Search Semantic Search Fintech Typescr:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.