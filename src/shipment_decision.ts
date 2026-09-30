import { z } from "zod";

export const shipmentRequestSchema = z.object({
  requestId: z.string().uuid(),
  shipmentId: z.string().min(1),
  destination: z.string().min(2),
  events: z.array(z.object({
    type: z.enum(["picked_up", "in_transit", "out_for_delivery", "delivered", "exception"]),
    occurredAt: z.string().datetime(),
    note: z.string().min(1),
  })).min(1),
  proofOfDelivery: z.array(z.object({
    name: z.string().min(1),
    mediaType: z.enum(["image/jpeg", "image/png", "application/pdf"]),
    downloadUrl: z.string().url(),
  })).default([]),
});

export type ShipmentRequest = z.infer<typeof shipmentRequestSchema>;

export type DispatchDecision = {
  status: "monitoring" | "manual_review" | "delivered";
  reason: string;
};

export function decideDispatch(shipment: ShipmentRequest): DispatchDecision {
  const latest = [...shipment.events].sort((a, b) =>
    Date.parse(b.occurredAt) - Date.parse(a.occurredAt)
  )[0];

  if (latest.type === "exception") {
    return { status: "manual_review", reason: "latest carrier event is an exception" };
  }

  if (latest.type === "delivered" && shipment.proofOfDelivery.length === 0) {
    return { status: "manual_review", reason: "delivery has no proof file" };
  }

  if (latest.type === "delivered") {
    return { status: "delivered", reason: "delivery and proof file are present" };
  }

  return { status: "monitoring", reason: "shipment is still moving" };
}

export function buildOperationsPrompt(shipment: ShipmentRequest, decision: DispatchDecision): string {
  return [
    `Shipment ${shipment.shipmentId} is headed to ${shipment.destination}.`,
    `Workflow status: ${decision.status}. Reason: ${decision.reason}.`,
    `Events: ${JSON.stringify(shipment.events)}.`,
    `Proof-of-delivery files: ${JSON.stringify(shipment.proofOfDelivery)}.`,
    "Write a concise dispatcher update with the next action. Do not invent shipment facts.",
  ].join("\n");
}
