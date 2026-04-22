export function getDateKey(date: Date = new Date()) {
  return date.toISOString().slice(0, 10);
}
