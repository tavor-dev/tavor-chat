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
import { Trash } from "@medusajs/icons";
import { Button, DropdownMenu, IconButton } from "@medusajs/ui";
import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useAction, useMutation } from "convex/react";
import { Pin, PinOff } from "lucide-react";
import { useEffect } from "react";
import { toast, Toaster } from "react-hot-toast";

const THREADS_PAGE_SIZE = 20;

export const Route = createFileRoute("/_app/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login page if user is not authenticated.
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isLoading, isAuthenticated]);

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
        <div className="flex flex-1 flex-col gap-4">
          <Outlet />
        </div>
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

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex items-center mb-2 ml-10">
          <div className="flex gap-2 items-center">
            <Logo className="h-6 w-6" />
            <h1 className="font-semibold">Tavor</h1>
          </div>
        </div>
        <Button className="w-full my-4" onClick={handleNewChat}>
          New chat
        </Button>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        <p className="text-xs font-semibold text-ui-fg-muted px-2">Recents</p>
        <SidebarMenu>
          {threads.map((thread) => (
            <SidebarMenuItem key={thread._id} className="group/thread">
              <div className="relative flex items-center group">
                <Button
                  variant="transparent"
                  className="w-full justify-start h-8 px-2 text-sm truncate mx-0"
                  onClick={() => handleNavigation(thread._id)}
                >
                  {thread.title || "New chat"}
                </Button>
                <div className="absolute overflow-hidden right-0.5 shadow-l-3xl flex items-center gap-0.5 bg-ui-bg-base rounded opacity-0 translate-x-full transition-[opacity,transform] group-hover/thread:opacity-100 group-hover/thread:translate-x-0">
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
                </div>
              </div>
            </SidebarMenuItem>
          ))}
          {threadsPaginationStatus !== "Exhausted" &&
            threadsPaginationStatus !== "LoadingFirstPage" && (
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
            )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <Button className="w-full justify-start h-8 px-2 text-sm truncate">
                {user.email || user.name || "User"}
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content className="z-50">
              <Link to="/settings">
                <DropdownMenu.Item>Settings</DropdownMenu.Item>
              </Link>
              <DropdownMenu.Separator />
              <DropdownMenu.Item
                onClick={() =>
                  void signOut().then(() => navigate({ to: "/login" }))
                }
                className="text-ui-fg-error"
              >
                Sign Out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
