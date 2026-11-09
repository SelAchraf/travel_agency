const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

let isRefreshing = false;
let refreshSubscribers: ((tokenRefreshed: boolean) => void)[] = [];

function subscribeTokenRefresh(cb: (tokenRefreshed: boolean) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(success: boolean) {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
}

export async function apiClient<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...customConfig } = options;

  let url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const config: RequestInit = {
    method: options.method || "GET",
    credentials: "include", // Transmit httpOnly cookies
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...customConfig,
  };

  const response = await fetch(url, config);

  // If 401 Unauthorized, attempt token refresh unless this is login or refresh endpoint
  if (response.status === 401 && !endpoint.includes("/auth/login") && !endpoint.includes("/auth/refresh")) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (refreshRes.ok) {
          isRefreshing = false;
          onRefreshed(true);
          // Re-attempt original request
          return apiClient<T>(endpoint, options);
        } else {
          isRefreshing = false;
          onRefreshed(false);
          window.dispatchEvent(new CustomEvent("auth:session-expired"));
        }
      } catch {
        isRefreshing = false;
        onRefreshed(false);
        window.dispatchEvent(new CustomEvent("auth:session-expired"));
      }
    } else {
      // Wait for ongoing refresh to complete
      return new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh((success) => {
          if (success) {
            resolve(apiClient<T>(endpoint, options));
          } else {
            reject(new Error("Session expired"));
          }
        });
      });
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.error || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    (err as any).status = response.status;
    (err as any).data = data;
    throw err;
  }

  return data;
}

