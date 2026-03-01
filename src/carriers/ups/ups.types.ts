//Raw API typings
export interface UpsTokenResponse {
  token_type: string; // "Bearer"
  issued_at: string; // epoch millis as string
  client_id: string;
  access_token: string;
  scope?: string;
  expires_in: string; // seconds as string (docs + examples)
  refresh_count?: string;
  status?: string; // "approved"
}

export interface UpsErrorResponse {
  response?: {
    errors?: Array<{
      code: string;
      message: string;
    }>;
  };
}
