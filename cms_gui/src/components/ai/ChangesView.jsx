import { useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { FileCode2, Loader2 } from 'lucide-react';

const lineClass = (line) => {
  if (line.startsWith('@@')) return 'bg-muted text-muted-foreground';
  if (line.startsWith('+')) return 'bg-emerald-500/15 text-foreground';
  if (line.startsWith('-')) return 'bg-red-500/15 text-foreground';
  return 'text-muted-foreground';
};

const CHANGE_LABEL = { edited: 'Edited', new: 'New file', deleted: 'Deleted' };

// Everything in the draft as text. Backend and CMS code can't be rendered in the
// preview, so this is how those changes are shown.
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
  const noPreview = changes?.code.filter((f) => !f.previewable) ?? [];

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

      {noPreview.length > 0 && (
        <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          {noPreview.length === 1 ? 'One change is' : `${noPreview.length} changes are`} to the backend or the CMS, which can't be shown in the
          preview. The review agent checks these more strictly, and a developer has to deploy them after you publish.
        </p>
      )}

      {changes?.content.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Content records</h3>
          <ul className="space-y-1.5">
            {changes.content.map((line, i) => (
              <li key={i} className="rounded-lg bg-muted px-3 py-2 font-mono text-xs break-words text-foreground">
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}

      {changes?.code.map((file) => (
        <section key={file.path} className="overflow-hidden rounded-lg border border-border">
          <header className="flex flex-wrap items-center gap-2 border-b border-border bg-muted px-3 py-2 text-xs">
            <FileCode2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="font-mono break-all text-foreground">{file.path}</span>
            <span className="text-muted-foreground">{CHANGE_LABEL[file.change]}</span>
          </header>
          <pre className="overflow-x-auto py-1 font-mono text-xs leading-5">
            {file.diff.split('\n').map((line, i) => (
              <div key={i} className={`px-3 whitespace-pre ${lineClass(line)}`}>
                {line || ' '}
              </div>
            ))}
          </pre>
        </section>
      ))}
    </div>
  );
}
