import { paginator } from "convex-helpers/server/pagination";
import type { Id } from "@cvx/_generated/dataModel";
import {
  mutation,
  type MutationCtx,
  query,
  internalMutation,
  internalQuery,
} from "@cvx/_generated/server";
import schema, { v } from "@cvx/schema";
import { paginationOptsValidator } from "convex/server";
import type { Infer } from "convex/values";
import { api, internal } from "@cvx/_generated/api";

const addFileArgs = v.object({
  storageId: v.string(),
  hash: v.string(),
  filename: v.optional(v.string()),
  mimeType: v.string(),
});

export const addFile = mutation({
  args: addFileArgs,
  handler: addFileHandler,
  returns: {
    fileId: v.id("files"),
    storageId: v.string(),
  },
});

export async function addFileHandler(
  ctx: MutationCtx,
  args: Infer<typeof addFileArgs>,
) {
  const existingFile = await ctx.db
    .query("files")
    .withIndex("hash", (q) => q.eq("hash", args.hash))
    .filter((q) => q.eq(q.field("filename"), args.filename))
    .first();
  if (existingFile) {
    // increment the refcount
    await ctx.db.patch(existingFile._id, {
      refcount: existingFile.refcount + 1,
      lastTouchedAt: Date.now(),
    });
    return {
      fileId: existingFile._id,
      storageId: existingFile.storageId,
    };
  }
  const fileId = await ctx.db.insert("files", {
    ...args,
    // We start out with it unused - when it's saved in a message we increment.
    refcount: 0,
    lastTouchedAt: Date.now(),
  });
  return {
    fileId,
    storageId: args.storageId,
  };
}

export const get = query({
  args: {
    fileId: v.id("files"),
  },
  returns: v.union(v.null(), v.doc("files")),
  handler: async (ctx, args) => {
    return ctx.db.get(args.fileId);
  },
});

/**
 * If you plan to have the same file added over and over without a reference to
 * the fileId, you can use this query to get the fileId of the existing file.
 * Note: this will not increment the refcount. only saving messages does that.
 * It will only match if the filename is the same (or both are undefined).
 */
export const useExistingFile = mutation({
  args: {
    hash: v.string(),
    filename: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("files")
      .withIndex("hash", (q) => q.eq("hash", args.hash))
      .filter((q) => q.eq(q.field("filename"), args.filename))
      .first();
    if (!file) {
      return null;
    }
    await ctx.db.patch(file._id, {
      lastTouchedAt: Date.now(),
    });
    return { fileId: file._id, storageId: file.storageId };
  },
  returns: v.union(
    v.null(),
    v.object({
      fileId: v.id("files"),
      storageId: v.string(),
    }),
  ),
});

export const copyFile = mutation({
  args: {
    fileId: v.id("files"),
  },
  handler: copyFileHandler,
  returns: v.null(),
});

export async function copyFileHandler(
  ctx: MutationCtx,
  args: { fileId: Id<"files"> },
) {
  const file = await ctx.db.get(args.fileId);
  if (!file) {
    throw new Error("File not found");
  }
  await ctx.db.patch(args.fileId, {
    refcount: file.refcount + 1,
    lastTouchedAt: Date.now(),
  });
}

/**
 * Get files that are unused and can be deleted.
 * This is useful for cleaning up files that are no longer needed.
 * Note: recently added files that have not been saved yet will show up here.
 * You can inspect the `lastTouchedAt` field to see how recently it was used.
 * I'd recommend not deleting anything touched in the last 24 hours.
 */
export const getFilesToDelete = internalQuery({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const files = await paginator(ctx.db, schema)
      .query("files")
      .withIndex("refcount", (q) => q.eq("refcount", 0))
      .paginate(args.paginationOpts);
    return files;
  },
  returns: v.object({
    page: v.array(v.doc("files")),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
});

export const deleteFiles = mutation({
  args: {
    fileIds: v.array(v.id("files")),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await Promise.all(
      args.fileIds.map(async (fileId) => {
        const file = await ctx.db.get(fileId);
        if (!file) {
          console.error(`File ${fileId} not found when deleting, skipping...`);
          return;
        }
        if (file.refcount && file.refcount > 0) {
          if (!args.force) {
            console.error(
              `File ${fileId} has refcount ${file.refcount} > 0, skipping...`,
            );
            return;
          }
        }
        await ctx.db.delete(fileId);
      }),
    );
  },
  returns: v.null(),
});

/**
 * Internal action to clean up orphaned files.
 * Deletes files that have:
 * - refcount = 0 (no references)
 * - lastTouchedAt older than 24 hours
 *
 * This is meant to be called by a cron job.
 */
export const cleanupOrphanedFiles = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const THRESHOLD_MS = 1000 * 60 * 60 * 24;

    const files = await ctx.runQuery(
      internal.chat_engine.files.getFilesToDelete,
      {
        paginationOpts: {
          cursor: args.cursor ?? null,
          numItems: 100,
        },
      },
    );
    // Only delete files that haven't been touched in the last 24 hours
    const toDelete = files.page.filter(
      (f) => f.lastTouchedAt < Date.now() - THRESHOLD_MS,
    );
    if (toDelete.length > 0) {
      console.debug(`Deleting ${toDelete.length} files...`);
    }
    await Promise.all(
      toDelete.map((f) => ctx.storage.delete(f.storageId as Id<"_storage">)),
    );
    // Also mark them as deleted in the component.
    // This is in a transaction (mutation), so there's no races.
    await ctx.runMutation(api.chat_engine.files.deleteFiles, {
      fileIds: toDelete.map((f) => f._id),
    });
    if (!files.isDone) {
      console.debug(
        `Deleted ${toDelete.length} files but not done yet, continuing...`,
      );
      await ctx.scheduler.runAfter(
        0,
        internal.chat_engine.files.cleanupOrphanedFiles,
        {
          cursor: files.continueCursor,
        },
      );
    }
  },
});
