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

export async function runTokenRefresh(): Promise<string | null> {
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

  // If accessToken in memory is not set but refreshToken exists, refresh session first
  if (!accessToken && refreshToken) {
    await runTokenRefresh().catch(() => null);
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const config = { ...options, headers };
  let response = await fetch(path, config);

  if (response.status === 401 && refreshToken) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const newToken = await runTokenRefresh();
        isRefreshing = false;
        if (newToken) {
          onRefreshed(newToken);
          // Directly retry this primary request with the fresh token
          headers.set("Authorization", `Bearer ${newToken}`);
          const retryResponse = await fetch(path, { ...options, headers });
          if (!retryResponse.ok) {
            const errorData = await retryResponse.json().catch(() => ({}));
            const message = errorData.detail || errorData.message || errorData.error || `HTTP error! status: ${retryResponse.status}`;
            throw new Error(message);
          }
          const json = await retryResponse.json();
          if (json && json.status === "success") {
            if (json.pagination && typeof json.data === "object" && json.data !== null && !Array.isArray(json.data)) {
              return { ...json.data, pagination: json.pagination };
            }
            return json.data;
          }
          return json;
        } else {
          throw new Error("Token refresh failed");
        }
      } catch (refreshErr) {
        isRefreshing = false;
        throw refreshErr;
      }
    }

    // Concurrent API requests wait for the active refresh lock to resolve
    return new Promise((resolve, reject) => {
      subscribeTokenRefresh((newToken) => {
        headers.set("Authorization", `Bearer ${newToken}`);
        fetch(path, { ...options, headers })
          .then(async (res) => {
            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              const message = errorData.detail || errorData.message || errorData.error || `HTTP error! status: ${res.status}`;
              return reject(new Error(message));
            }
            const cType = res.headers.get("content-type");
            if (cType && !cType.includes("application/json")) {
              return resolve(res);
            }
            const json = await res.json();
            if (json && json.status === "success") {
              if (json.pagination && typeof json.data === "object" && json.data !== null && !Array.isArray(json.data)) {
                return resolve({ ...json.data, pagination: json.pagination });
              }
              return resolve(json.data);
            }
            return resolve(json);
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
    if (json.pagination && typeof json.data === "object" && json.data !== null && !Array.isArray(json.data)) {
      return { ...json.data, pagination: json.pagination };
    }
    return json.data;
  }
  return json;
}

/**
 * fetchWithAuth performs a binary / stream fetch with automatic Bearer token injection
 * and 401 token refresh retry. Ideal for downloading blobs, preview streams, and files.
 */
export async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  let token = getAccessToken();
  const headers = new Headers(init?.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res = await fetch(url, { ...init, headers });

  if (res.status === 401 && refreshToken) {
    try {
      const newToken = await runTokenRefresh();
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
        let retryUrl = url;
        try {
          const isAbsolute = /^(?:[a-z]+:)?\/\//i.test(url);
          const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
          if (u.searchParams.has("token")) {
            u.searchParams.set("token", newToken);
            retryUrl = isAbsolute ? u.toString() : (u.pathname + u.search + u.hash);
          }
        } catch {}
        res = await fetch(retryUrl, { ...init, headers });
      }
    } catch {
      // If token refresh throws (network down / refresh token expired), return the original response
    }
  }

  return res;
}
