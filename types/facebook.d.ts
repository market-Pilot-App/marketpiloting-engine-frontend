declare namespace facebook {
  interface StatusResponse {
    status: "connected" | "not_authorized" | "unknown";
    authResponse: {
      accessToken: string;
      expiresIn: number;
      userID: string;
    } | null;
  }
}

interface Window {
  FB: {
    init: (params: { appId: string; version: string; cookie: boolean; xfbml: boolean }) => void;
    login: (callback: (response: facebook.StatusResponse) => void, options?: { config_id?: string; scope?: string }) => void;
  };
}
