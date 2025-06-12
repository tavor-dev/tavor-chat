import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/_auth/settings/_layout/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <p>User settings will go here.</p>;
}
