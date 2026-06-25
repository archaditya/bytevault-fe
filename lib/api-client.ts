interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

let accessToken: string | null = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
let refreshToken: string | null = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;

export function getAccessToken() {
  return accessToken;
}

export function setTokens(tokens: TokenPair | null) {
  if (typeof window === "undefined") return;
  if (tokens) {
    accessToken = tokens.access_token;
    refreshToken = tokens.refresh_token;
    localStorage.setItem("accessToken", tokens.access_token);
    localStorage.setItem("refreshToken", tokens.refresh_token);
  } else {
    accessToken = null;
    refreshToken = null;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function runTokenRefresh(): Promise<string | null> {
  if (!refreshToken) return null;
  try {
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      throw new Error("Refresh token expired or invalid");
    }

    const json = await res.json();
    const data = json.status === "success" ? json.data : json;
    const tokens = data.tokens;
    setTokens(tokens);
    return tokens.access_token;
  } catch (error) {
    setTokens(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }
}

export async function apiClient(path: string, options: RequestInit = {}): Promise<any> {
  const headers = new Headers(options.headers || {});
  
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const config = { ...options, headers };
  let response = await fetch(path, config);

  if (response.status === 401 && refreshToken) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await runTokenRefresh();
      isRefreshing = false;
      if (newToken) {
        onRefreshed(newToken);
      }
    }

    return new Promise((resolve, reject) => {
      subscribeTokenRefresh((newToken) => {
        headers.set("Authorization", `Bearer ${newToken}`);
        fetch(path, { ...options, headers })
          .then((res) => {
            if (!res.ok) {
              return res.json().then(reject);
            }
            return res.json().then((json) => {
              if (json && json.status === "success") {
                resolve(json.data);
              } else {
                resolve(json);
              }
            });
          })
          .catch(reject);
      });
    });
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.detail || errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
    throw new Error(message);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && !contentType.includes("application/json")) {
    return response;
  }

  const json = await response.json();
  if (json && json.status === "success") {
    return json.data;
  }
  return json;
}
