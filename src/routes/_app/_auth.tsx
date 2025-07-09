import { Logo } from "@/components/logo";
import { clearThreadCache, initThreadCache } from "@/lib/threadCache";
import { Sidebar, SidebarBody, useSidebar } from "@/components/sidebar";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  convexQuery,
  useConvexAuth,
  useConvexPaginatedQuery,
} from "@convex-dev/react-query";
import { api } from "@cvx/_generated/api";
import { Doc, Id } from "@cvx/_generated/dataModel";
import {
  EllipsisHorizontal,
  PencilSquare,
  PlusMini,
  Trash,
  Moon,
  ArrowUpTray,
  CreditCard,
  ChartBar,
  CogSixTooth,
  SidebarLeft,
} from "@medusajs/icons";
import {
  Avatar,
  Button,
  Drawer,
  DropdownMenu,
  // Heading,
  IconButton,
  Input,
  Prompt,
  toast,
  Toaster,
  Tooltip,
  TooltipProvider,
} from "@medusajs/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useAction, useConvex, useMutation } from "convex/react";
import { Pin, PinOff } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

const THREADS_PAGE_SIZE = 20;

type Thread = Doc<"threads">;

interface AppContextType {
  openRenameDrawer: (thread: Thread) => void;
  openDeletePrompt: (thread: Thread) => void;
}

const AppContext = React.createContext<AppContextType | null>(null);

const useApp = () => {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

export const Route = createFileRoute("/_app/_auth")({
  component: AuthRoute,
});

function AuthRoute() {
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

  return <AuthLayout />;
}

function AuthLayout() {
  const [threadToRename, setThreadToRename] = useState<Thread | null>(null);
  const [threadToDelete, setThreadToDelete] = useState<Thread | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Onboarding logic
  const { data: user } = useQuery(convexQuery(api.app.getCurrentUser, {}));
  const completeOnboarding = useMutation(
    api.chat_engine.users.completeOnboarding,
  );
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Show onboarding if user exists and has not completed it.
    // The check `user.onboardingCompleted !== true` handles both `false` and `undefined`.
    if (user && user.onboardingCompleted !== true) {
      setShowOnboarding(true);
    }
  }, [user]);

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
    if (user?._id) {
      void completeOnboarding({ userId: user._id }).then(() => {
        // Invalidate the query to refetch the user and their onboarding status.
        void queryClient.invalidateQueries({
          queryKey: convexQuery(api.app.getCurrentUser, {}).queryKey,
        });
      });
    }
  };

  // --- Rename Logic ---
  const openRenameDrawer = (thread: Thread) => {
    setSidebarOpen(false); // Close sidebar on mobile when opening drawer
    setThreadToRename(thread);
  };
  const closeRenameDrawer = () => setThreadToRename(null);
  const updateThread = useMutation(api.threads.update);
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

  // --- Delete Logic ---
  const deleteThreadAction = useAction(api.threads.deleteThread);
  const openDeletePrompt = (thread: Thread) => {
    setSidebarOpen(false); // Close sidebar on mobile for consistency
    setThreadToDelete(thread);
  };
  const closeDeletePrompt = () => setThreadToDelete(null);
  const handleDeleteThread = async (threadId: Id<"threads">) => {
    try {
      await deleteThreadAction({ threadId });
      toast.success("Thread deleted");
      closeDeletePrompt();

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
    <AppContext.Provider value={{ openRenameDrawer, openDeletePrompt }}>
      <Toaster />
      <TooltipProvider>
        <div className="flex h-screen w-full overflow-hidden bg-gray-100 dark:bg-neutral-800 md:flex-row flex-col">
          <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} animate={true}>
            <SidebarBody className="justify-between gap-4">
              <AppSidebarContent />
              <AppSidebarFooter />
            </SidebarBody>
          </Sidebar>
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden rounded-tl-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
              <Outlet />
            </div>
          </div>
        </div>
      </TooltipProvider>
      <RenameDrawer
        thread={threadToRename}
        onClose={closeRenameDrawer}
        onRename={handleRenameThread}
      />
      <DeleteConfirmationPrompt
        thread={threadToDelete}
        onClose={closeDeletePrompt}
        onDelete={handleDeleteThread}
      />
      <OnboardingPopup open={showOnboarding} onClose={handleCloseOnboarding} />
    </AppContext.Provider>
  );
}

function OnboardingPopup({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: user } = useQuery(convexQuery(api.app.getCurrentUser, {}));

  return (
    <Prompt open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Prompt.Content className="z-[600]">
        <Prompt.Header>
          <Prompt.Title>Welcome to Tavor chat!</Prompt.Title>
          <Prompt.Description>
            Hi {user?.name?.split(" ")[0] || "there"}! We're glad to have you
            here 👋!
          </Prompt.Description>
        </Prompt.Header>
        <Prompt.Footer>
          <Prompt.Action
            className="transition-fg relative inline-flex w-fit items-center justify-center overflow-hidden rounded-md outline-none disabled:bg-ui-bg-disabled disabled:border-ui-border-base disabled:text-ui-fg-disabled disabled:shadow-buttons-neutral disabled:after:hidden after:transition-fg after:absolute after:inset-0 after:content-[''] shadow-buttons-neutral text-ui-fg-on-color after:button-neutral-gradient hover:after:button-neutral-hover-gradient active:after:button-neutral-pressed-gradient focus-visible:shadow-buttons-neutral-focus txt-compact-small-plus gap-x-1.5 px-2 py-1 bg-ui-button-neutral hover:bg-ui-button-neutral-hover active:bg-ui-button-neutral-pressed"
            onClick={onClose}
          >
            Got it, let's start!
          </Prompt.Action>
        </Prompt.Footer>
      </Prompt.Content>
    </Prompt>
  );
}

function RenameDrawer({
  thread,
  onClose,
  onRename,
}: {
  thread: Thread | null;
  onClose: () => void;
  onRename: (threadId: Id<"threads">, newTitle: string) => Promise<boolean>;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    if (thread) {
      setNewTitle(thread.title || "");
    }
  }, [thread]);

  const handleRename = async () => {
    if (!thread || !newTitle.trim() || newTitle === thread.title) return;
    setIsRenaming(true);
    const success = await onRename(thread._id, newTitle);
    setIsRenaming(false);
    if (success) onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRename();
    else if (e.key === "Escape") onClose();
  };

  return (
    <Drawer open={!!thread} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Content className="z-50">
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
          <Button variant="secondary" onClick={onClose} disabled={isRenaming}>
            Cancel
          </Button>
          <Button
            onClick={handleRename}
            isLoading={isRenaming}
            disabled={
              !thread ||
              !newTitle.trim() ||
              newTitle === thread.title ||
              isRenaming
            }
          >
            {isRenaming ? "Renaming..." : "Rename"}
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}

function DeleteConfirmationPrompt({
  thread,
  onClose,
  onDelete,
}: {
  thread: Thread | null;
  onClose: () => void;
  onDelete: (threadId: Id<"threads">) => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!thread) return;
    setIsDeleting(true);
    await onDelete(thread._id);
    // No need to set isDeleting(false) or call onClose, as the component will
    // either unmount or be passed a null `thread` prop which handles cleanup.
  };

  useEffect(() => {
    if (!thread) {
      setIsDeleting(false);
    }
  }, [thread]);

  return (
    <Prompt open={!!thread} onOpenChange={(open) => !open && onClose()}>
      <Prompt.Content className="z-[500]">
        <Prompt.Header>
          <Prompt.Title>Delete thread?</Prompt.Title>
          <Prompt.Description>
            This action cannot be undone. Are you sure you want to delete "
            {thread?.title || "this thread"}"?
          </Prompt.Description>
        </Prompt.Header>
        <Prompt.Footer>
          <Prompt.Cancel onClick={onClose} disabled={isDeleting}>
            Cancel
          </Prompt.Cancel>
          <Prompt.Action onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Prompt.Action>
        </Prompt.Footer>
      </Prompt.Content>
    </Prompt>
  );
}

function AppSidebarContent() {
  const { open, isPinned, togglePin } = useSidebar();
  const navigate = useNavigate();
  const router = useRouter();

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
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  }

  const handleNavigation = (threadId: Id<"threads">) => {
    navigate({ to: "/chat/$threadId", params: { threadId } });
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
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const { open: isSidebarOpen, setMenuOpen } = useSidebar();
    const { openRenameDrawer, openDeletePrompt } = useApp();

    const handleDropdownOpenChange = (isOpen: boolean) => {
      setDropdownOpen(isOpen);
      setMenuOpen(isOpen);
    };

    useEffect(() => {
      // Cleanup effect: if the dropdown is open when the item is deleted,
      // we need to tell the sidebar that the menu has "closed"
      // to prevent the sidebar from getting stuck open.
      return () => {
        if (dropdownOpen) {
          setMenuOpen(false);
        }
      };
    }, [dropdownOpen, setMenuOpen]);

    // Effect to close the dropdown if the sidebar collapses.
    useEffect(() => {
      if (!isSidebarOpen && dropdownOpen) {
        handleDropdownOpenChange(false);
      }
    }, [isSidebarOpen, dropdownOpen]);

    // The menu is only open if the sidebar is open AND its own state is open
    const isMenuActuallyOpen = isSidebarOpen && dropdownOpen;

    // Check if this thread is currently active
    const isActive = currentThreadId === thread._id;

    return (
      <div className="group/thread relative">
        <div className="flex items-center">
          <Button
            variant="transparent"
            className={cn(
              "flex-1 justify-start h-8 px-2 text-sm truncate group-hover/thread:pr-10 transition-all",
              isActive
                ? "bg-ui-bg-component-pressed text-ui-fg-base font-medium"
                : "hover:bg-ui-bg-component-hover text-neutral-700 dark:text-neutral-200",
            )}
            onClick={() => handleNavigation(thread._id)}
          >
            {thread.title && thread.title.length > 25
              ? thread.title.slice(0, 22) + "..."
              : thread.title || "New chat"}
          </Button>

          {/* Actions button - positioned absolutely to avoid layout shifts */}
          <div
            className={cn(
              "absolute right-2 transition-opacity",
              dropdownOpen || isActive
                ? "opacity-100"
                : "opacity-0 group-hover/thread:opacity-100",
            )}
          >
            <DropdownMenu
              open={isMenuActuallyOpen}
              onOpenChange={handleDropdownOpenChange}
            >
              <DropdownMenu.Trigger asChild>
                <IconButton
                  size="small"
                  variant="transparent"
                  className="bg-ui-bg-component hover:bg-ui-bg-component-hover border border-ui-border-base shadow-sm"
                >
                  <EllipsisHorizontal className="h-4 w-4" />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content className="z-[500]" align="end">
                <DropdownMenu.Item
                  className="gap-x-2"
                  onSelect={() => openRenameDrawer(thread)}
                >
                  <PencilSquare className="text-ui-fg-subtle h-4 w-4" />
                  Rename
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="gap-x-2"
                  onSelect={() =>
                    handlePinThread(thread._id, thread.pinned || false)
                  }
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
                  onSelect={() => openDeletePrompt(thread)}
                >
                  <Trash className="h-4 w-4" />
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        {<LogoWithText />}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="pr-1 hidden md:block"
            >
              <Tooltip content={isPinned ? "Unpin sidebar" : "Pin sidebar"}>
                <IconButton
                  size="small"
                  variant="transparent"
                  onClick={togglePin}
                  className="text-ui-fg-muted hover:text-ui-fg-subtle"
                  aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar"}
                >
                  {isPinned ? (
                    <SidebarLeft className="h-4 w-4 text-ui-fg-base" />
                  ) : (
                    <SidebarLeft className="h-4 w-4 text-ui-fg-muted" />
                  )}
                </IconButton>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Button
        variant="transparent"
        className={cn(
          "w-full mb-4 flex items-center text-neutral-700 dark:text-neutral-200",
          open ? "justify-start" : "justify-center",
        )}
        onClick={handleNewChat}
      >
        <div className="flex items-center justify-center rounded-md shadow-lg border border-ui-border-base p-1">
          <PlusMini className="h-4 w-4" />
        </div>
        {open && <span className="whitespace-pre ml-2">New chat</span>}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-1 flex-col min-h-0 overflow-hidden"
          >
            {/* Search input */}
            <div className="mb-4 p-0.5">
              <Input
                placeholder="Search threads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-base"
                type="search"
              />
            </div>

            {/* Thread list */}
            <div className="flex-1 overflow-y-auto">
              {debouncedSearchQuery ? (
                <>
                  {isSearching && (
                    <p className="p-2 text-sm text-ui-fg-muted">Searching...</p>
                  )}
                  {!isSearching && searchResults && (
                    <div className="space-y-1">
                      {searchResults.length > 0 ? (
                        searchResults.map((thread) => (
                          <ThreadItem key={thread._id} thread={thread} />
                        ))
                      ) : (
                        <p className="px-2 text-sm text-ui-fg-muted">
                          No results found
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {groupedThreads.pinned.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-ui-fg-muted px-2 mb-1">
                        Pinned
                      </p>
                      <div className="space-y-1">
                        {groupedThreads.pinned.map((thread) => (
                          <ThreadItem key={thread._id} thread={thread} />
                        ))}
                      </div>
                    </div>
                  )}
                  {groupedThreads.groups.map((group) => (
                    <div key={group.label} className="mb-4">
                      <p className="text-xs font-semibold text-ui-fg-muted px-2 mb-1">
                        {group.label}
                      </p>
                      <div className="space-y-1">
                        {group.threads.map((thread) => (
                          <ThreadItem key={thread._id} thread={thread} />
                        ))}
                      </div>
                    </div>
                  ))}
                  {threadsPaginationStatus === "CanLoadMore" && (
                    <div className="my-2">
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => loadMoreThreads(THREADS_PAGE_SIZE)}
                      >
                        Load more
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AppSidebarFooter() {
  const { data: user } = useQuery(convexQuery(api.app.getCurrentUser, {}));
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const { open, setMenuOpen } = useSidebar();
  const [footerMenuOpen, setFooterMenuOpen] = React.useState(false);

  if (!user) return null;

  const handleOpenChange = (isOpen: boolean) => {
    setFooterMenuOpen(isOpen);
    setMenuOpen(isOpen);
  };

  // The menu is only open if the sidebar is open AND its own state is open
  const isDropdownOpen = open && footerMenuOpen;

  // Effect to close the dropdown if the sidebar collapses.
  // This is a failsafe for edge cases.
  useEffect(() => {
    if (!open && footerMenuOpen) {
      handleOpenChange(false);
    }
  }, [open, footerMenuOpen]);

  return (
    <div>
      <DropdownMenu open={isDropdownOpen} onOpenChange={handleOpenChange}>
        <DropdownMenu.Trigger asChild>
          <Button
            variant="secondary"
            className={cn(
              "w-full items-center h-8 px-2 text-sm truncate",
              open ? "justify-between" : "justify-center",
            )}
          >
            {open && (
              <span className="truncate">
                {user?.name || user.email || "User"}
              </span>
            )}
            <Avatar
              className="h-6 w-6"
              src={user?.image ?? undefined}
              fallback={
                user?.name
                  ? user.name[0] + (user.name.split(" ")[1]?.[0] || "")
                  : "-"
              }
            />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content className="z-[500]">
          <Link to="/settings">
            <DropdownMenu.Item className="flex items-center gap-2">
              <CogSixTooth className="h-4 w-4" /> Settings
            </DropdownMenu.Item>
          </Link>
          <Link to="/settings?tab=billing">
            <DropdownMenu.Item className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Billing
            </DropdownMenu.Item>
          </Link>
          <Link to="/settings?tab=usage">
            <DropdownMenu.Item className="flex items-center gap-2">
              <ChartBar className="h-4 w-4" /> Usage
            </DropdownMenu.Item>
          </Link>
          <Link to="/settings?tab=theme">
            <DropdownMenu.Item className="flex items-center gap-2">
              <Moon className="h-4 w-4" /> Theme
            </DropdownMenu.Item>
          </Link>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            onClick={() => {
              clearThreadCache();
              void signOut().then(() => navigate({ to: "/login" }));
            }}
            className="text-ui-fg-error flex items-center gap-2"
          >
            <ArrowUpTray className="-rotate-90 h-4 w-4" /> Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  );
}

const LogoWithText = () => {
  const { open } = useSidebar();
  return (
    <div className="flex items-center py-1 pl-1">
      <Logo className="h-6" />
      {open && (
        <span className="font-semibold text-black dark:text-white ml-2 whitespace-nowrap select-none">
          Tavor chat
        </span>
      )}
    </div>
  );
};
