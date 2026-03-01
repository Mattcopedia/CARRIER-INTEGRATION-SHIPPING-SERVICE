import type { Carrier as CarrierInterface } from "../../src/carriers/carrier.interface";
import { CarrierError, RateQuote, RateRequest } from "../../src/domain";
import { CarrierService } from "../../src/services";

class ThrowingCarrier implements CarrierInterface {
  constructor(
    public readonly name: string,
    private readonly behavior: "carrierError" | "unknownError",
  ) {}

  async getRates(_: RateRequest): Promise<RateQuote[]> {
    if (this.behavior === "carrierError") {
      throw new CarrierError({
        code: "RATE_LIMITED",
        carrier: this.name,
        message: "Rate limited by carrier",
        details: { retryAfterSeconds: 30 },
      });
    }

    // Simulate a bug/unexpected runtime error inside carrier code
    throw new Error("Unexpected boom");
  }
}

class RecordingCarrier implements CarrierInterface {
  public called = false;

  constructor(public readonly name: string) {}

  async getRates(_: RateRequest): Promise<RateQuote[]> {
    this.called = true;
    return [];
  }
}

describe("Error handling (service-level integration)", () => {
  const validRequest: RateRequest = {
    origin: {
      street1: "123 Main St",
      city: "New York",
      postalCode: "10001",
      countryCode: "US",
    },
    destination: {
      street1: "456 Market St",
      city: "San Francisco",
      postalCode: "94105",
      countryCode: "US",
    },
    packages: [{ weight: { value: 2, unit: "LB" } }],
  };

  it("returns VALIDATION_ERROR and does NOT call carrier when input is invalid", async () => {
    const service = new CarrierService();
    const carrier = new RecordingCarrier("MOCK");
    service.registerCarrier(carrier);

    const badRequest = {
      ...validRequest,
      // invalid: packages must be non-empty, weight value must be positive
      packages: [{ weight: { value: 0, unit: "LB" } }],
    } as RateRequest;

    await expect(service.getRates(badRequest)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });

    // prove we validated before attempting any external call
    expect(carrier.called).toBe(false);
  });

  it("returns CARRIER_ERROR when no carriers are registered", async () => {
    const service = new CarrierService();

    await expect(service.getRates(validRequest)).rejects.toMatchObject({
      code: "CARRIER_ERROR",
      message: "No carriers available to quote rates",
    });
  });

  it("returns CARRIER_ERROR when a requested carrier isn't registered", async () => {
    const service = new CarrierService();
    // register a different carrier
    service.registerCarrier(new RecordingCarrier("OTHER"));

    await expect(
      service.getRates({ ...validRequest, carrier: "UPS" }),
    ).rejects.toMatchObject({
      code: "CARRIER_ERROR",
      // If you implemented the more explicit message:
      // message: "Carrier 'UPS' is not registered"
    });
  });

  it("does not swallow CarrierError thrown by a carrier (passes through)", async () => {
    const service = new CarrierService();
    service.registerCarrier(new ThrowingCarrier("UPS", "carrierError"));

    await expect(service.getRates(validRequest)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      carrier: "UPS",
      message: "Rate limited by carrier",
    });
  });

  it("wraps unknown errors from a carrier into INTERNAL_ERROR with carrier name", async () => {
    const service = new CarrierService();
    service.registerCarrier(new ThrowingCarrier("UPS", "unknownError"));

    try {
      await service.getRates(validRequest);
      throw new Error("Expected to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(CarrierError);
      const ce = err as CarrierError;

      expect(ce.code).toBe("INTERNAL_ERROR");
      expect(ce.carrier).toBe("UPS");
      expect(ce.message).toBe("Unexpected carrier failure");
      expect(ce.details).toBeDefined(); // contains original error
    }
  });
});
