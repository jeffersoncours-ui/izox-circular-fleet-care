import { useEffect, useRef } from "react";

/**
 * Hook réutilisable qui détecte un ID cible dans le query string et déclenche
 * l'ouverture automatique d'un dialog/sélection dès que l'item correspondant
 * est disponible dans la liste chargée.
 *
 * N'agit qu'une seule fois par targetId (mémorisé dans un ref) afin que la
 * fermeture manuelle du dialog par l'utilisateur ne le ré-ouvre pas.
 *
 * Un prédicat optionnel `shouldOpen` permet de bloquer l'auto-ouverture si
 * l'item ne satisfait pas une condition métier (ex: statut !== 'en_attente').
 */
export function useAutoOpenFromSearch<T>(
  targetId: string | undefined,
  items: T[] | undefined,
  idKey: keyof T,
  onMatch: (item: T) => void,
  shouldOpen?: (item: T) => boolean,
) {
  const lastHandledIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!targetId) return;
    if (!items || items.length === 0) return;
    if (lastHandledIdRef.current === targetId) return;

    const matched = items.find((item) => String(item[idKey]) === targetId);
    if (!matched) return;

    const canOpen = shouldOpen ? shouldOpen(matched) : true;
    if (!canOpen) {
      lastHandledIdRef.current = targetId;
      if (import.meta.env.DEV) {
        console.debug(
          `[useAutoOpenFromSearch] Auto-open blocked for ${targetId}: shouldOpen returned false`,
        );
      }
      return;
    }

    lastHandledIdRef.current = targetId;
    onMatch(matched);
  }, [targetId, items, idKey, onMatch, shouldOpen]);
}
