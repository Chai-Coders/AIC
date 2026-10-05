import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { TEAM_CATEGORIES } from '../routes';
import CardItem from './CardItem';
import EditBar from './EditBar';
import DeleteConfirmModal from './DeleteConfirmModal';
import { AlertCircle, CheckSquare, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';

const plural = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;

export default function ContentGrid({ section, showToast }) {
  const resource = api.endpoints[section.id];

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState('');
  const [teamCategory, setTeamCategory] = useState('');

  // Editor: undefined = closed, null = adding a new item, object = editing that item.
  // The overview page's "Add" shortcut arrives with { addNew: true } in the route state.
  const location = useLocation();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(() => (location.state?.addNew ? null : undefined));

  // Consume the shortcut so going back to this page doesn't reopen the form.
  useEffect(() => {
    if (location.state?.addNew) navigate('.', { replace: true, state: null });
  }, [location.state, navigate]);

  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const reload = () => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  };

  // Responses from superseded requests (e.g. a quick category switch) are ignored.
  useEffect(() => {
    let cancelled = false;
    const request = section.id === 'team' ? resource.list(teamCategory || undefined) : resource.list();
    request
      .then((data) => {
        if (cancelled) return;
        setItems(Array.isArray(data) ? data : []);
        setSelectedIds(new Set());
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(`Error fetching ${section.id}:`, err);
        setError(err.message || 'Could not load this section.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resource, section.id, teamCategory, reloadKey]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const { title, subtitle, tag } = section.summarize(item);
      return [title, subtitle, tag].some((v) => v && String(v).toLowerCase().includes(q));
    });
  }, [items, query, section]);

  const handleCategoryChange = (category) => {
    if (category === teamCategory) return;
    setTeamCategory(category);
    setLoading(true);
    setError(null);
  };

  const toggleSelecting = () => {
    setSelecting((prev) => !prev);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = visibleItems.length > 0 && visibleItems.every((i) => selectedIds.has(i.id));
  const toggleSelectAll = () => {
    setSelectedIds(allVisibleSelected ? new Set() : new Set(visibleItems.map((i) => i.id)));
  };

  const requestDelete = (details) => {
    setEditing(undefined);
    setPendingDelete({ type: 'single', item: details });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      if (pendingDelete.type === 'single') {
        const { id, title } = pendingDelete.item;
        await resource.delete(id);
        setItems((prev) => prev.filter((i) => i.id !== id));
        showToast?.(`"${title}" was deleted from the website.`, 'success');
      } else {
        const ids = Array.from(selectedIds);
        const results = await Promise.allSettled(ids.map((id) => resource.delete(id)));
        const deleted = new Set(ids.filter((_, idx) => results[idx].status === 'fulfilled'));
        const failed = ids.length - deleted.size;

        // Only drop what the server actually deleted; failures stay selected for a retry.
        setItems((prev) => prev.filter((item) => !deleted.has(item.id)));
        setSelectedIds(new Set(ids.filter((id) => !deleted.has(id))));
        if (failed === 0) {
          setSelecting(false);
          showToast?.(`Deleted ${plural(deleted.size, section.noun)}.`, 'success');
        } else {
          showToast?.(`Deleted ${deleted.size}, but ${failed} could not be deleted. Please try again.`, 'warning');
        }
      }
      setPendingDelete(null);
    } catch (err) {
      console.error('Delete failed:', err);
      showToast?.(err.message || 'Could not delete. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const showList = !loading && !error && visibleItems.length > 0;

  return (
    <div className="space-y-6 pb-24">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{section.name}</h1>
          <p className="text-sm text-muted-foreground">{section.description}</p>
        </div>
        <button type="button" onClick={() => setEditing(null)} className="btn-primary self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          <span>Add {section.noun}</span>
        </button>
      </div>

      {/* Team groups */}
      {section.id === 'team' && (
        <div role="tablist" aria-label="Team groups" className="flex gap-1 overflow-x-auto border-b border-border">
          {[{ value: '', label: 'Everyone' }, ...TEAM_CATEGORIES].map((c) => (
            <button
              key={c.value}
              type="button"
              role="tab"
              aria-selected={teamCategory === c.value}
              onClick={() => handleCategoryChange(c.value)}
              className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                teamCategory === c.value
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${section.name.toLowerCase()}…`}
            aria-label={`Search ${section.name}`}
            className="field pl-9"
          />
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          {!loading && !error && (
            <span className="mr-1 text-sm text-muted-foreground">
              {query ? `${visibleItems.length} of ${items.length}` : plural(items.length, 'item')}
            </span>
          )}
          {items.length > 0 && (
            <button type="button" onClick={toggleSelecting} className={selecting ? 'btn-secondary border-primary text-primary' : 'btn-secondary'}>
              {selecting ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
              <span>{selecting ? 'Done' : 'Select'}</span>
            </button>
          )}
          <button type="button" onClick={reload} disabled={loading} title="Reload" aria-label="Reload" className="btn-secondary px-3">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {selecting && (
        <p className="text-sm text-muted-foreground">Tap items to select them, then delete them all at once.</p>
      )}

      {/* Loading */}
      {loading && (
        <div className={section.layout === 'tiles' ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4' : 'space-y-3'}>
          {Array.from({ length: section.layout === 'tiles' ? 8 : 5 }).map((_, idx) => (
            <div
              key={idx}
              className={`animate-pulse rounded-xl border border-border bg-card ${section.layout === 'tiles' ? 'aspect-[4/5]' : 'h-24'}`}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="mx-auto max-w-md space-y-4 rounded-xl border border-border bg-card p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
          <div className="space-y-1">
            <h2 className="font-semibold text-foreground">This section couldn’t be loaded</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <button type="button" onClick={reload} className="btn-primary">
            Try again
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && visibleItems.length === 0 && (
        <div className="mx-auto max-w-md space-y-4 rounded-xl border border-dashed border-input p-10 text-center">
          <section.icon className="mx-auto h-10 w-10 text-muted-foreground/60" />
          {query ? (
            <>
              <p className="text-sm text-muted-foreground">Nothing matches “{query}”.</p>
              <button type="button" onClick={() => setQuery('')} className="btn-secondary">
                Clear search
              </button>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="font-semibold text-foreground">No {section.noun}s yet</h2>
                <p className="text-sm text-muted-foreground">Add the first one and it will appear on the website.</p>
              </div>
              <button type="button" onClick={() => setEditing(null)} className="btn-primary">
                <Plus className="h-4 w-4" />
                <span>Add {section.noun}</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Items */}
      {showList && (
        <div
          className={
            section.layout === 'tiles'
              ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'
              : 'grid grid-cols-1 gap-3'
          }
        >
          {visibleItems.map((item) => (
            <CardItem
              key={item.id}
              item={item}
              section={section}
              selecting={selecting}
              selected={selectedIds.has(item.id)}
              onToggleSelect={toggleSelect}
              onEdit={setEditing}
              onDelete={requestDelete}
            />
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      {selecting && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur md:left-64">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-10">
            <button type="button" onClick={toggleSelectAll} className="btn-ghost px-3">
              {allVisibleSelected ? 'Unselect all' : 'Select all'}
            </button>
            <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
            <button
              type="button"
              onClick={() => setPendingDelete({ type: 'bulk', count: selectedIds.size })}
              disabled={selectedIds.size === 0}
              className="btn-danger ml-auto"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {editing !== undefined && (
        <EditBar
          key={editing?.id ?? 'new'}
          section={section}
          item={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
          }}
          onDelete={requestDelete}
          showToast={showToast}
        />
      )}

      <DeleteConfirmModal
        isOpen={!!pendingDelete}
        onClose={() => {
          if (!isDeleting) setPendingDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title={pendingDelete?.type === 'bulk' ? `Delete ${plural(pendingDelete.count, section.noun)}?` : `Delete this ${section.noun}?`}
        message={
          pendingDelete?.type === 'bulk'
            ? 'They will be removed from the website. This can’t be undone.'
            : 'It will be removed from the website. This can’t be undone.'
        }
        confirmLabel={pendingDelete?.type === 'bulk' ? `Delete ${pendingDelete.count}` : 'Delete'}
        itemDetails={pendingDelete?.type === 'single' ? pendingDelete.item : null}
        isDeleting={isDeleting}
      />
    </div>
  );
}
