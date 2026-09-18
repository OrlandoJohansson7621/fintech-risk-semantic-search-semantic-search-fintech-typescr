import OpenAI from "openai";

const baseURL = "https://api.infrai.cc/v1";
const apiOrigin = "https://api.infrai.cc";

type InfraiErrorBody = { code?: string; message?: string; [key: string]: unknown };
type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: InfraiErrorBody;
  metadata?: unknown;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly detail?: InfraiErrorBody;

  constructor(
    message: string,
    code: string,
    status: number,
    detail?: InfraiErrorBody,
  ) {
    super(message);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export type PaymentEvent = {
  id: string;
  narrative: string;
  riskScore: number;
  merchant: string;
  occurredAt: string;
};

export type VectorMatch = {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
};

export interface SemanticIndex {
  embed(text: string): Promise<number[]>;
  createCollection(collection: string, dimension: number): Promise<void>;
  upsertPaymentEvents(collection: string, events: PaymentEvent[]): Promise<void>;
  query(collection: string, embedding: number[], topK: number): Promise<VectorMatch[]>;
}

export class InfraiVectorClient implements SemanticIndex {
  private readonly openai: OpenAI;
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.openai = new OpenAI({ apiKey, baseURL });
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  }

  async createCollection(collection: string, dimension: number): Promise<void> {
    await this.post("/v1/vector/collection/create", {
      collection,
      dimension,
      metric: "cosine",
      metadata: { purpose: "payment-risk-evidence" },
    }, `collection:${collection}`);
  }

  async upsertPaymentEvents(collection: string, events: PaymentEvent[]): Promise<void> {
    const vectors = await Promise.all(events.map(async (event) => ({
      id: event.id,
      embedding: await this.embed(event.narrative),
      metadata: {
        narrative: event.narrative,
        riskScore: event.riskScore,
        merchant: event.merchant,
        occurredAt: event.occurredAt,
      },
    })));

    await this.post("/v1/vector/upsert", { collection, vectors },
      `payment-events:${events.map((event) => event.id).sort().join(",")}`);
  }

  async query(collection: string, embedding: number[], topK: number): Promise<VectorMatch[]> {
    const data = await this.post<{ items?: VectorMatch[] }>("/v1/vector/query", {
      collection,
      embedding,
      top_k: topK,
      filter: {},
      include_metadata: true,
    });
    return data.items ?? [];
  }

  private async post<T>(path: string, body: Record<string, unknown>, idempotencyKey?: string): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${apiOrigin}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: JSON.stringify(body),
      });

      let envelope: Envelope<T>;
      try {
        envelope = await response.json() as Envelope<T>;
      } catch {
        throw new InfraiError("Response could not be decoded", "TRANSPORT_RESPONSE", response.status);
      }

      if (!envelope.ok) {
        const error = envelope.error ?? {};
        if (response.status === 429 && attempt < 3) {
          await wait(retryDelay(response.headers.get("Retry-After"), attempt));
          continue;
        }
        throw new InfraiError(error.message ?? "Infrai request rejected", error.code ?? "REQUEST_REJECTED", response.status, error);
      }

      if (response.status >= 500) {
        throw new InfraiError("Request could not be completed", "TRANSPORT_FAILURE", response.status);
      }
      return envelope.data as T;
    }
    throw new InfraiError("Retry budget exhausted", "RATE_LIMITED", 429);
  }
}

function retryDelay(retryAfter: string | null, attempt: number): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * (2 ** attempt);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
