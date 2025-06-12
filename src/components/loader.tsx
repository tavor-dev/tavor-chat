import { Spinner } from "@medusajs/icons";

export function Loader() {
  return (
    <div className="flex h-full">
      <Spinner className="h-4 w-4 animate-spin" />
    </div>
  );
}
