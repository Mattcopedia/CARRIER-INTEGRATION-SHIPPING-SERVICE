"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticTokenProvider = void 0;
class StaticTokenProvider {
    constructor(token) {
        this.token = token;
    }
    async getAccessToken() {
        return this.token;
    }
}
exports.StaticTokenProvider = StaticTokenProvider;
//# sourceMappingURL=static-token-provider.js.map