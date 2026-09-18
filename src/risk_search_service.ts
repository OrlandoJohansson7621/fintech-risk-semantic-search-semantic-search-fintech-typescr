import { createServer } from "node:http";
import { z } from "zod";
import { InfraiError, InfraiVectorClient } from "./infrai_vector.js";
import { assessPaymentRisk, type RiskSearchRequest } from "./risk_decision.js";

const requestSchema = z.object({
  paymentId: z.string().min(1),
  query: z.string().min(3).max(1_000),
  reviewThreshold: z.number().min(0).max(1).default(0.8),
  topK: z.number().int().min(1).max(20).default(5),
}).strict();

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

const collection = process.env.INFRAI_COLLECTION ?? "payment-risk-events";
const port = Number(process.env.PORT ?? 3000);
const index = new InfraiVectorClient(apiKey);

createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/risk/search") {
    return send(response, 404, { error: "Route not found" });
  }

  try {
    const parsed = requestSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return send(response, 400, { error: "Invalid request", issues: parsed.error.issues });
    }
    const validatedRequest: RiskSearchRequest = {
      paymentId: parsed.data.paymentId!,
      query: parsed.data.query!,
      reviewThreshold: parsed.data.reviewThreshold!,
      topK: parsed.data.topK!,
    };
    const result = await assessPaymentRisk(index, collection, validatedRequest);
    return send(response, 200, result);
  } catch (error) {
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      return send(response, status, { error: error.message, code: error.code });
    }
    return send(response, 400, { error: error instanceof Error ? error.message : "Invalid request" });
  }
}).listen(port, () => {
  console.log(`Risk search listening on http://localhost:${port}`);
});

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(response: import("node:http").ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}
