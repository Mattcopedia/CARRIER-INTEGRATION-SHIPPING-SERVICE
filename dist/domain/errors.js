"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarrierError = void 0;
exports.isCarrierError = isCarrierError;
class CarrierError extends Error {
    constructor(params) {
        super(params.message);
        this.code = params.code;
        this.carrier = params.carrier;
        this.details = params.details;
    }
}
exports.CarrierError = CarrierError;
function isCarrierError(err) {
    return (typeof err === "object" &&
        err !== null &&
        "code" in err &&
        typeof err.code === "string" &&
        "message" in err &&
        typeof err.message === "string");
}
//# sourceMappingURL=errors.js.map