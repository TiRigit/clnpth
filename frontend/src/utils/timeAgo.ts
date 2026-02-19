export function timeAgo(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = Math.max(0, now - then);

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "gestern";
  if (days < 7) return `vor ${days} Tagen`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `vor ${weeks} Wo.`;

  const months = Math.floor(days / 30);
  return `vor ${months} Mon.`;
}
