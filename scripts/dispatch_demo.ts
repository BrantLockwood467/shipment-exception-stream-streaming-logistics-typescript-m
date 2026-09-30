const payload = {
  requestId: "4d458f10-305b-4d6d-bb8f-0e561227fab8",
  shipmentId: "SHP-2048",
  destination: "Suzhou sorting center",
  events: [
    {
      type: "in_transit",
      occurredAt: "2026-09-21T01:20:00.000Z",
      note: "Departed Shanghai hub",
    },
    {
      type: "exception",
      occurredAt: "2026-09-21T03:10:00.000Z",
      note: "Address confirmation requested",
    },
  ],
  proofOfDelivery: [],
};

const response = await fetch("http://localhost:3000/shipments/operations-brief", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

if (!response.ok || !response.body) {
  throw new Error(`Request failed with HTTP ${response.status}`);
}

const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  process.stdout.write(value);
}
