// File: global.d.ts

// This declares the global 'gapi' object from Google API Client Library (GAPI)
declare var gapi: typeof import('gapi');

// This declares the global 'google' object from Google Identity Services (GIS)
// This is necessary to use types like google.accounts.oauth2.TokenClient
declare namespace google {
    namespace accounts {
        namespace oauth2 {
            interface TokenClient {
                requestAccessToken(config: { prompt: string }): void;
                callback: (response: TokenResponse) => void;
            }
            interface TokenResponse {
                access_token: string;
                expires_in: string;
                error?: string;
                error_description?: string;
                error_uri?: string;
                state?: string;
                token_type: string;
            }
            function initTokenClient(config: {
                client_id: string;
                scope: string;
                callback: (resp: TokenResponse) => void;
            }): TokenClient;
            function revoke(accessToken: string, callback: () => void): void;
        }
    }
}