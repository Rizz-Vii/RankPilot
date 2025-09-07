export type ScheduleConfig = {
  cron?: string;
  interval?: "daily" | "hourly";
  lastRun?: number;
};
