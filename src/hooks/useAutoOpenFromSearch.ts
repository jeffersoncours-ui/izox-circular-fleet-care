import { useEffect, useRef } from "react";

/**
 * Hook réutilisable qui détecte un ID cible dans le query string et déclenche
 * l'ouverture automatique d'un dialog/sélection dès que l'item correspondant
 * est disponible dans la liste chargée.
 *
 * N'agit qu'une seule fois par targetId (mémorisé dans un ref) afin que la
 * fermeture manuelle du dialog par l'utilisateur ne le ré-ouvre pas.
 */
export function useAutoOpenFromSearch<T>(
  targetId: string | undefined,
  items: T[] | undefined,
  idKey: keyof T,
  onMatch: (item: T) => void,
) {
  const lastHandledIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!targetId) return;
    if (!items || items.length === 0) return;
    if (lastHandledIdRef.current === targetId) return;

    const matched = items.find((item) => String(item[idKey]) === targetId);
    if (matched) {
      lastHandledIdRef.current = targetId;
      onMatch(matched);
    }
  }, [targetId, items, idKey, onMatch]);
}
