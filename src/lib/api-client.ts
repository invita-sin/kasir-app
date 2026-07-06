export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public body: unknown,
  ) {
    super(body && typeof body === "object" && "error" in body ? String((body as Record<string, unknown>).error) : `API error ${status}`);
    this.name = "ApiError";
  }
}

export function getErrorMessage(error: unknown, defaultMsg?: string): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400: return error.message || "Data yang dimasukkan tidak valid";
      case 401: return "Sesi telah berakhir. Silakan login ulang";
      case 403: return "Anda tidak memiliki akses";
      case 404: return "Data tidak ditemukan";
      case 409: return error.message || "Data sudah digunakan";
      case 429: return "Terlalu banyak permintaan. Silakan tunggu";
      default: return error.message || defaultMsg || "Terjadi kesalahan";
    }
  }
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return "Gagal terhubung ke server. Periksa koneksi Anda";
  }
  return defaultMsg || "Terjadi kesalahan yang tidak terduga";
}

export interface UserData {
  id: string;
  username: string;
  name: string;
  role: string;
  cabangId?: string | null;
  createdAt: string;
}

export interface CreateUserInput {
  username: string;
  password: string;
  name: string;
  role?: string;
  cabangId?: string | null;
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const doFetch = async (): Promise<Response> => {
    return fetch(path, options);
  };

  let res = await doFetch();

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await doFetch();
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.code || "UNKNOWN", body);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path);
}

export async function apiPost<T>(path: string, data: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function apiPut<T>(path: string, data: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function apiDelete(path: string): Promise<void> {
  await apiFetch<void>(path, { method: "DELETE" });
}

export const usersApi = {
  list: () => apiGet<UserData[]>("/api/users"),
  get: (id: string) => apiGet<UserData>(`/api/users/${id}`),
  create: (data: CreateUserInput) => apiPost<UserData>("/api/users", data),
  update: (id: string, data: Partial<CreateUserInput>) => apiPut<UserData>(`/api/users/${id}`, data),
  delete: (id: string) => apiDelete(`/api/users/${id}`),
};
