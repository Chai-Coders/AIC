import { useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { Loader2 } from 'lucide-react';

// Everything in the draft, as text.
export default function ChangesView({ changeSetId, changeList }) {
  const changes = useQuery(anyApi.ai.preview.changes, changeSetId ? { changeSetId } : 'skip');

  if (!changeSetId) {
    return <p className="p-6 text-sm text-muted-foreground">Nothing has been changed yet.</p>;
  }
  if (changes === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="h-full space-y-5 overflow-y-auto p-4 sm:p-6">
      {changeList.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">What changed</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
            {changeList.map((item, i) => (
              <li key={i}>
                {item.summary}
                {item.page && <span className="text-muted-foreground"> · {item.page}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {changes?.content.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Saved data</h3>
          <ul className="space-y-1.5">
            {changes.content.map((line, i) => (
              <li key={i} className="rounded-lg bg-muted px-3 py-2 font-mono text-xs break-words text-foreground">
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
