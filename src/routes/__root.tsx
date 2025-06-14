import { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Outlet,
  useRouter,
} from "@tanstack/react-router";
import React, { Suspense } from "react";
import { Helmet } from "react-helmet-async";

const TanStackRouterDevtools =
  process.env.NODE_ENV === "development"
    ? () => null // Render nothing in production
    : React.lazy(() =>
        // Lazy load in development
        import("@tanstack/router-devtools").then((res) => ({
          default: res.TanStackRouterDevtools,
          // For Embedded Mode
          // default: res.TanStackRouterDevtoolsPanel
        })),
      );

const GridOverlay = () => (
  <div
    style={{
      pointerEvents: "none",
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      zIndex: 9999,
      backgroundImage:
        "repeating-linear-gradient(to right, rgba(255,0,0,0.25) 0, rgba(255,0,0,0.25) 2px, transparent 2px, transparent 20px)," +
        "repeating-linear-gradient(to bottom, rgba(255,0,0,0.25) 0, rgba(255,0,0,0.25) 2px, transparent 2px, transparent 20px)",
      backgroundSize: "20px 20px",
      mixBlendMode: "multiply",
    }}
  />
);

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: () => {
    const router = useRouter();
    const matchWithTitle = [...router.state.matches]
      .reverse()
      .find((d) => d.__routeContext?.title);
    const title = (matchWithTitle?.__routeContext.title ||
      "Tavor chat") as string;

    return (
      <div className="min-h-screen flex flex-col">
        {/* {process.env.NODE_ENV === "development" && <GridOverlay />} */}
        <Outlet />
        <Helmet>
          <title>{title}</title>
          {/* Favicons */}
          <link
            rel="icon"
            type="image/png"
            sizes="32x32"
            href="/favicon-32x32.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="16x16"
            href="/favicon-16x16.png"
          />
          <link rel="icon" type="image/svg+xml" href="/logo.svg" />
          <link rel="shortcut icon" href="/favicon.ico" />
          {/* Apple Touch Icon */}
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          {/* Android Chrome Icons */}
          <link
            rel="icon"
            type="image/png"
            sizes="192x192"
            href="/android-chrome-192x192.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="512x512"
            href="/android-chrome-512x512.png"
          />
          {/* Manifest */}
          <link rel="manifest" href="/site.webmanifest" />
          {/* Open Graph / Social */}
          <meta property="og:title" content={title} />
          <meta property="og:image" content="/logo.png" />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Tavor chat" />
          <meta property="og:locale" content="en_US" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={title} />
          <meta name="twitter:image" content="/logo.png" />
        </Helmet>
        <Suspense>
          <TanStackRouterDevtools />
        </Suspense>
      </div>
    );
  },
});
