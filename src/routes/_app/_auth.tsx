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
import {
  convexQuery,
  useConvexAuth,
  useConvexPaginatedQuery,
} from "@convex-dev/react-query";
import { Button, DropdownMenu } from "@medusajs/ui";
import { api } from "@cvx/_generated/api";
import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Logo } from "@/components/logo";

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
  const { signOut } = useAuthActions();

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

  const handleNavigation = (threadId: string) => {
    navigate({ to: "/chat/$threadId", params: { threadId } });
    if (isMobile) setOpen(false); // Close only on mobile
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
      <SidebarContent>
        <p className="text-xs font-semibold text-ui-fg-muted px-2">Recents</p>
        <SidebarMenu>
          {threads.map((thread) => (
            <SidebarMenuItem key={thread._id}>
              <Button
                variant="transparent"
                className="w-full justify-start h-8 px-2 text-sm truncate mx-0"
                onClick={() => handleNavigation(thread._id)}
              >
                {thread.title || "New chat"}
              </Button>
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
