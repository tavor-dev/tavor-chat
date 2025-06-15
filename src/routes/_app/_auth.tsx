import { Logo } from "@/components/logo";
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
// import { ThreadDoc } from "@cvx/schema";
import { PlusMini, Trash } from "@medusajs/icons";
import {
  Button,
  DropdownMenu,
  IconButton,
  Toaster,
  toast,
  Tooltip,
  TooltipProvider,
  Avatar,
  Heading,
} from "@medusajs/ui";
import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useConvex, useAction, useMutation } from "convex/react";
import { Pin, PinOff } from "lucide-react";
import React, { useEffect, useMemo } from "react";
import { initThreadCache, clearThreadCache } from "@/lib/threadCache";

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
        {/* <header className="flex h-14 shrink-0 items-center gap-2 px-4 border-b group-has-[[data-variant=inset]]/sidebar-wrapper:group-has-[[data-state=collapsed]]/sidebar-wrapper:ml-14 transition-all"> */}
        {/* </header> */}
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

  const updateThread = useMutation(api.threads.update);
  const deleteThread = useAction(api.threads.deleteThread);

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
    await updateThread({
      threadId,
      patch: { pinned: !currentPinnedState },
    });

    toast.success(`Thread ${currentPinnedState ? "unpinned" : "pinned"}`);
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

  const ThreadItem = ({ thread }: { thread: (typeof threads)[0] }) => (
    <SidebarMenuItem className="group/thread">
      <div className="relative flex items-center group">
        <Button
          variant="transparent"
          className="w-full justify-start h-8 px-2 text-sm truncate mx-0"
          onClick={() => handleNavigation(thread._id)}
        >
          {thread.title && thread.title.length > 30
            ? thread.title.slice(0, 30) + "..."
            : thread.title || "New chat"}
        </Button>
        <div className="absolute overflow-hidden right-0.5 shadow-l-3xl flex items-center gap-0.5 opacity-0 translate-x-full transition-[opacity,transform] group-hover/thread:opacity-100 group-hover/thread:translate-x-0 bg-ui-bg-component rounded-lg">
          <TooltipProvider>
            <Tooltip
              content={thread.pinned ? "Unpin thread" : "Pin thread"}
              className="z-[9999]"
            >
              <IconButton
                size="small"
                variant="transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePinThread(thread._id, thread.pinned || false);
                }}
              >
                {thread.pinned ? (
                  <PinOff className="h-4 w-4" />
                ) : (
                  <Pin className="h-4 w-4" />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip content="Delete thread" className="z-[9999]">
              <IconButton
                size="small"
                variant="transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteThread(thread._id);
                }}
                className="text-ui-fg-error hover:text-ui-fg-error"
              >
                <Trash className="h-4 w-4" />
              </IconButton>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </SidebarMenuItem>
  );

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex items-center mb-2 ml-11 cursor-pointer">
          <div className="flex mt-1.5 gap-1 items-center">
            <Logo className="h-6 w-6" />
            <Heading level="h2" className="font-semibold">
              Tavor
            </Heading>
          </div>
        </div>
        <Button
          variant="transparent"
          className="w-full my-4 flex justify-start items-center"
          onClick={handleNewChat}
        >
          <div className="flex items-center justify-center rounded-md bg-ui-tag-purple-border p-1 mr-1">
            <PlusMini />
          </div>
          New chat
        </Button>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden pl-3">
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
                    ? "Loading"
                    : "Load more"}
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          )}
      </SidebarContent>
      <SidebarFooter>
        {/* <pre>{JSON.stringify(user.image, 0, 2)}</pre> */}
        {user && (
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <Button
                variant="secondary"
                className="w-full justify-between items-center h-8 px-2 text-sm truncate"
              >
                {/* {user?.name?.split(" ")[0] || user.email || "User"}{" "} */}
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
