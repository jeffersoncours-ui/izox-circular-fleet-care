export function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(";") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csv =
    "﻿" +
    keys.join(";") +
    "\n" +
    rows.map((r) => keys.map((k) => esc(r[k])).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  Object.assign(document.createElement("a"), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}
