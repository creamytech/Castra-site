/**
 * Date formatting utilities for consistent display across the application
 */

export function formatDate(iso: string | null): string {
  if (!iso) return "Unknown date";
  try {
    const date = new Date(iso);
    return date.toLocaleDateString([], { 
      month: "short", 
      day: "numeric" 
    });
  } catch {
    return "Invalid date";
  }
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "Unknown date";
  try {
    const date = new Date(iso);
    return date.toLocaleDateString([], { 
      month: "short", 
      day: "numeric", 
      hour: "numeric", 
      minute: "2-digit" 
    });
  } catch {
    return "Invalid date";
  }
}

export function formatRelativeDate(iso: string | null): string {
  if (!iso) return "Unknown date";
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      // Today - show time
      return date.toLocaleTimeString([], { 
        hour: "numeric", 
        minute: "2-digit" 
      });
    } else if (diffInHours < 48) {
      // Yesterday
      return "Yesterday";
    } else if (diffInHours < 168) {
      // Within a week - show day
      return date.toLocaleDateString([], { 
        weekday: "short" 
      });
    } else {
      // Older - show full date
      return date.toLocaleDateString([], { 
        month: "short", 
        day: "numeric" 
      });
    }
  } catch {
    return "Invalid date";
  }
}

export function formatDateRange(startISO: string | null, endISO: string | null): string {
  try {
    if (!startISO || !endISO) return "Invalid date range";
    
    const startDate = new Date(startISO);
    const endDate = new Date(endISO);
    
    const startFormatted = startDate.toLocaleDateString([], { 
      month: "short", 
      day: "numeric", 
      hour: "numeric", 
      minute: "2-digit" 
    });
    const endFormatted = endDate.toLocaleTimeString([], { 
      hour: "numeric", 
      minute: "2-digit" 
    });
    
    return `${startFormatted} - ${endFormatted}`;
  } catch {
    return "Invalid date range";
  }
}

export function isValidISOString(iso: string): boolean {
  try {
    const date = new Date(iso);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}
