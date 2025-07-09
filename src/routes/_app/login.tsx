import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { Button, Heading, Text } from "@medusajs/ui";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { Loader } from "@/components/loader";
import { Google } from "@medusajs/icons";

export const Route = createFileRoute("/_app/login")({
  component: AuthComponent,
});

function AuthComponent() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [isLoadingButton, setIsLoadingButton] = useState(false);
  if (isLoading && !isAuthenticated) {
    return null;
  }
  const { signIn } = useAuthActions();
  const navigate = useNavigate({ from: "/login" });

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate({ to: "/" });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      <div className="min-h-screen bg-ui-bg-base flex flex-col items-center justify-center p-4 w-screen">
        {/* Company Logo */}
        <div className="">
          <div className="flex text-ui-fg-base justify-center items-center gap-3">
            <div className="mb-2">
              <Logo className="h-12" />
            </div>
            <Heading>Tavor chat</Heading>
          </div>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-md rounded-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Heading level="h1" className="text-2xl mb-2">
              Welcome back
            </Heading>
            <Text className="text-ui-fg-muted">
              Login using your Google account.
            </Text>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-4 mb-4">
            <Button
              // onClick={() => setIsLoading(true)}
              onClick={() => {
                setIsLoadingButton(true);
                void signIn("google");
              }}
              isLoading={isLoadingButton}
              size="large"
              className="w-full max-h-10"
            >
              <Google /> Continue with Google
            </Button>
          </div>

          <div className="text-center mt-6">
            <Text className="text-gray-500 text-xs">
              By continuing, you agree to our{" "}
              <a
                href="https://tavor.dev/terms"
                className="underline hover:no-underline"
              >
                Terms of service
              </a>{" "}
              and{" "}
              <a
                href="https://tavor.dev/privacy"
                className="underline hover:no-underline"
              >
                Privacy policy
              </a>
              .
            </Text>
          </div>
        </div>
      </div>
    </>
  );
}
