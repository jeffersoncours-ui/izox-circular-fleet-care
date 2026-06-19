import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function CitadineIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 64 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M6 24h52v-4l-4-4-6-8H22l-8 8-8 4v4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M22 8l-6 8h32l-4-8H22z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="18" cy="24" r="4" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="46" cy="24" r="4" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function BerlineIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 72 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M4 24h64v-5l-6-3-8-9H22l-10 9-8 3v5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M22 7l-9 9h44l-6-9H22z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="18" cy="24" r="4.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="54" cy="24" r="4.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function SuvIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 72 36" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M4 28h64v-7l-4-2-4-12H20l-6 12-10 2v7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M20 7l-5 12h44l-4-12H20z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="18" cy="28" r="5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="54" cy="28" r="5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function UtilitaireIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 72 36" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M4 28h64v-20H30L20 16H4v12z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M30 8v8H20l8-8h2z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.2" />
      <rect x="36" y="11" width="28" height="10" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.05" />
      <circle cx="16" cy="28" r="5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="54" cy="28" r="5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export const VEHICULE_TYPES = [
  { value: "citadine", label: "Citadine", Icon: CitadineIcon },
  { value: "berline", label: "Berline", Icon: BerlineIcon },
  { value: "suv_break", label: "SUV / Break", Icon: SuvIcon },
  { value: "utilitaire", label: "Utilitaire", Icon: UtilitaireIcon },
] as const;

export type VehiculeType = (typeof VEHICULE_TYPES)[number]["value"];

export function getVehiculeIcon(type: string | null | undefined) {
  return VEHICULE_TYPES.find((v) => v.value === type)?.Icon ?? CitadineIcon;
}

export function getVehiculeLabel(type: string | null | undefined) {
  return VEHICULE_TYPES.find((v) => v.value === type)?.label ?? "Véhicule";
}
