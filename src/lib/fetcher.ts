import { apiGet } from "./api-client";

export const fetcher = <T>(url: string): Promise<T> => apiGet<T>(url);
