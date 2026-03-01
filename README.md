## Carrier Integration Service

A modular, extensible TypeScript service for integrating shipping carriers (starting with UPS) behind a carrier-abstraction layer domain API.

The goal of this project is to demonstrate clean architecture, strong domain modeling, reliable authentication handling, structured error management, and realistic stubbed end-to-end integration testing.
s

## Overview

This service exposes a unified shipping interface that allows callers to request shipping rates without knowing anything about carrier-specific APIs

Example

```bash
const rates = await carrierService.getRates({
  carrier: "..."
  origin: {...},
  destination: {...},
  packages: [...],
  serviceLevel?: "..."
});
```

The caller never interacts with UPS request/response formats.

## Architecture & Design Decisions

### 1. Clean Separation of Concerns

The system is intentionally layered:

```bash
Domain (carrier-agnostic)
        ↓
Carrier Service (orchestration)
        ↓
Carrier Adapter (UPS implementation)
        ↓
HTTP + Auth Infrastructure
```

| Layer               | Responsibility                               |
| ------------------- | -------------------------------------------- |
| **Domain**          | Internal models (`RateRequest`, `RateQuote`) |
| **CarrierService**  | Orchestrates multiple carriers               |
| **Carrier Adapter** | Maps domain ⇄ carrier formats                |
| **Auth**            | OAuth token lifecycle                        |
| **HTTP**            | Network calls + error normalization          |

This allows adding FedEx/DHL later without modifying existing UPS logic.

### 2. Clean Separation of Concerns

```bash
interface RateRequest {
  origin: Address;
  destination: Address;
  packages: Package[];
  serviceLevel?: string;
}
```

UPS-specific concepts (service codes, payload shapes) never leak outside the UPS adapter.

### 3. Mapping strategy

The system performs two explicit transformations:

```bash
Domain Request
   ↓
UPS Request Mapper
   ↓
UPS API

UPS Response
   ↓
UPS Parser
   ↓
Domain RateQuote[]
```

This ensures: internal stability, external API independence, easy multi-carrier expansion

### 4. Authentification Design

UPS OAuth2 Client Credentials flow is implemented with:

Token acquisition

Token caching

Automatic refresh on expiry

Concurrent request protection (token stampede prevention)

A carrier-agnostic abstraction is used:

```bash
interface TokenProvider {
  getAccessToken(): Promise<string>;
}
```

This allows future carriers to plug in their own auth strategy.

### 4. HTTP Layer

All network calls go through a shared HttpClient.

Responsibilities:

timeout handling

structured HTTP errors

consistent request building

transport isolation from carrier logic

UPS code never directly uses axios/fetch

### 5. Error Handling Philosophy

Errors are structured and actionable with a global error handler class

```bash
CarrierError {
  code:
    | "VALIDATION_ERROR"
    | "AUTH_ERROR"
    | "RATE_LIMITED"
    | "NETWORK_ERROR"
    | "CARRIER_ERROR"
    | "INTERNAL_ERROR";
}
```

No exceptions are swallowed.

Each layer converts errors into meaningful domain failures.UPS Authentication

## UPS Authentification

Implemented using UPS OAuth Client Credentials:

POST /security/v1/oauth/token

cached token reuse

expiry skew protection

automatic refresh

Callers never manage tokens manually.

## Testing Strategy

Integration tests are stubbed end-to-end tests using nock.

They verify: request payload construction, authentication lifecycle, response normalization, error handling paths

Covered Scenarios

1.  Auth

2.  token acquisition

3.  token reuse

4.  refresh after expiry

5.  concurrent requests

6.  auth failures

7.  rate limiting

8.  malformed responses

9.  network timeouts

10. Rating

11. Shop vs Rate request modes

12. domain → UPS mapping

13. UPS → domain normalization

14. 401 → AUTH_ERROR

15. 5xx → CARRIER_ERROR

16. malformed JSON responses

No real UPS calls are made.

## Running the Project

Running the Project

```bash
npm install
```

## Environment Setup

Create .env from example:

```bash
cp .env.example .env
```

Required Values

```bash
UPS_OAUTH_URL=https://wwwcie.ups.com
UPS_API_BASE_URL=https://wwwcie.ups.com
UPS_CLIENT_ID=YOUR_ID
UPS_CLIENT_SECRET=YOUR_SECRET
UPS_BILLING_ACCOUNT=XXXXXX
```

## Run Tests

Run all tests:

```bash
npm test
```

Run a specific file:

```bash
npm test -- tests/integration/ups-rate.test.ts
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Adding Another Carrier (Example: FedEx)

Steps required:

1. Implement a new carrier adapter:

```bash
src/carriers/fedex/
```

2. Implement:
   1 FedexClient

   2 FedexTokenProvider

   3 request mapper

   4 response parser

3. Register carrier:

```bash
carrierService.registerCarrier(new FedexCarrier(...));
```

No UPS code changes required.

## Creating Additional Operations (Example: Tracking)

1. Implement a new carrier operation:

```bash
src/carriers/carrier.interface.ts
```

2. Use the method created in src/services/carrier.service.ts

# Evaluation Criteria Coverage

| Requirement                  | Implementation                      |
| ---------------------------- | ----------------------------------- |
| Architecture & Extensibility | Adapter + domain separation         |
| Types & Domain Modeling      | Strong domain schemas with Zod      |
| Auth Implementation          | Transparent OAuth lifecycle         |
| Error Handling               | Structured CarrierError system      |
| Integration Tests            | Stubbed E2E with realistic payloads |
| Code Quality                 | Typed, layered, readable TS         |

# Improvements With More Time

1. Retry & Backoff Strategy

   Add automatic retries for:

   429 rate limits

   transient 5xx failures

   with exponential backoff.

2. Environment Configuration Separation

   Currently one env schema validates all UPS settings.

   Better approach:

   base.env.ts

   ups-auth.env.ts

   ups-rating.env.ts

   Prevents unrelated configs from breaking tests

## Documentation

UPS Documentation: https://developer.ups.com/tag/Rating?loc=en_US

## License

No licenses for this project yet.
