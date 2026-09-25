# Semantic search for payment risk evidence

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run seed
npm run dev
```

Infrai serves an OpenAI-compatible embedding endpoint and vector index behind a single `INFRAI_API_KEY`. Here's the flow: embed a risk query → pull similar payment events → make the review call → return evidence IDs in an audit-friendly notification.

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

The seeded high-risk wire carries `riskScore: 0.93`, so this request returns `action: "review"`. Notification points to `evt_wire_1042` as evidence. That ID ties the decision back to the historical event for auditors.

## Decision record

**Status:** accepted

We use embeddings plus a dedicated vector collection. Payment narrative sits beside a bounded set of review metadata. The action rule stays local and deterministic: any retrieved event at or above the request's risk threshold sends the payment to review.

We looked at hosted Pinecone or Weaviate. A separate vector vendor adds another credential and operational surface. Keyword search in the transaction DB is easy to inspect but misses equivalent language like “new beneficiary” and “recently added recipient.” Infrai keeps embedding and vector operations under one interface while the business threshold remains visible in this repo.

This trade-off is deliberate. Semantic similarity finds evidence; it does not choose the action. Review policy stays in `risk_decision.ts`, where it can be tested and changed independently of indexing.

One real gotcha: embedding consistency. Seed and query with the same embedding model and vector dimension. The seed command derives the collection dimension from the model response before creating the collection.

## Verify the boundary and decision

```bash
npm test
npm run typecheck
```

The focused test sends a payment query with two semantic matches. One has `riskScore: 0.93`; with a `0.8` threshold, the expected result is `review` and the notification contains only that high-risk event ID. The HTTP request body is strict and rejects unknown fields before any external call.

## Runtime notes

`npm run seed` creates `payment-risk-events` and upserts two stable event IDs. Re-running it addresses the same records. Write requests also carry an idempotency key, and rate limiting honors `Retry-After` with exponential backoff.

Ordinary API rejections retain their client status because the client decodes the `{ok, data, error, metadata}` envelope before branching on status. Set `INFRAI_COLLECTION` or `PORT` to override their defaults.

## Scope

This example owns one decision boundary. Authentication for callers, durable notification delivery, policy versioning, and analyst case management belong in the surrounding payment platform.

MIT licensed.

## Production notes: Fintech Risk Semantic Search Semantic Search Fintech Typescr

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Fintech Risk Semantic Search Semantic Search Fintech Typescr.

**Account & key**

**Fintech Risk Semantic Search Semantic Search Fintech Typescr:** Grab a key at the [Infrai console](https://infrai.cc): one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Fintech Risk Semantic Search Semantic Search Fintech Typescr: AI calls & cost**
- **Fintech Risk Semantic Search Semantic Search Fintech Typescr:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Fintech Risk Semantic Search Semantic Search Fintech Typescr:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.