import { Logo } from "@/components/logo";
import { clearThreadCache, initThreadCache } from "@/lib/threadCache";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/ui/sidebar";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  convexQuery,
  useConvexAuth,
  useConvexPaginatedQuery,
} from "@convex-dev/react-query";
import { api } from "@cvx/_generated/api";
import { Id } from "@cvx/_generated/dataModel";
import {
  EllipsisHorizontal,
  PencilSquare,
  PlusMini,
  Trash,
} from "@medusajs/icons";
import {
  Avatar,
  Button,
  Drawer,
  DropdownMenu,
  Heading,
  IconButton,
  Input,
  Prompt,
  toast,
  Toaster,
} from "@medusajs/ui";
import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import {
  useAction,
  useConvex,
  useMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import { Pin, PinOff } from "lucide-react";
import React, { useEffect, useMemo } from "react";

const THREADS_PAGE_SIZE = 20;

export const Route = createFileRoute("/_app/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();
  const convex = useConvex();

  useEffect(() => {
    // Redirect to login page if user is not authenticated.
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      // This will run once when the user is authenticated.
      // The initThreadCache function has internal logic to prevent running
      // more than once per session.
      void initThreadCache(convex);
    }
  }, [isAuthenticated, convex]);

  if (isLoading && !isAuthenticated) {
    return null;
  }

  // at this point, user should exist

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="fixed left-2 z-50 p-1 top-2">
        <SidebarTrigger className="ml-1" />
      </div>
      <SidebarInset className="border-ui-bg-base md:peer-data-[variant=inset]:peer-data-[state=collapsed]:m-0 md:peer-data-[variant=inset]:peer-data-[state=collapsed]:rounded-none transition-all">
        <Outlet />
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}

function AppSidebar() {
  const { data: user } = useQuery(convexQuery(api.app.getCurrentUser, {}));
  const { isMobile, setOpen } = useSidebar();
  const navigate = useNavigate();
  const router = useRouter();
  const { signOut } = useAuthActions();

  // State to force re-renders when route changes
  const [, setForceUpdate] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] =
    React.useState(searchQuery);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const { data: searchResults, isLoading: isSearching } = useQuery(
    convexQuery(
      api.threads.search,
      debouncedSearchQuery ? { query: debouncedSearchQuery } : "skip",
    ),
  );

  const updateThread = useMutation(api.threads.update);
  const deleteThread = useAction(api.threads.deleteThread);

  // Get current thread ID from the URL - try multiple approaches for better reactivity
  const currentThreadId = useMemo(() => {
    // Try to get from router state first
    let pathname = router.state.location.pathname;

    // Fallback to window location if router state isn't updated
    if (typeof window !== "undefined" && !pathname.includes("/chat/")) {
      pathname = window.location.pathname;
    }

    const match = pathname.match(/\/chat\/(.+)/);
    return match ? match[1] : null;
  }, [router.state.location.pathname]);

  // Also listen to router history changes
  useEffect(() => {
    const handleRouteChange = () => {
      // Force a re-render when route changes
      setForceUpdate((prev) => prev + 1);
    };

    // Listen for browser navigation events
    if (typeof window !== "undefined") {
      window.addEventListener("popstate", handleRouteChange);
      // Also listen for pushstate/replacestate which don't trigger popstate
      const originalPushState = window.history.pushState;
      const originalReplaceState = window.history.replaceState;

      window.history.pushState = function (...args) {
        originalPushState.apply(window.history, args);
        handleRouteChange();
      };

      window.history.replaceState = function (...args) {
        originalReplaceState.apply(window.history, args);
        handleRouteChange();
      };

      return () => {
        window.removeEventListener("popstate", handleRouteChange);
        window.history.pushState = originalPushState;
        window.history.replaceState = originalReplaceState;
      };
    }
  }, []);

  // unfortunately can't go through tanstack yet:
  // https://github.com/get-convex/convex-react-query/issues/1
  const {
    results: threads,
    status: threadsPaginationStatus,
    loadMore: loadMoreThreads,
  } = useConvexPaginatedQuery(
    api.threads.list,
    {},
    { initialNumItems: THREADS_PAGE_SIZE },
  );

  async function handleNewChat() {
    try {
      navigate({ to: "/" });
      if (isMobile) setOpen(false); // Close only on mobile
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  }

  const handleNavigation = (threadId: Id<"threads">) => {
    navigate({ to: "/chat/$threadId", params: { threadId } });
    if (isMobile) setOpen(false); // Close only on mobile
  };

  const handlePinThread = async (
    threadId: Id<"threads">,
    currentPinnedState: boolean,
  ) => {
    try {
      await updateThread({
        threadId,
        patch: { pinned: !currentPinnedState },
      });
      toast.success(`Thread ${currentPinnedState ? "unpinned" : "pinned"}`);
    } catch (error) {
      console.error("Failed to pin/unpin thread:", error);
      toast.error("Failed to update thread");
    }
  };

  const handleDeleteThread = async (threadId: Id<"threads">) => {
    try {
      await deleteThread({ threadId });
      toast.success("Thread deleted");

      // If we're currently viewing this thread, navigate away
      const currentThreadId =
        router.latestLocation.pathname.match(/\/chat\/(.+)/)?.[1];
      if (currentThreadId === threadId) {
        navigate({ to: "/" });
      }
    } catch (error) {
      console.error("Failed to delete thread:", error);
      toast.error("Failed to delete thread");
    }
  };

  const handleRenameThread = async (
    threadId: Id<"threads">,
    newTitle: string,
  ) => {
    try {
      await updateThread({ threadId, patch: { title: newTitle.trim() } });
      toast.success("Thread renamed");
      return true;
    } catch (error) {
      console.error("Failed to rename thread:", error);
      toast.error("Failed to rename thread");
      return false;
    }
  };

  const groupedThreads = useMemo(() => {
    if (!threads) return { pinned: [], groups: [] };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const pinned = threads.filter((thread) => thread.pinned);
    const unpinned = threads.filter((thread) => !thread.pinned);

    const groups: Array<{ label: string; threads: typeof threads }> = [];

    const todayThreads = unpinned.filter((thread) => {
      const threadDate = new Date(thread._creationTime);
      return threadDate >= today;
    });

    const yesterdayThreads = unpinned.filter((thread) => {
      const threadDate = new Date(thread._creationTime);
      return threadDate >= yesterday && threadDate < today;
    });

    const lastWeekThreads = unpinned.filter((thread) => {
      const threadDate = new Date(thread._creationTime);
      return threadDate >= lastWeek && threadDate < yesterday;
    });

    const lastMonthThreads = unpinned.filter((thread) => {
      const threadDate = new Date(thread._creationTime);
      return threadDate >= lastMonth && threadDate < lastWeek;
    });

    const olderThreads = unpinned.filter((thread) => {
      const threadDate = new Date(thread._creationTime);
      return threadDate < lastMonth;
    });

    if (todayThreads.length > 0)
      groups.push({ label: "Today", threads: todayThreads });
    if (yesterdayThreads.length > 0)
      groups.push({ label: "Yesterday", threads: yesterdayThreads });
    if (lastWeekThreads.length > 0)
      groups.push({ label: "Previous 7 days", threads: lastWeekThreads });
    if (lastMonthThreads.length > 0)
      groups.push({ label: "Previous 30 days", threads: lastMonthThreads });
    if (olderThreads.length > 0)
      groups.push({ label: "Older", threads: olderThreads });

    return { pinned, groups };
  }, [threads]);

  const ThreadItem = ({ thread }: { thread: (typeof threads)[0] }) => {
    const [deletePromptOpen, setDeletePromptOpen] = React.useState(false);
    const [renameDrawerOpen, setRenameDrawerOpen] = React.useState(false);
    const [newTitle, setNewTitle] = React.useState(thread.title || "");
    const [isRenaming, setIsRenaming] = React.useState(false);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);

    // Check if this thread is currently active
    const isActive = currentThreadId === thread._id;

    // Keep input in sync if thread changes
    React.useEffect(() => {
      setNewTitle(thread.title || "");
    }, [thread.title]);

    const handleRename = async () => {
      if (!newTitle.trim() || newTitle === thread.title) return;

      setIsRenaming(true);
      const success = await handleRenameThread(thread._id, newTitle);
      setIsRenaming(false);

      if (success) {
        setRenameDrawerOpen(false);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleRename();
      } else if (e.key === "Escape") {
        setRenameDrawerOpen(false);
        setNewTitle(thread.title || "");
      }
    };

    return (
      <>
        <SidebarMenuItem className="group/thread">
          <div className="relative flex items-center px-3 md:px-3 md:-ml-2">
            <Button
              variant="transparent"
              className={`flex-1 justify-start h-8 px-2 text-sm truncate group-hover/thread:pr-10 transition-all ${
                isActive
                  ? "bg-ui-bg-component-pressed text-ui-fg-base font-medium"
                  : "hover:bg-ui-bg-component-hover"
              }`}
              onClick={() => handleNavigation(thread._id)}
            >
              {thread.title && thread.title.length > 30
                ? thread.title.slice(0, 30) + "..."
                : thread.title || "New chat"}
            </Button>

            {/* Actions button - positioned absolutely to avoid layout shifts */}
            <div
              className={
                "absolute right-5 transition-opacity " +
                (dropdownOpen || isActive
                  ? "opacity-100"
                  : "opacity-0 group-hover/thread:opacity-100")
              }
            >
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenu.Trigger asChild>
                  <IconButton
                    size="small"
                    variant="transparent"
                    className="bg-ui-bg-component hover:bg-ui-bg-component-hover border border-ui-border-base shadow-sm"
                  >
                    <EllipsisHorizontal className="h-4 w-4" />
                  </IconButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content className="z-[9999]" align="end">
                  <DropdownMenu.Item
                    className="gap-x-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameDrawerOpen(true);
                      setDropdownOpen(false);
                    }}
                  >
                    <PencilSquare className="text-ui-fg-subtle h-4 w-4" />
                    Rename
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="gap-x-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePinThread(thread._id, thread.pinned || false);
                      setDropdownOpen(false);
                    }}
                  >
                    {thread.pinned ? (
                      <PinOff className="text-ui-fg-subtle h-4 w-4" />
                    ) : (
                      <Pin className="text-ui-fg-subtle h-4 w-4" />
                    )}
                    {thread.pinned ? "Unpin" : "Pin"}
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item
                    className="gap-x-2 text-ui-fg-error focus:text-ui-fg-error"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletePromptOpen(true);
                      setDropdownOpen(false);
                    }}
                  >
                    <Trash className="h-4 w-4" />
                    Delete
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu>
            </div>
          </div>
        </SidebarMenuItem>

        {/* Delete confirmation prompt */}
        <Prompt open={deletePromptOpen} onOpenChange={setDeletePromptOpen}>
          <Prompt.Content>
            <Prompt.Header>
              <Prompt.Title>Delete thread?</Prompt.Title>
              <Prompt.Description>
                This action cannot be undone. Are you sure you want to delete "
                {thread.title || "this thread"}"?
              </Prompt.Description>
            </Prompt.Header>
            <Prompt.Footer>
              <Prompt.Cancel onClick={() => setDeletePromptOpen(false)}>
                Cancel
              </Prompt.Cancel>
              <Prompt.Action
                onClick={async () => {
                  setDeletePromptOpen(false);
                  await handleDeleteThread(thread._id);
                }}
                className=""
              >
                Delete
              </Prompt.Action>
            </Prompt.Footer>
          </Prompt.Content>
        </Prompt>

        {/* Rename drawer */}
        <Drawer open={renameDrawerOpen} onOpenChange={setRenameDrawerOpen}>
          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>Rename thread</Drawer.Title>
            </Drawer.Header>
            <Drawer.Body className="space-y-4">
              <div className="w-full max-w-md">
                <Input
                  placeholder="Enter thread name"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isRenaming}
                  autoFocus
                  className="w-full text-base"
                />
              </div>
            </Drawer.Body>
            <Drawer.Footer>
              <Button
                variant="secondary"
                onClick={() => {
                  setRenameDrawerOpen(false);
                  setNewTitle(thread.title || "");
                }}
                disabled={isRenaming}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRename}
                isLoading={isRenaming}
                disabled={
                  !newTitle.trim() || newTitle === thread.title || isRenaming
                }
              >
                {isRenaming ? "Renaming..." : "Rename"}
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer>
      </>
    );
  };

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex items-center mb-2 ml-2.5 md:ml-11 cursor-pointer">
          <div className="flex mt-1.5 gap-1 items-center">
            <Logo className="h-6 w-6" />
            <Heading level="h2" className="font-semibold">
              Tavor
            </Heading>
          </div>
        </div>
        <div className="px-2">
          <Button
            variant="transparent"
            className="w-full my-4 flex justify-start items-center"
            onClick={handleNewChat}
          >
            <div className="flex items-center justify-center rounded-md bg-ui-tag-purple-border p-1 mr-1 -ml-2">
              <PlusMini />
            </div>
            New chat
          </Button>
        </div>
        <div className="px-2 mb-2">
          <Input
            placeholder="Search threads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-base"
            type="search"
          />
        </div>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden ml-1 md:ml-3">
        {debouncedSearchQuery ? (
          <>
            {isSearching && (
              <p className="p-2 text-sm text-ui-fg-muted">Searching...</p>
            )}
            {!isSearching && searchResults && (
              <SidebarMenu>
                {searchResults.length > 0 ? (
                  searchResults.map((thread) => (
                    <ThreadItem key={thread._id} thread={thread} />
                  ))
                ) : (
                  <SidebarMenuItem>
                    <p className="px-2 text-sm text-ui-fg-muted">
                      No results found
                    </p>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            )}
          </>
        ) : (
          <>
            {/* Pinned threads */}
            {groupedThreads.pinned.length > 0 && (
              <>
                <p className="text-xs font-semibold text-ui-fg-muted px-2 mt-2">
                  Pinned
                </p>
                <SidebarMenu>
                  {groupedThreads.pinned.map((thread) => (
                    <ThreadItem key={thread._id} thread={thread} />
                  ))}
                </SidebarMenu>
              </>
            )}

            {/* Time-grouped threads */}
            {groupedThreads.groups.map((group) => (
              <React.Fragment key={group.label}>
                <p className="text-xs font-semibold text-ui-fg-muted px-2 mt-4 first:mt-2">
                  {group.label}
                </p>
                <SidebarMenu>
                  {group.threads.map((thread) => (
                    <ThreadItem key={thread._id} thread={thread} />
                  ))}
                </SidebarMenu>
              </React.Fragment>
            ))}

            {threadsPaginationStatus !== "Exhausted" &&
              threadsPaginationStatus !== "LoadingFirstPage" && (
                <SidebarMenu className="mt-2">
                  <SidebarMenuItem>
                    <Button
                      variant="secondary"
                      className="w-full justify-center h-6 px-2 text-sm truncate mx-0"
                      disabled={threadsPaginationStatus === "LoadingMore"}
                      onClick={() => loadMoreThreads(THREADS_PAGE_SIZE)}
                    >
                      {threadsPaginationStatus === "LoadingMore"
                        ? "Loading..."
                        : "Load more"}
                    </Button>
                  </SidebarMenuItem>
                </SidebarMenu>
              )}
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <Button
                variant="secondary"
                className="w-full justify-between items-center h-8 px-2 text-sm truncate"
              >
                {user?.name || user.email || "User"}{" "}
                <Avatar
                  className="h-6 w-6"
                  src={user?.image}
                  fallback={
                    user?.name
                      ? user.name[0] + (user.name.split(" ")[1]?.[0] || "")
                      : "-"
                  }
                />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content className="z-50">
              <Link to="/settings">
                <DropdownMenu.Item>Settings</DropdownMenu.Item>
              </Link>
              <DropdownMenu.Separator />
              <DropdownMenu.Item
                onClick={() => {
                  clearThreadCache();
                  void signOut().then(() => navigate({ to: "/login" }));
                }}
                className="text-ui-fg-error"
              >
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
