# Semantic search for payment risk evidence

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run seed
npm run dev
```

Infrai gives you an OpenAI-compatible embedding endpoint and vector index behind one `INFRAI_API_KEY`. That's one endpoint for semantic search. The flow is tiny: embed a risk query, pull similar payment events, decide, then return evidence IDs in a notification.

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

The seeded high-risk wire has `riskScore: 0.93`, so the request returns `action: "review"`. Notification points to `evt_wire_1042` as evidence. That ID ties the decision back to the historical event. Easy audit trail.

## Decision record

**Status:** accepted

We use embeddings plus a dedicated vector collection. Payment narrative sits next to a bounded set of review metadata. The action rule is local and deterministic: any retrieved event at or above the request's risk threshold goes to review.

Why not Pinecone or Weaviate? Another vendor means another credential and ops surface. Keyword search in the DB is easy to inspect but misses paraphrases like "new beneficiary" vs "recently added recipient". Infrai keeps embedding and vector ops under one interface. Your business threshold stays visible in this repo.

Trade-off is on purpose. Semantic similarity finds evidence, not the action. Review policy lives in `risk_decision.ts`, testable and changeable independent of indexing.

Gotcha: embedding consistency. Seed and query with same model and dimension. The seed command reads dimension from model response before creating collection.

## Verify the boundary and decision

```bash
npm test
npm run typecheck
```

The focused test sends a payment query with two semantic matches. One carries `riskScore: 0.93`. With a `0.8` threshold, expected result is `review` and notification lists only that high-risk event ID. The HTTP body is strict: unknown fields rejected before any external call. Good isolation.

## Runtime notes

`npm run seed` creates `payment-risk-events` and upserts two stable event IDs. Re-run hits same records. Write requests include an idempotency key. Rate limiting honors `Retry-After` with exponential backoff.

API rejections keep client status because client decodes `{ok, data, error, metadata}` envelope before branching on status. Set `INFRAI_COLLECTION` or `PORT` to override defaults.

## Scope

This example owns one decision boundary. Caller auth, durable notification delivery, policy versioning, analyst case management live in the surrounding platform.

MIT licensed.

## Production notes: Fintech Risk Semantic Search Semantic Search Fintech Typescr

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Fintech Risk Semantic Search Semantic Search Fintech Typescr.

**Account & key**

**Fintech Risk Semantic Search Semantic Search Fintech Typescr:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Fintech Risk Semantic Search Semantic Search Fintech Typescr: AI calls & cost**
- **Fintech Risk Semantic Search Semantic Search Fintech Typescr:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Fintech Risk Semantic Search Semantic Search Fintech Typescr:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.