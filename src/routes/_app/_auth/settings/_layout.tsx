import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@medusajs/ui";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/_auth/settings/_layout")({
  component: RouteComponent,
});

function RouteComponent() {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-black">Settings</h1>
      <Outlet />
      <div className="mt-8">
        <Button
          variant="danger"
          onClick={() => void signOut().then(() => navigate({ to: "/" }))}
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}
