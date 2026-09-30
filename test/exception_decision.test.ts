import assert from "node:assert/strict";
import test from "node:test";
import { decideDispatch, shipmentRequestSchema } from "../src/shipment_decision.js";

test("routes the latest shipment exception to manual review", () => {
  const shipment = shipmentRequestSchema.parse({
    requestId: "3e128c55-9d6f-4ee9-ab17-c66a38040815",
    shipmentId: "SHP-2048",
    destination: "Suzhou sorting center",
    events: [
      { type: "in_transit", occurredAt: "2026-09-21T01:20:00.000Z", note: "Departed hub" },
      { type: "exception", occurredAt: "2026-09-21T03:10:00.000Z", note: "Confirm address" },
    ],
    proofOfDelivery: [],
  });

  assert.deepEqual(decideDispatch(shipment), {
    status: "manual_review",
    reason: "latest carrier event is an exception",
  });
});

test("accepts delivery only when a proof file is present", () => {
  const delivered = shipmentRequestSchema.parse({
    requestId: "5531e2cd-7b9c-4514-8f1e-c60a8a1ca831",
    shipmentId: "SHP-2049",
    destination: "Hangzhou depot",
    events: [{ type: "delivered", occurredAt: "2026-09-21T05:30:00.000Z", note: "Received" }],
    proofOfDelivery: [{
      name: "signature.pdf",
      mediaType: "application/pdf",
      downloadUrl: "https://files.example.com/signature.pdf",
    }],
  });

  assert.equal(decideDispatch(delivered).status, "delivered");
});
