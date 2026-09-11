import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import CardItem from './CardItem';
import EditBar from './EditBar';
import DeleteConfirmModal from './DeleteConfirmModal';
import {
  RefreshCw,
  Trash2,
  CheckSquare,
  Square,
  AlertCircle,
  FolderOpen,
  Filter,
  Plus,
} from 'lucide-react';

export default function ContentGrid({
  routeId,
  routeName,
  endpointUrl,
  multiSelect,
  setMultiSelect,
  showToast,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [teamCategory, setTeamCategory] = useState('');

  // Fixed Side Edit/Add Card State:
  // - If editingItem is null: the side card is in "Add New Record" mode
  // - If editingItem is set: the side card is in "Edit Record" mode
  const [editingItem, setEditingItem] = useState(null);

  // Delete Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch data from Django API
  const fetchData = useCallback(async () => {
    if (!routeId || routeId === 'home') return;
    setLoading(true);
    setError(null);
    setSelectedIds(new Set());

    try {
      let data = [];
      if (routeId === 'gallery') {
        data = await api.endpoints.gallery.list();
      } else if (routeId === 'startups') {
        data = await api.endpoints.startups.list();
      } else if (routeId === 'news') {
        data = await api.endpoints.news.list();
      } else if (routeId === 'team') {
        data = await api.endpoints.team.list(teamCategory || undefined);
      }
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(`Error fetching ${routeId}:`, err);
      setError(err.message || `Failed to fetch data from ${endpointUrl}`);
    } finally {
      setLoading(false);
    }
  }, [routeId, endpointUrl, teamCategory]);

  useEffect(() => {
    fetchData();
    setEditingItem(null); // Reset side card to "Add New" mode on route change
  }, [fetchData, routeId]);

  // Request single item delete (opens modal)
  const handleRequestSingleDelete = (itemDetails) => {
    setPendingDelete({
      type: 'single',
      item: itemDetails,
    });
    setDeleteModalOpen(true);
  };

  // Request bulk delete (opens modal)
  const handleRequestBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setPendingDelete({
      type: 'bulk',
      count: selectedIds.size,
    });
    setDeleteModalOpen(true);
  };

  // Execute deletion upon modal confirmation
  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);

    try {
      if (pendingDelete.type === 'single') {
        const id = pendingDelete.item.id;
        if (routeId === 'gallery') await api.endpoints.gallery.delete(id);
        else if (routeId === 'startups') await api.endpoints.startups.delete(id);
        else if (routeId === 'news') await api.endpoints.news.delete(id);
        else if (routeId === 'team') await api.endpoints.team.delete(id);

        setItems((prev) => prev.filter((i) => i.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });

        // If the deleted item was currently being edited, reset side card to Add New
        if (editingItem?.id === id) {
          setEditingItem(null);
        }

        showToast?.(`Item "${pendingDelete.item.title || `#${id}`}" was deleted.`, 'success');
      } else if (pendingDelete.type === 'bulk') {
        const idsToDelete = Array.from(selectedIds);
        let successCount = 0;
        let failCount = 0;

        for (const id of idsToDelete) {
          try {
            if (routeId === 'gallery') await api.endpoints.gallery.delete(id);
            else if (routeId === 'startups') await api.endpoints.startups.delete(id);
            else if (routeId === 'news') await api.endpoints.news.delete(id);
            else if (routeId === 'team') await api.endpoints.team.delete(id);
            successCount++;
          } catch (e) {
            failCount++;
          }
        }

        if (editingItem && selectedIds.has(editingItem.id)) {
          setEditingItem(null);
        }

        setItems((prev) => prev.filter((item) => !selectedIds.has(item.id)));
        setSelectedIds(new Set());

        if (failCount === 0) {
          showToast?.(`Successfully deleted ${successCount} items.`, 'success');
        } else {
          showToast?.(`Deleted ${successCount} items (${failCount} failed).`, 'warning');
        }
      }

      setDeleteModalOpen(false);
      setPendingDelete(null);
    } catch (err) {
      console.error('Delete execution error:', err);
      showToast?.(err.message || 'Failed to delete items from server.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle selection for a single item (multi-select mode)
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all / Deselect all
  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row w-full gap-6 items-start">
      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA: List takes maximum available remaining space           */}
      {/* ========================================================================= */}
      <div className="flex-1 min-w-0 w-full space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {routeName}
              </h2>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground border border-border font-semibold">
                {items.length} {items.length === 1 ? 'record' : 'records'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              GET {endpointUrl}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Team Category Filter if on team route */}
            {routeId === 'team' && (
              <div className="flex items-center gap-1.5 bg-card border border-border px-3 py-1.5 rounded-xl text-xs shadow-2xs">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={teamCategory}
                  onChange={(e) => setTeamCategory(e.target.value)}
                  aria-label="Filter Team Members by Category"
                  className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer font-medium"
                >
                  <option value="" className="bg-card text-foreground">All Categories</option>
                  <option value="mentor" className="bg-card text-foreground">International Mentors</option>
                  <option value="team" className="bg-card text-foreground">AIC Team</option>
                  <option value="governor" className="bg-card text-foreground">Board of Governors</option>
                </select>
              </div>
            )}

            {/* Quick Add / Reset Button */}
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              title={`Switch side card to Add New ${routeName.replace(/s$/, '')}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                editingItem === null
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border border-border bg-card hover:bg-accent text-foreground'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New</span>
            </button>

            {/* Multi-Select Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setMultiSelect((prev) => !prev);
              }}
              title={multiSelect ? 'Disable Multi-Selection' : 'Enable Multi-Selection'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer shadow-2xs ${
                multiSelect
                  ? 'border-primary bg-primary/15 text-primary shadow-xs font-semibold'
                  : 'border-border bg-card hover:bg-accent text-foreground'
              }`}
            >
              {multiSelect ? (
                <CheckSquare className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Square className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span>Multi-Select</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              title="Refresh records from backend"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-accent text-foreground text-xs font-medium transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Multi-Select Floating Action Bar */}
        {multiSelect && items.length > 0 && (
          <div className="rounded-2xl border border-primary/40 bg-primary/10 p-3.5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
              >
                {selectedIds.size === items.length ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4 text-muted-foreground" />
                )}
                <span>
                  {selectedIds.size === items.length ? 'Deselect All' : 'Select All'}
                </span>
              </button>

              <span className="text-xs font-mono font-medium text-foreground bg-primary/20 px-2.5 py-0.5 rounded-full">
                {selectedIds.size} of {items.length} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRequestBulkDelete}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold transition-all shadow-md shadow-destructive/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedIds.size})</span>
              </button>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border bg-card/60 p-4 space-y-3 animate-pulse"
              >
                <div className="w-full aspect-16/10 bg-muted/50 rounded-xl" />
                <div className="space-y-2">
                  <div className="h-4 bg-muted/60 rounded w-3/4" />
                  <div className="h-3 bg-muted/40 rounded w-1/2" />
                </div>
                <div className="h-7 bg-muted/30 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Error View */}
        {!loading && error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center space-y-4 max-w-lg mx-auto my-8">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-destructive">
                Failed to load records
              </h3>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
            <button
              type="button"
              onClick={fetchData}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
            >
              Retry Fetching
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center space-y-4 max-w-md mx-auto my-8">
            <FolderOpen className="w-10 h-10 text-muted-foreground/60 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                No records in {routeName}
              </h3>
              <p className="text-xs text-muted-foreground">
                No items found for {endpointUrl}. Use the fixed form on the side to create the first record.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 mx-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Fill New Record Form</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. GALLERY ROUTE: Responsive Grid                                         */}
        {/* ========================================================================= */}
        {!loading && !error && items.length > 0 && routeId === 'gallery' && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4 animate-fade-content">
            {items.map((item) => (
              <CardItem
                key={item.id}
                item={item}
                routeId={routeId}
                multiSelect={multiSelect}
                isSelected={selectedIds.has(item.id)}
                isEditing={editingItem?.id === item.id}
                onToggleSelect={handleToggleSelect}
                onSelectForEdit={(selected) => setEditingItem(selected)}
                onRequestDelete={handleRequestSingleDelete}
              />
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. STARTUPS ROUTE: Responsive Grid                                        */}
        {/* ========================================================================= */}
        {!loading && !error && items.length > 0 && routeId === 'startups' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4 animate-fade-content">
            {items.map((item) => (
              <CardItem
                key={item.id}
                item={item}
                routeId={routeId}
                multiSelect={multiSelect}
                isSelected={selectedIds.has(item.id)}
                isEditing={editingItem?.id === item.id}
                onToggleSelect={handleToggleSelect}
                onSelectForEdit={(selected) => setEditingItem(selected)}
                onRequestDelete={handleRequestSingleDelete}
              />
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. NEWS ROUTE: Responsive List / Grid                                     */}
        {/* ========================================================================= */}
        {!loading && !error && items.length > 0 && routeId === 'news' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-fade-content">
            {items.map((item) => (
              <CardItem
                key={item.id}
                item={item}
                routeId={routeId}
                multiSelect={multiSelect}
                isSelected={selectedIds.has(item.id)}
                isEditing={editingItem?.id === item.id}
                onToggleSelect={handleToggleSelect}
                onSelectForEdit={(selected) => setEditingItem(selected)}
                onRequestDelete={handleRequestSingleDelete}
              />
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. TEAM ROUTE: Responsive Grid                                            */}
        {/* ========================================================================= */}
        {!loading && !error && items.length > 0 && routeId === 'team' && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4 animate-fade-content">
            {items.map((item) => (
              <CardItem
                key={item.id}
                item={item}
                routeId={routeId}
                multiSelect={multiSelect}
                isSelected={selectedIds.has(item.id)}
                isEditing={editingItem?.id === item.id}
                onToggleSelect={handleToggleSelect}
                onSelectForEdit={(selected) => setEditingItem(selected)}
                onRequestDelete={handleRequestSingleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* FIXED SIDE EDIT/ADD CARD: ALWAYS visible on all routes                    */}
      {/* ========================================================================= */}
      <aside className="w-full lg:w-[350px] xl:w-[390px] shrink-0 lg:sticky lg:top-20 z-20">
        <div className="h-[calc(100vh-6.5rem)] min-h-[560px] max-h-[860px] rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
          <EditBar
            routeId={routeId}
            routeName={routeName}
            initialData={editingItem}
            onSuccess={() => {
              fetchData();
              setEditingItem(null);
            }}
            onReset={() => setEditingItem(null)}
            showToast={showToast}
          />
        </div>
      </aside>

      {/* Custom Confirmation Popup Modal for Deletes */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteModalOpen(false);
            setPendingDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        title={pendingDelete?.type === 'bulk' ? 'Delete Selected Records' : 'Delete Record'}
        message={
          pendingDelete?.type === 'bulk'
            ? `Are you sure you want to permanently delete these ${pendingDelete.count} selected items from ${routeName}?`
            : `Are you sure you want to permanently delete "${pendingDelete?.item?.title || `Item #${pendingDelete?.item?.id}`}" from ${routeName}?`
        }
        itemCount={pendingDelete?.type === 'bulk' ? pendingDelete.count : 1}
        itemDetails={pendingDelete?.type === 'single' ? pendingDelete.item : null}
        isDeleting={isDeleting}
      />
    </div>
  );
}
