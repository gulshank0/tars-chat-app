import { format, isToday, isThisYear } from "date-fns";

export function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);

  if (isToday(date)) {
    // Today: show time only (2:34 PM)
    return format(date, "h:mm a");
  } else if (isThisYear(date)) {
    // This year: show date + time (Feb 15, 2:34 PM)
    return format(date, "MMM d, h:mm a");
  } else {
    // Different year: include year (Feb 15, 2024, 2:34 PM)
    return format(date, "MMM d, yyyy, h:mm a");
  }
}

export function formatConversationTime(timestamp: number): string {
  const date = new Date(timestamp);

  if (isToday(date)) {
    return format(date, "h:mm a");
  } else if (isThisYear(date)) {
    return format(date, "MMM d");
  } else {
    return format(date, "MMM d, yyyy");
  }
}
