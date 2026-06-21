export const DEFAULT_ITEMS = [
  "Scales",
  "Excerpt A",
  "Excerpt B",
  "Slow trouble spot"
];

export function parsePracticeItems(text) {
  return text
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function secondsFromMinutes(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.round(number * 60);
}

export function getIntervalSeconds(settings, random = Math.random) {
  if (settings.timerMode === "range") {
    const min = secondsFromMinutes(settings.minMinutes);
    const max = secondsFromMinutes(settings.maxMinutes);
    const lower = Math.min(min, max);
    const upper = Math.max(min, max);
    if (lower === upper) return lower;
    return Math.floor(random() * (upper - lower + 1)) + lower;
  }

  return secondsFromMinutes(settings.fixedMinutes);
}

export function getNextItemIndex({
  currentIndex,
  itemCount,
  orderMode,
  random = Math.random
}) {
  if (itemCount <= 0) return -1;
  if (itemCount === 1) return 0;

  if (orderMode === "random") {
    let nextIndex = currentIndex;
    while (nextIndex === currentIndex) {
      nextIndex = Math.floor(random() * itemCount);
    }
    return nextIndex;
  }

  return (currentIndex + 1) % itemCount;
}

export function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function makeSessionSummary({ items, settings }) {
  const itemCount = items.length;
  const timerLabel =
    settings.timerMode === "range"
      ? `${settings.minMinutes}-${settings.maxMinutes} min`
      : `${settings.fixedMinutes} min`;
  const orderLabel = settings.orderMode === "random" ? "random order" : "in order";

  return `${itemCount} ${itemCount === 1 ? "item" : "items"} • ${timerLabel} • ${orderLabel}`;
}
