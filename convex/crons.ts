import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run cleanup every 5 minutes to find and fix stuck threads
crons.interval(
  "cleanup stuck threads",
  { minutes: 5 },
  internal.threads.cleanupStuckThreads,
);

// Run cleanup every hour to delete orphaned files
// Files with refcount=0 that haven't been touched in 24+ hours
crons.interval(
  "cleanup orphaned files",
  { hours: 1 },
  internal.chat_engine.files.cleanupOrphanedFiles,
  {},
);

export default crons;
