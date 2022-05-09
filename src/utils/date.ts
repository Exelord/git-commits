import { intervalToDuration } from "date-fns";

type Unit =
  | "year"
  | "quarter"
  | "month"
  | "week"
  | "day"
  | "hour"
  | "minute"
  | "second";

export function selectUnit(date: Date): { value: number; unit: Unit } {
  const currentDate = new Date();

  const duration = intervalToDuration({
    start: currentDate,
    end: date
  });

  const isInFuture = currentDate < date;

  if (duration.years) {
    return {
      unit: "year",
      value: isInFuture ? duration.years : -duration.years
    };
  }

  if (duration.months) {
    return {
      unit: "month",
      value: isInFuture ? duration.months : -duration.months
    };
  }

  if (duration.days) {
    if (duration.days > 6) {
      return {
        unit: "week",
        value: isInFuture
          ? Math.ceil(duration.days / 7)
          : Math.floor(-duration.days / 7)
      };
    }

    return {
      unit: "day",
      value: isInFuture ? duration.days : -duration.days
    };
  }

  if (duration.hours) {
    return {
      unit: "hour",
      value: isInFuture ? duration.hours : -duration.hours
    };
  }

  if (duration.minutes) {
    return {
      unit: "minute",
      value: isInFuture ? duration.minutes : -duration.minutes
    };
  }

  return {
    unit: "second",
    value: isInFuture ? duration.seconds || 0 : -(duration.seconds || 0)
  };
}
