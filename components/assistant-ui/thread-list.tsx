"use client";

import type { FC } from "react";
import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useThreadListItem,
} from "@assistant-ui/react";
import { PlusIcon } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useInconvoState } from "@/app/InconvoRuntimeProvider";

export const ThreadList: FC = () => {
  return (
    <ThreadListPrimitive.Root className="flex flex-col items-stretch gap-1.5">
      <ThreadListNew />
      <ThreadListItems />
    </ThreadListPrimitive.Root>
  );
};

const ThreadListNew: FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { clearConversation } = useInconvoState();

  const handleNewThread = () => {
    if (pathname === "/") {
      // If already on homepage, just clear the conversation
      clearConversation?.();
    } else {
      // Navigate to homepage
      router.push("/");
    }
  };

  return (
    <Button
      onClick={handleNewThread}
      className="data-[active]:bg-muted hover:bg-muted flex items-center justify-start gap-1 rounded-lg px-2.5 py-2 text-start"
      variant="ghost"
    >
      <PlusIcon />
      New Thread
    </Button>
  );
};

const ThreadListItems: FC = () => {
  return <ThreadListPrimitive.Items components={{ ThreadListItem }} />;
};

const ThreadListItem: FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { threadId } = useThreadListItem();

  const isActive = pathname === `/c/${threadId}`;

  const handleThreadClick = () => {
    if (threadId) {
      router.push(`/c/${threadId}`);
    }
  };

  return (
    <ThreadListItemPrimitive.Root
      className={`${
        isActive ? "bg-muted" : ""
      } hover:bg-muted focus-visible:bg-muted focus-visible:ring-ring flex items-center gap-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 cursor-pointer`}
      onClick={handleThreadClick}
    >
      <div className="flex-grow px-3 py-2 text-start">
        <ThreadListItemTitle />
      </div>
    </ThreadListItemPrimitive.Root>
  );
};

const ThreadListItemTitle: FC = () => {
  return (
    <p className="text-sm">
      <ThreadListItemPrimitive.Title fallback="New Chat" />
    </p>
  );
};
