export enum TimeGrain {
  Day = "day",
  Week = "week",
  Month = "month",
  Quarter = "quarter",
  Year = "year"
}

export enum CalendarTimeGrain {
  CalendarDay = "calendar-day",
  CalendarWeek = "calendar-week",
  CalendarMonth = "calendar-month",
  CalendarQuarter = "calendar-quarter",
  CalendarYear = "calendar-year"
}

export enum ToDateTimeGrain {
  ToDateWeekWeek = "toDate-week-week",
  ToDateMonthMonth = "toDate-month-month",
  ToDateQuarterQuarter = "toDate-quarter-quarter",
  ToDateYearYear = "toDate-year-year"
}

export enum CumulativeTimeGrain {
  ToDateDayLifetime = "toDate-day-lifetime",
  ToDateWeekLifetime = "toDate-week-lifetime",
  ToDateMonthLifetime = "toDate-month-lifetime",
  ToDateQuarterLifetime = "toDate-quarter-lifetime",
  ToDateYearLifetime = "toDate-year-lifetime"
}

export type RollingTimeGrain =
  `rolling-${TimeGrain}-${number}-${number}-${TimeGrain}`;

export type CubeTimeGrain =
  | CalendarTimeGrain
  | RollingTimeGrain
  | ToDateTimeGrain
  | CumulativeTimeGrain;

export enum WeekStart {
  Sunday = 0,
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6
}
