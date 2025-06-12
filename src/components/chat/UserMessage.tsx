import { cn } from "@/lib/utils";

type UserMessageProps = {
  message: string;
};

export const UserMessage: React.FC<UserMessageProps> = ({ message }) => {
  return (
    <div className="flex justify-end">
      <div className="bg-blue-100 text-blue-900 rounded-lg px-4 py-2 max-w-lg">
        {message}
      </div>
    </div>
  );
};