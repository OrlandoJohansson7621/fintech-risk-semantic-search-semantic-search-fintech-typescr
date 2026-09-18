import type { SemanticIndex, VectorMatch } from "./infrai_vector.js";

export type RiskSearchRequest = {
  paymentId: string;
  query: string;
  reviewThreshold: number;
  topK: number;
};

export type RiskSearchResult = {
  paymentId: string;
  action: "allow" | "review";
  notification: {
    kind: "payment.risk_assessed";
    reason: string;
    evidenceIds: string[];
  };
  matches: VectorMatch[];
};

export async function assessPaymentRisk(
  index: SemanticIndex,
  collection: string,
  request: RiskSearchRequest,
): Promise<RiskSearchResult> {
  const embedding = await index.embed(request.query);
  const matches = await index.query(collection, embedding, request.topK);
  const highRiskEvidence = matches.filter((match) => {
    const score = Number(match.metadata?.riskScore ?? 0);
    return score >= request.reviewThreshold;
  });
  const action = highRiskEvidence.length > 0 ? "review" : "allow";
  const evidenceIds = highRiskEvidence.map((match) => match.id);

  return {
    paymentId: request.paymentId,
    action,
    notification: {
      kind: "payment.risk_assessed",
      reason: action === "review"
        ? `Similar history met the ${request.reviewThreshold} risk threshold.`
        : `No similar history met the ${request.reviewThreshold} risk threshold.`,
      evidenceIds,
    },
    matches,
  };
}
