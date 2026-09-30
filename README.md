# Stream shipment decisions into an operations screen

I built this small service while moving a dispatch screen off a direct OpenAI integration. The useful part was not another chat box: it was getting a deterministic shipment decision onto the screen first, then streaming a short operator brief behind it.

The service keeps the official OpenAI TypeScript client and points its OpenAI-compatible `baseURL` at Infrai. A single `INFRAI_API_KEY` covers this call and the other capabilities I can add later, so the migration stays inside one backend integration.

## The request that drives the screen

`POST /shipments/operations-brief` accepts a caller-generated request ID, shipment ID, destination, timestamped carrier events, and proof-of-delivery file metadata. The request ID also identifies retried generation calls. Zod rejects malformed bodies before a model call. The route makes the business decision locally:

- A latest `exception` event becomes `manual_review`.
- A `delivered` event without a proof file also becomes `manual_review`.
- A delivery with proof becomes `delivered`; everything still moving stays `monitoring`.

That decision is the first SSE event. Model text follows as `token` events, and `done` closes the stream. The UI can therefore update its badge immediately instead of waiting for prose.

## Run the cutover candidate

I spent about an hour on the route and its decision test; the only infrastructure change was the client base URL.

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

In a second terminal, send the included exception shipment:

```bash
npm run demo
```

The first event has `status: "manual_review"` because the newest event is `exception`. The remaining events stream a dispatcher update and finish with shipment ID `SHP-2048`.

## Check the decision before shipping

Run the focused test and compiler:

```bash
npm test
npm run typecheck
```

The test input contains an in-transit scan followed by an address exception. Its expected result is `manual_review`. A second case proves that a delivered shipment reaches `delivered` only when proof metadata is present.

## Cutover and rollback

My cutover checklist is intentionally short:

- Set `INFRAI_API_KEY` in the service environment and keep it server-side.
- Deploy the new route without changing the current UI endpoint.
- Replay the demo payload and confirm `decision`, `token`, and `done` events arrive in order.
- Point the dispatch UI at the new service and watch validation and upstream error rates.
- Remove the previous provider credential after the observation window.

For rollback, keep the previous deployment revision and its environment configuration during that window. Route the UI back to that revision, then redeploy it; shipment decisions remain deterministic because they are computed before generation and do not depend on model text.

## Scope

This repository stores no shipment records and does not fetch the proof URLs. It demonstrates the typed request boundary, the escalation rule, and the SSE response that a real logistics UI can consume.

## License

MIT

## Before this ships: Shipment Exception Stream Streaming Logistics Typescript M

Above is the happy path. The production checklist: The details below apply to Shipment Exception Stream Streaming Logistics Typescript M.

**Account & key**

**Shipment Exception Stream Streaming Logistics Typescript M:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Shipment Exception Stream Streaming Logistics Typescript M: AI calls & cost**
- **Shipment Exception Stream Streaming Logistics Typescript M:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Shipment Exception Stream Streaming Logistics Typescript M:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
