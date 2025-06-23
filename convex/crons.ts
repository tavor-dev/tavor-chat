import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run cleanup every 5 minutes to find and fix stuck threads
crons.interval(
  "cleanup stuck threads",
  { minutes: 5 },
  internal.threads.cleanupStuckThreads,
);

export default crons;
