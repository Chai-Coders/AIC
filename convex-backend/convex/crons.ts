import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily("remove unused pictures", { hourUTC: 21, minuteUTC: 30 }, internal.images.cleanupUnused);

crons.daily("remove expired AI sign-ins and upload links", { hourUTC: 21, minuteUTC: 45 }, internal.oauth.cleanup);

export default crons;
