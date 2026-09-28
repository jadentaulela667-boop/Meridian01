import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/70" />
        <Dialog.Content
          className={cn(
            "fixed z-50 flex flex-col border border-border bg-card text-card-foreground shadow-none",
            "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-xl p-5",
            "landscape:inset-y-0 landscape:right-0 landscape:left-auto landscape:h-full landscape:max-h-none landscape:w-[min(380px,86vw)] landscape:rounded-none landscape:rounded-l-xl",
            "md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:w-[380px] md:rounded-none md:rounded-l-xl md:p-6",
          )}
        >
          <Dialog.Description className="sr-only">
            Alert preferences, strategy filters, and market selection.
          </Dialog.Description>
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-base font-medium tracking-tight">
              {title}
            </Dialog.Title>
            <Dialog.Close className="inline-flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
