import type { CompletedOrder } from "@/types/order";

export const TIMEFRAME_OPTIONS = ["Today", "Week", "Year"] as const;
export type Timeframe = (typeof TIMEFRAME_OPTIONS)[number];

export const ORDER_REVENUE_USD = 17;

export type TimeframeRange = {
  start: Date;
  end: Date;
};

export type RevenueBucket = {
  period: string;
  revenue: number;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfLocalWeekMonday(date: Date): Date {
  const day = date.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysFromMonday);
}

function startOfLocalYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12} ${period}`;
}

export function getTimeframeRange(timeframe: Timeframe, now = new Date()): TimeframeRange {
  const end = now;

  switch (timeframe) {
    case "Today":
      return { start: startOfLocalDay(now), end };
    case "Week":
      return { start: startOfLocalWeekMonday(now), end };
    case "Year":
      return { start: startOfLocalYear(now), end };
  }
}

export function isTimestampInRange(isoDate: string, range: TimeframeRange): boolean {
  const timestamp = Date.parse(isoDate);
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return timestamp >= range.start.getTime() && timestamp <= range.end.getTime();
}

export function filterOrdersByTimeframe<T extends { completedAt: string }>(
  orders: readonly T[],
  timeframe: Timeframe,
  now = new Date(),
): T[] {
  const range = getTimeframeRange(timeframe, now);
  return orders.filter((order) => isTimestampInRange(order.completedAt, range));
}

function emptyTodayBuckets(): RevenueBucket[] {
  return Array.from({ length: 12 }, (_, index) => ({
    period: formatHourLabel(index * 2),
    revenue: 0,
  }));
}

function emptyWeekBuckets(): RevenueBucket[] {
  return WEEKDAY_LABELS.map((period) => ({ period, revenue: 0 }));
}

function emptyYearBuckets(): RevenueBucket[] {
  return MONTH_LABELS.map((period) => ({ period, revenue: 0 }));
}

function mondayBasedWeekdayIndex(date: Date): number {
  return date.getDay() === 0 ? 6 : date.getDay() - 1;
}

export function bucketRevenueByTimeframe(
  orders: readonly Pick<CompletedOrder, "completedAt" | "status">[],
  timeframe: Timeframe,
  now = new Date(),
  revenuePerOrder = ORDER_REVENUE_USD,
): RevenueBucket[] {
  const range = getTimeframeRange(timeframe, now);
  const buckets =
    timeframe === "Today"
      ? emptyTodayBuckets()
      : timeframe === "Week"
        ? emptyWeekBuckets()
        : emptyYearBuckets();

  for (const order of orders) {
    if (order.status !== "done" || !isTimestampInRange(order.completedAt, range)) {
      continue;
    }

    const completedAt = new Date(order.completedAt);
    let index = -1;

    switch (timeframe) {
      case "Today":
        index = Math.floor(completedAt.getHours() / 2);
        break;
      case "Week":
        index = mondayBasedWeekdayIndex(completedAt);
        break;
      case "Year":
        index = completedAt.getMonth();
        break;
    }

    const bucket = buckets[index];
    if (bucket) {
      bucket.revenue += revenuePerOrder;
    }
  }

  return buckets;
}

export function formatCompletedAt(isoDate: string, timeframe: Timeframe): string {
  const date = new Date(isoDate);

  if (timeframe === "Today") {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
