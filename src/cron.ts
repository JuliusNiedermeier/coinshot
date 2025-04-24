import { CronJob } from "cron";

export const wakeupJob = new CronJob("*/14 * * * *", async () => {
  const response = await fetch(process.env.BASE_URL!);
  if (!response.ok) console.log("⏰❌ Failed to wake up service.");
  else console.log("⏰ Successfully woke up service");
});
