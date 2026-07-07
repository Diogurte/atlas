export function formatTimelineDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const now = new Date();
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const eventDay = startOfDay(date);
  const time = date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (eventDay.getTime() === today.getTime()) {
    return `Hoje • ${time}`;
  }

  if (eventDay.getTime() === yesterday.getTime()) {
    return `Ontem • ${time}`;
  }

  const day = date.toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
  });

  return `${day} • ${time}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
