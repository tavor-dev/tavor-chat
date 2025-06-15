import { Button, Container, Heading, Text, Badge } from "@medusajs/ui";
import { Check } from "lucide-react";

export function Billing() {
  const handleUpgrade = () => {
    // In a real application, this would redirect to a checkout page.
    console.log("Upgrade to Pro clicked");
  };

  return (
    <div>
      <Heading level="h3" className="mb-4">
        Billing & Plan
      </Heading>
      <Container className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <Heading level="h3">Your plan</Heading>
              <Badge color="blue">Free</Badge>
            </div>
            <Text size="small" className="text-ui-fg-muted">
              You are currently on the Free plan. Upgrade for higher limits and
              access to premium models.
            </Text>
            <ul className="space-y-2 text-sm text-ui-fg-subtle">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-ui-fg-interactive" />
                <span>Access to standard models (GPT-4o Mini, Sonnet 3.5)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-ui-fg-interactive" />
                <span>Generous message limits</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-ui-fg-interactive" />
                <span>Community support</span>
              </li>
            </ul>
          </div>
          <div className="md:w-auto">
            <Button onClick={handleUpgrade} variant="primary">
              Upgrade to Pro
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
