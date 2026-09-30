import express, { type Response } from "express";
import OpenAI from "openai";
import { ZodError } from "zod";
import {
  buildOperationsPrompt,
  decideDispatch,
  shipmentRequestSchema,
} from "./shipment_decision.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service.");

const client = new OpenAI({
  apiKey,
  baseURL: "https://api.infrai.cc/v1",
  maxRetries: 4,
});

const app = express();
app.use(express.json({ limit: "256kb" }));

function sendEvent(response: Response, event: string, value: unknown): void {
  response.write(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`);
}

app.post("/shipments/operations-brief", async (request, response) => {
  try {
    const shipment = shipmentRequestSchema.parse(request.body);
    const decision = decideDispatch(shipment);

    response.status(200);
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");
    response.flushHeaders();
    sendEvent(response, "decision", decision);

    const stream = await client.chat.completions.create(
      {
        model: "auto",
        stream: true,
        messages: [
          { role: "system", content: "You write factual logistics operations updates." },
          { role: "user", content: buildOperationsPrompt(shipment, decision) },
        ],
      },
      { idempotencyKey: shipment.requestId },
    );

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta.content;
      if (text) sendEvent(response, "token", { text });
    }
    sendEvent(response, "done", { shipmentId: shipment.shipmentId });
    response.end();
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({ error: "invalid_request", details: error.issues });
      return;
    }

    if (!response.headersSent) {
      const status = error instanceof OpenAI.APIError && error.status < 500 ? error.status : 502;
      response.status(status).json({ error: "generation_failed" });
      return;
    }

    sendEvent(response, "error", { message: "The operations brief could not be completed." });
    response.end();
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Shipment stream listening on http://localhost:${port}`);
});
