"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
class HttpError extends Error {
    constructor(code, status, details) {
        super(code);
        this.code = code;
        this.status = status;
        this.details = details;
    }
}
exports.HttpError = HttpError;
//# sourceMappingURL=http-errors.js.map