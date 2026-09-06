import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import {
  X,
  Upload,
  Image as ImageIcon,
  Loader2,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Globe,
  Tag,
  User,
  Briefcase,
  FileText,
} from 'lucide-react';

export default function AddItemModal({
  isOpen,
  onClose,
  routeId,
  routeName,
  onSuccess,
  showToast,
}) {
  const [formData, setFormData] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Reset form whenever route changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(
        routeId === 'team'
          ? { category: 'team' }
          : {}
      );
      setSelectedFile(null);
      setPreviewUrl(null);
      setError(null);
    }
  }, [isOpen, routeId]);

  // Clean up object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (routeId === 'gallery' && !selectedFile) {
      setError('Please select an image file to upload.');
      return;
    }
    if (routeId === 'startups') {
      if (!formData.name?.trim()) return setError('Startup name is required.');
      if (!formData.description?.trim()) return setError('Description is required.');
      if (!selectedFile) return setError('Please upload a logo or image.');
    }
    if (routeId === 'news') {
      if (!formData.title?.trim()) return setError('Article title is required.');
      if (!formData.content?.trim()) return setError('Content is required.');
      if (!selectedFile) return setError('Please upload a thumbnail image.');
    }
    if (routeId === 'team') {
      if (!formData.name?.trim()) return setError('Member name is required.');
      if (!formData.role?.trim()) return setError('Role / Designation is required.');
      if (!formData.category) return setError('Category is required.');
      if (!selectedFile) return setError('Please upload a member photo.');
    }

    setLoading(true);

    try {
      const data = new FormData();

      // Append text fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          data.append(key, value);
        }
      });

      // Append file field with proper model key
      if (selectedFile) {
        if (routeId === 'gallery') data.append('image', selectedFile);
        else if (routeId === 'startups') data.append('logo_or_image', selectedFile);
        else if (routeId === 'news') data.append('thumbnail', selectedFile);
        else if (routeId === 'team') data.append('photo', selectedFile);
      }

      if (routeId === 'gallery') await api.endpoints.gallery.create(data);
      else if (routeId === 'startups') await api.endpoints.startups.create(data);
      else if (routeId === 'news') await api.endpoints.news.create(data);
      else if (routeId === 'team') await api.endpoints.team.create(data);

      showToast?.(`New ${routeName} item added successfully!`, 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Create error:', err);
      setError(err.message || 'Failed to create record. Please check the inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 my-8 text-card-foreground"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Add New {routeName.replace(/s$/, '')}
            </h3>
            <p className="text-xs text-muted-foreground font-mono">
              POST {api.endpoints[routeId]?.endpoint || '/api/'}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 flex items-start gap-2.5 text-destructive text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1 font-medium">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. GALLERY FIELDS */}
          {routeId === 'gallery' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Subtext / Caption (Optional)
                </label>
                <input
                  type="text"
                  value={formData.subtext || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, subtext: e.target.value }))
                  }
                  placeholder="e.g. Inauguration Ceremony 2026"
                  className="w-full px-3.5 py-2 rounded-xl border border-input bg-background/60 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
            </div>
          )}

          {/* 2. STARTUPS FIELDS */}
          {routeId === 'startups' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Startup Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Infusory Future Tech Labs"
                  className="w-full px-3.5 py-2 rounded-xl border border-input bg-background/60 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Website URL (Optional)
                </label>
                <div className="relative">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={formData.website_url || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, website_url: e.target.value }))
                    }
                    placeholder="https://example.com"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-input bg-background/60 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Brief summary of the venture, domain, and vision..."
                  className="w-full px-3.5 py-2 rounded-xl border border-input bg-background/60 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* 3. NEWS FIELDS */}
          {routeId === 'news' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g. AIC Launches National Innovation Cohort"
                  className="w-full px-3.5 py-2 rounded-xl border border-input bg-background/60 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Subtitle (Optional)
                </label>
                <input
                  type="text"
                  value={formData.subtitle || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, subtitle: e.target.value }))
                  }
                  placeholder="Short tagline or summary header"
                  className="w-full px-3.5 py-2 rounded-xl border border-input bg-background/60 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Content *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.content || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, content: e.target.value }))
                  }
                  placeholder="Detailed article body text..."
                  className="w-full px-3.5 py-2 rounded-xl border border-input bg-background/60 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* 4. TEAM FIELDS */}
          {routeId === 'team' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g. Dr. Jane Doe"
                    className="w-full px-3.5 py-2 rounded-xl border border-input bg-background/60 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Role / Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.role || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, role: e.target.value }))
                    }
                    placeholder="e.g. Chief Executive Officer"
                    className="w-full px-3.5 py-2 rounded-xl border border-input bg-background/60 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Category *
                </label>
                <select
                  value={formData.category || 'team'}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-input bg-background/60 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                >
                  <option value="team">AIC Team</option>
                  <option value="mentor">International Mentor</option>
                  <option value="governor">Board of Governors</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Bio (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.bio || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  placeholder="Short professional biography..."
                  className="w-full px-3.5 py-2 rounded-xl border border-input bg-background/60 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* COMMON IMAGE UPLOAD ZONE */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {routeId === 'gallery'
                ? 'Image Asset *'
                : routeId === 'startups'
                ? 'Logo or Showcase Image *'
                : routeId === 'news'
                ? 'Thumbnail Image *'
                : 'Profile Photo *'}
            </label>

            {previewUrl ? (
              <div className="relative rounded-xl border border-border bg-background/50 p-2 flex items-center gap-3">
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  className="w-16 h-16 rounded-lg object-cover border border-border shrink-0"
                />
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-semibold text-foreground truncate">
                    {selectedFile?.name}
                  </p>
                  <p className="text-muted-foreground text-[11px] font-mono">
                    {(selectedFile?.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-background/40 hover:bg-accent/40 p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 group"
              >
                <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="text-xs font-medium text-foreground">
                  Click or drag image to upload
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  PNG, JPG, JPEG, WEBP up to 10MB
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-border bg-background hover:bg-accent text-foreground text-xs font-medium transition-all disabled:opacity-40 cursor-pointer shadow-2xs"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-2 shadow-md shadow-primary/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting POST...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Create Item</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
