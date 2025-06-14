import { ConvexReactClient } from "convex/react";
import { api } from "@cvx/_generated/api";
import { Doc, Id } from "@cvx/_generated/dataModel";

const CACHE_PREFIX = "tavor_thread_cache_";
const CACHED_THREADS_LIST_KEY = `${CACHE_PREFIX}threads_list`;
const CACHE_INITIALIZED_KEY = `${CACHE_PREFIX}initialized`;
const MAX_CACHED_THREADS = 10;

type MessageDoc = Doc<"messages">;

// --- Private utility functions ---

function getThreadCacheKey(threadId: Id<"threads">): string {
  return `${CACHE_PREFIX}${threadId}`;
}

function getCachedThreadIds(): Id<"threads">[] {
  try {
    const list = localStorage.getItem(CACHED_THREADS_LIST_KEY);
    return list ? JSON.parse(list) : [];
  } catch (error) {
    console.error("Error getting cached thread IDs:", error);
    return [];
  }
}

function setCachedThreadIds(threadIds: Id<"threads">[]): void {
  try {
    localStorage.setItem(CACHED_THREADS_LIST_KEY, JSON.stringify(threadIds));
  } catch (error) {
    console.error("Error setting cached thread IDs:", error);
  }
}

// --- Public API ---

/**
 * Retrieves cached messages for a specific thread from localStorage.
 */
export function getCachedThreadMessages(
  threadId: Id<"threads">,
): MessageDoc[] | null {
  try {
    const cached = localStorage.getItem(getThreadCacheKey(threadId));
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error(`Error getting cached messages for thread ${threadId}:`, error);
    return null;
  }
}

/**
 * Caches messages for a specific thread in localStorage and manages the cache size.
 */
export function cacheThreadMessages(
  threadId: Id<"threads">,
  messages: MessageDoc[],
): void {
  try {
    // Cache the messages for the current thread
    localStorage.setItem(getThreadCacheKey(threadId), JSON.stringify(messages));

    // Update the list of cached threads
    let threadIds = getCachedThreadIds();
    // Remove the threadId if it already exists to move it to the front
    threadIds = threadIds.filter((id) => id !== threadId);
    // Add the new threadId to the front (most recently used)
    threadIds.unshift(threadId);

    // If cache is full, remove the oldest thread's messages
    if (threadIds.length > MAX_CACHED_THREADS) {
      const removedThreadId = threadIds.pop();
      if (removedThreadId) {
        localStorage.removeItem(getThreadCacheKey(removedThreadId));
      }
    }

    setCachedThreadIds(threadIds);
  } catch (error) {
    // If storage is full, we might get an error.
    console.error(`Error caching messages for thread ${threadId}:`, error);
  }
}

/**
 * Initializes the chat history cache in the background on login.
 * Fetches the last 10 threads and their recent messages.
 */
export async function initThreadCache(convex: ConvexReactClient): Promise<void> {
  const initialized = sessionStorage.getItem(CACHE_INITIALIZED_KEY);
  if (initialized) {
    return;
  }
  sessionStorage.setItem(CACHE_INITIALIZED_KEY, "true");

  console.log("Initializing thread cache in the background...");

  try {
    // 1. Fetch the 10 most recent threads for the user
    const recentThreads = await convex.query(api.threads.list, {
      paginationOpts: {
          numItems: MAX_CACHED_THREADS,
          cursor: null
      },
    });

    if (!recentThreads.page.length) {
      console.log("No threads to cache.");
      return;
    }

    // 2. For each thread, fetch its messages and cache them
    for (const thread of recentThreads.page) {
      try {
        const messages = await convex.query(api.messages.getByThreadId, {
          threadId: thread._id,
          paginationOpts: {
              numItems: 50,
              cursor: null
          }, // Cache last 50 messages
          streamArgs: { kind: "list" }, // Not interested in streaming data for cache
        });
        
        if (messages.page.length > 0) {
           cacheThreadMessages(thread._id, messages.page);
        }
      } catch (e) {
        console.error(`Failed to cache messages for thread ${thread._id}`, e);
      }
    }
    
    console.log(`Successfully cached ${recentThreads.page.length} threads.`);
  } catch (error) {
    console.error("Error initializing thread cache:", error);
    sessionStorage.removeItem(CACHE_INITIALIZED_KEY);
  }
}