import { useEffect, useState } from "react";
import {
  getModuleCategories,
  type ModuleCategoriesResponse,
} from "@/services/module-category-service";

/**
 * Hook that fetches the active modules and categories from the server
 * and returns them along with loading state.  Components use this instead
 * of importing hardcoded constants so dropdowns are always up-to-date.
 */
export const useModuleCategories = () => {
  const [data, setData] = useState<ModuleCategoriesResponse>({
    modules: [],
    categories: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    getModuleCategories()
      .then((result) => {
        if (!ignore) setData(result);
      })
      .catch(() => {
        // Silently fail — dropdowns will just be empty.
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return { ...data, loading };
};
