import { DependencyList, useCallback, useEffect, useState } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { toast } from "sonner";

/**
 * Hook to safely fetch data from Supabase with proper error handling.
 * Replaces manual loading + error state management across components.
 *
 * Usage — simple initial load:
 * ```tsx
 * const { data, loading } = useSupabaseQuery(
 *   () => supabase.from("table").select(...).eq("col", value),
 *   { defaultValue: [] },
 *   [value]
 * );
 * ```
 *
 * Usage — with manual refetch:
 * ```tsx
 * const { data, loading, refetch } = useSupabaseQuery(
 *   () => supabase.from("table").select(...),
 *   { defaultValue: [] }
 * );
 * // Call refetch() manually when needed
 * ```
 */
export function useSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options: {
    defaultValue?: T;
    errorMessage?: string;
    enabled?: boolean;
  } = {},
  deps?: DependencyList
) {
  const [data, setData] = useState<T>(options.defaultValue ?? (null as any));
  const [loading, setLoading] = useState(options.enabled !== false);
  const [error, setError] = useState<PostgrestError | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await queryFn();
      if (result.error) {
        setError(result.error);
        if (options.errorMessage) {
          toast.error(options.errorMessage);
        }
        setData(options.defaultValue ?? (null as any));
      } else {
        setError(null);
        setData(result.data ?? (options.defaultValue ?? (null as any)));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur inconnue";
      setError(new Error(errorMsg) as any);
      if (options.errorMessage) toast.error(options.errorMessage);
      setData(options.defaultValue ?? (null as any));
    } finally {
      setLoading(false);
    }
  }, [queryFn, options]);

  useEffect(() => {
    if (options.enabled === false) {
      setLoading(false);
      return;
    }
    fetch();
  }, deps ? [...deps, fetch] : [fetch]);

  return { data, loading, error, refetch: fetch };
}
