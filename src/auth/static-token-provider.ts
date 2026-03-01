//This is super useful for testing carrier clients later without needing real OAuth.
import { TokenProvider } from "./token.provider";

export class StaticTokenProvider implements TokenProvider {
  constructor(private readonly token: string) {}

  async getAccessToken(): Promise<string> {
    return this.token;
  }
}
