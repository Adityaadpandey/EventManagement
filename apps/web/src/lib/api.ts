import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15000,
  maxRetries: 2,
  retryDelay: 1000,
  tokenCacheTTL: 10000,
} as const;

class TokenManager {
  private static instance: TokenManager;
  private cachedToken: string | null = null;
  private cacheTimestamp = 0;

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  getToken(): string | null {
    if (typeof window === "undefined") return null;

    const now = Date.now();
    if (
      this.cachedToken &&
      now - this.cacheTimestamp < API_CONFIG.tokenCacheTTL
    ) {
      return this.cachedToken;
    }

    try {
      this.cachedToken = localStorage.getItem("token");
      this.cacheTimestamp = now;
      return this.cachedToken;
    } catch (error) {
      console.error("Failed to read token:", error);
      return null;
    }
  }

  setToken(token: string): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("token", token);
      this.cachedToken = token;
      this.cacheTimestamp = Date.now();
    } catch (error) {
      console.error("Failed to set token:", error);
    }
  }

  clearToken(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("token");
      this.cachedToken = null;
      this.cacheTimestamp = 0;
    } catch (error) {
      console.error("Failed to clear token:", error);
    }
  }

  invalidateCache(): void {
    this.cachedToken = null;
    this.cacheTimestamp = 0;
  }
}

const tokenManager = TokenManager.getInstance();

const api = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    (config as any).metadata = { startTime: Date.now() };

    if (typeof window !== "undefined") {
      const token = tokenManager.getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === "development") {
      const duration =
        Date.now() - (response.config as any).metadata?.startTime;
      if (duration > 2000) {
        console.warn(`⚠️ Slow request: ${response.config.url} (${duration}ms)`);
      }
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as any;
    const status = error.response?.status;

    // Handle 401 - clear token
    if (status === 401) {
      tokenManager.clearToken();
      // redirect to login
      // if (typeof window !== "undefined") window.location.href = "/auth";
    }

    const shouldRetry =
      config &&
      (config._retryCount || 0) < API_CONFIG.maxRetries &&
      (error.code === "ECONNABORTED" ||
        error.code === "ERR_NETWORK" ||
        status === 408 ||
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504);

    if (shouldRetry) {
      config._retryCount = (config._retryCount || 0) + 1;
      const delay = API_CONFIG.retryDelay * Math.pow(2, config._retryCount - 1);

      if (process.env.NODE_ENV === "development") {
        console.warn(
          `🔄 Retry ${config._retryCount}/${API_CONFIG.maxRetries}: ${config.url}`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(config);
    }

    if (error.response?.data) {
      const data = error.response.data as any;
      if (data.message) {
        error.message = data.message;
      }
    }

    return Promise.reject(error);
  },
);

export const apiUtils = {
  setToken: (token: string) => tokenManager.setToken(token),
  clearToken: () => tokenManager.clearToken(),
  getToken: () => tokenManager.getToken(),
  invalidateTokenCache: () => tokenManager.invalidateCache(),
};

export default api;
