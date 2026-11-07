import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily("remove unused pictures", { hourUTC: 21, minuteUTC: 30 }, internal.images.cleanupUnused, {});

crons.daily("check AI model prices", { hourUTC: 22, minuteUTC: 0 }, internal.ai.prices.refresh, {});

export default crons;
