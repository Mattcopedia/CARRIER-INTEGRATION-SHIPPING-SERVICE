"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = require("./services");
// Dummy carrier for now
class MockCarrier {
    constructor() {
        this.name = "MOCK";
    }
    async getRates(_) {
        return [
            {
                carrier: "MOCK",
                serviceCode: "STANDARD",
                serviceName: "Mock Standard Shipping",
                totalCharge: { amount: 9.99, currency: "USD" },
            },
        ];
    }
}
async function main() {
    const service = new services_1.CarrierService();
    service.registerCarrier(new MockCarrier());
    const rates = await service.getRates({
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
        packages: [
            {
                weight: { value: 2, unit: "LB" },
            },
        ],
    });
    console.log(rates);
}
main();
//# sourceMappingURL=example.js.map