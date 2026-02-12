import { QueryClient, QueryFunction } from "@tanstack/react-query";

const explicitApiBase = import.meta.env.VITE_API_BASE_URL?.trim?.() || "";
const localApiFallbackBase =
  import.meta.env.VITE_API_PROXY_TARGET?.trim?.() || "http://127.0.0.1:5000";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function isHtmlResponse(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  return contentType.includes("text/html");
}

function makeApiUrl(url: string, baseUrl: string) {
  if (!baseUrl) return url;
  return `${baseUrl.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

async function fetchApiWithFallback(inputUrl: string, init?: RequestInit) {
  const primaryUrl = makeApiUrl(inputUrl, explicitApiBase);
  const primaryResponse = await fetch(primaryUrl, {
    ...init,
    credentials: "include",
  });

  const canRetryOnLocal =
    !explicitApiBase &&
    typeof window !== "undefined" &&
    inputUrl.startsWith("/api") &&
    isHtmlResponse(primaryResponse);

  if (!canRetryOnLocal) {
    return primaryResponse;
  }

  return fetch(makeApiUrl(inputUrl, localApiFallbackBase), {
    ...init,
    credentials: "include",
  });
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetchApiWithFallback(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetchApiWithFallback(queryKey.join("/") as string);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
