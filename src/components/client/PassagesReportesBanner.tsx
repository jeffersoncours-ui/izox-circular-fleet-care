import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CalendarPlus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { lastDayOfMonth, format } from "date-fns";
import { fr } from "date-fns/locale";

export function PassagesReportesBanner() {
  const { profile } = useAuth();
  const [passagesReportes, setPassagesReportes] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!profile?.entreprise_id) return;
    (async () => {
      const { data } = await supabase
        .from("contrats")
        .select("passages_reportes")
        .eq("entreprise_id", profile.entreprise_id!)
        .eq("statut", "actif")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setPassagesReportes(data?.passages_reportes ?? 0);
      setLoaded(true);
    })();
  }, [profile]);

  if (!loaded || passagesReportes <= 0) return null;

  const dateExpiration = lastDayOfMonth(new Date());
  const dateLabel = format(dateExpiration, "d MMMM yyyy", { locale: fr });

  return (
    <Card
      role="alert"
      className="mb-4 p-4 border-amber-300 bg-amber-50 shadow-card"
    >
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-amber-900 font-medium">
            Vous avez {passagesReportes} passage{passagesReportes > 1 ? "s" : ""} reporté
            {passagesReportes > 1 ? "s" : ""} du mois précédent qui expire
            {passagesReportes > 1 ? "nt" : ""} le <strong>{dateLabel}</strong>.
          </p>
          <p className="text-sm text-amber-800 mt-1">
            Réservez avant cette date pour ne pas les perdre.
          </p>
          <div className="mt-3">
            <Button asChild size="sm" variant="izox">
              <Link to="/client/prestations">
                <CalendarPlus className="h-4 w-4" /> Prendre un RDV
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
