/** Integer laari (1 MVR = 100 laari) -> a display string like "MVR 1,234.56". */
export function formatMvr(laari: number | null | undefined): string {
  if (laari === null || laari === undefined) return '—';
  return `MVR ${(laari / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
