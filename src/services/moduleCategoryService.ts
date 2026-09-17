import { get } from "./api";
import { API_ENDPOINTS } from "@/constants";

export interface ModuleCategoriesResponse {
  modules: string[];
  categories: Record<string, string[]>;
}

let cached: ModuleCategoriesResponse | null = null;

/**
 * Fetches the active modules and their categories from the server.
 * Results are cached in memory after the first call so repeated usages
 * (ViewAllTable, create forms, etc.) don't trigger extra network requests.
 */
export const getModuleCategories = async (): Promise<ModuleCategoriesResponse> => {
  if (cached) return cached;

  const data = await get(API_ENDPOINTS.moduleCategories);
  cached = {
    modules: data?.modules ?? [],
    categories: data?.categories ?? {},
  };
  return cached;
};

/**
 * Clears the in-memory cache so the next call to getModuleCategories()
 * fetches fresh data.  Useful after a new module/category is created.
 */
export const clearModuleCategoryCache = (): void => {
  cached = null;
};
