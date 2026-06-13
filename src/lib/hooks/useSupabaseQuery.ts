import { DependencyList, useCallback, useEffect, useRef, useState } from "react";
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
  queryFn: () => Promise<any> | any,
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

  // Refs hold the latest values so fetch() is a stable reference that never
  // becomes stale. Without this, passing an inline queryFn / options object
  // would recreate fetch on every render → useEffect fires every render → ∞ loop.
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;
  const defaultValueRef = useRef(options.defaultValue);
  defaultValueRef.current = options.defaultValue;
  const errorMessageRef = useRef(options.errorMessage);
  errorMessageRef.current = options.errorMessage;
  const enabledRef = useRef(options.enabled);
  enabledRef.current = options.enabled;

  // Stable reference — never recreated, always reads the latest queryFn via ref.
  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await queryFnRef.current();
      if (result.error) {
        setError(result.error);
        if (errorMessageRef.current) {
          toast.error(errorMessageRef.current);
        }
        setData(defaultValueRef.current ?? (null as any));
      } else {
        setError(null);
        setData(result.data ?? (defaultValueRef.current ?? (null as any)));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur inconnue";
      setError(new Error(errorMsg) as any);
      if (errorMessageRef.current) toast.error(errorMessageRef.current);
      setData(defaultValueRef.current ?? (null as any));
    } finally {
      setLoading(false);
    }
  }, []); // stable — reads queryFn/options via refs, never needs to be recreated

  useEffect(() => {
    if (enabledRef.current === false) {
      setLoading(false);
      return;
    }
    fetch();
    // Run once on mount (no deps) or whenever explicit deps change.
    // NOT [fetch] — that would re-run on every render since fetch was unstable before.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps ?? []);

  return { data, loading, error, refetch: fetch };
}
