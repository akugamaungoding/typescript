export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; total?: number; totalPages?: number; message?: string }> {
  try {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `/api${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    const result = await res.json();

    if (!res.ok) {
      return {
        success: false,
        message: result.message || `HTTP Error ${res.status}`,
      };
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error occurred",
    };
  }
}
