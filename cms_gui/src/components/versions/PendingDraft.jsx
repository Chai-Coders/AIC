import { Inbox } from 'lucide-react';

export default function PendingDraft() {
  return (
    <div className="mx-auto max-w-md space-y-3 rounded-xl border border-dashed border-input p-10 text-center">
      <Inbox className="mx-auto h-10 w-10 text-muted-foreground/60" />
      <h2 className="font-semibold text-foreground">Nothing waiting for approval</h2>
    </div>
  );
}
