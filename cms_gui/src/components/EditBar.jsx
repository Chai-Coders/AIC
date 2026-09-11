import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import {
  X,
  Upload,
  Image as ImageIcon,
  Loader2,
  PlusCircle,
  AlertCircle,
  Globe,
  Save,
  RotateCcw,
  Sparkles,
  Edit3,
} from 'lucide-react';

export default function EditBar({
  routeId,
  routeName,
  initialData, // If null or undefined, we are in "Add New" mode
  onSuccess,
  onReset,
  showToast,
}) {
  const [formData, setFormData] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const isEditing = !!initialData;
  const singularName = routeName ? routeName.replace(/s$/, '') : 'Item';

  // Initialize or reset form state whenever initialData or routeId changes
  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
      // Extract existing image URL safely
      const imgPath =
        initialData.image ||
        initialData.logo_or_image ||
        initialData.thumbnail ||
        initialData.photo;

      if (imgPath) {
        if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
          setPreviewUrl(imgPath);
        } else if (imgPath.startsWith('/')) {
          setPreviewUrl(imgPath);
        } else {
          setPreviewUrl(`/${imgPath}`);
        }
      } else {
        setPreviewUrl(null);
      }
    } else {
      setFormData(
        routeId === 'team'
          ? { category: 'team' }
          : {}
      );
      setPreviewUrl(null);
    }
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [initialData, routeId]);

  // Clean up blob URL
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

  const handleResetForm = () => {
    if (isEditing) {
      onReset?.();
    } else {
      setFormData(routeId === 'team' ? { category: 'team' } : {});
      setSelectedFile(null);
      setPreviewUrl(null);
      setError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!isEditing) {
      if (routeId === 'gallery' && !selectedFile) {
        setError('Please upload an image for this gallery item.');
        return;
      }
      if (routeId === 'startups') {
        if (!formData.name?.trim()) return setError('Startup name is required.');
        if (!formData.description?.trim()) return setError('Description is required.');
        if (!selectedFile) return setError('Please upload a logo or banner image.');
      }
      if (routeId === 'news') {
        if (!formData.title?.trim()) return setError('Article title is required.');
        if (!formData.content?.trim()) return setError('Article content is required.');
        if (!selectedFile) return setError('Please upload a thumbnail image.');
      }
      if (routeId === 'team') {
        if (!formData.name?.trim()) return setError('Member full name is required.');
        if (!formData.role?.trim()) return setError('Role / Designation is required.');
        if (!formData.category) return setError('Category is required.');
        if (!selectedFile) return setError('Please upload a member photo.');
      }
    } else {
      if (routeId === 'startups' && !formData.name?.trim()) return setError('Startup name is required.');
      if (routeId === 'startups' && !formData.description?.trim()) return setError('Description is required.');
      if (routeId === 'news' && !formData.title?.trim()) return setError('Article title is required.');
      if (routeId === 'news' && !formData.content?.trim()) return setError('Article content is required.');
      if (routeId === 'team' && !formData.name?.trim()) return setError('Member name is required.');
      if (routeId === 'team' && !formData.role?.trim()) return setError('Role / Designation is required.');
    }

    setLoading(true);

    try {
      const data = new FormData();

      // Append text fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'id' || key === 'created_at' || key === 'published_date' || key === 'category_display') return;
        if (key === 'image' || key === 'logo_or_image' || key === 'thumbnail' || key === 'photo') return;

        if (value !== undefined && value !== null) {
          data.append(key, value);
        }
      });

      // Append file if newly selected
      if (selectedFile) {
        if (routeId === 'gallery') data.append('image', selectedFile);
        else if (routeId === 'startups') data.append('logo_or_image', selectedFile);
        else if (routeId === 'news') data.append('thumbnail', selectedFile);
        else if (routeId === 'team') data.append('photo', selectedFile);
      }

      if (isEditing) {
        if (routeId === 'gallery') await api.endpoints.gallery.update(initialData.id, data);
        else if (routeId === 'startups') await api.endpoints.startups.update(initialData.id, data);
        else if (routeId === 'news') await api.endpoints.news.update(initialData.id, data);
        else if (routeId === 'team') await api.endpoints.team.update(initialData.id, data);
        showToast?.(`${singularName} #${initialData.id} updated successfully!`, 'success');
      } else {
        if (routeId === 'gallery') await api.endpoints.gallery.create(data);
        else if (routeId === 'startups') await api.endpoints.startups.create(data);
        else if (routeId === 'news') await api.endpoints.news.create(data);
        else if (routeId === 'team') await api.endpoints.team.create(data);
        showToast?.(`New ${singularName} item created successfully!`, 'success');
      }

      onSuccess?.();
      handleResetForm();
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to save record. Please check the inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0 bg-card/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              isEditing
                ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                : 'bg-primary/15 text-primary border border-primary/30'
            }`}
          >
            {isEditing ? <Edit3 className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-foreground">
                {isEditing ? `Edit ${singularName}` : `Add New ${singularName}`}
              </h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                  isEditing
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : 'bg-primary/15 text-primary border border-primary/30'
                }`}
              >
                {isEditing ? `#${initialData.id}` : 'Create'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isEditing
                ? 'Modify fields below and save changes'
                : `Enter details to add to ${routeName}`}
            </p>
          </div>
        </div>

        {isEditing && (
          <button
            type="button"
            onClick={handleResetForm}
            title="Switch to Add New mode"
            className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs"
          >
            <PlusCircle className="w-3 h-3 text-primary" />
            <span>New</span>
          </button>
        )}
      </div>

      {/* Form Content (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
        {/* Error Alert */}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-2.5 text-destructive text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1 font-medium leading-relaxed">{error}</span>
          </div>
        )}

        <form id="side-edit-form" onSubmit={handleSubmit} className="space-y-4">
          {/* 1. GALLERY FIELDS */}
          {routeId === 'gallery' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Caption / Subtext
              </label>
              <input
                type="text"
                value={formData.subtext || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, subtext: e.target.value }))
                }
                placeholder="e.g. Incubation Center Grand Hall"
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-2xs"
              />
            </div>
          )}

          {/* 2. STARTUPS FIELDS */}
          {routeId === 'startups' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
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
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Website URL
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
                    className="w-full pl-8.5 pr-3 py-2 rounded-xl border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Brief summary of venture, domain, and vision..."
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none shadow-2xs leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* 3. NEWS FIELDS */}
          {routeId === 'news' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Article Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g. National Hackathon 2026 Announced"
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Subtitle / Tagline
                </label>
                <input
                  type="text"
                  value={formData.subtitle || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, subtitle: e.target.value }))
                  }
                  placeholder="Short summary tagline"
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Article Content *
                </label>
                <textarea
                  required
                  rows={5}
                  value={formData.content || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, content: e.target.value }))
                  }
                  placeholder="Complete article body and details..."
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none shadow-2xs leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* 4. TEAM FIELDS */}
          {routeId === 'team' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
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
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
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
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Category *
                </label>
                <select
                  value={formData.category || 'team'}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-2xs cursor-pointer"
                >
                  <option value="team">AIC Team</option>
                  <option value="mentor">International Mentor</option>
                  <option value="governor">Board of Governors</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Short Bio
                </label>
                <textarea
                  rows={3}
                  value={formData.bio || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  placeholder="Professional background and domain..."
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none shadow-2xs leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* COMMON IMAGE UPLOAD ZONE */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {routeId === 'gallery'
                  ? 'Image Asset'
                  : routeId === 'startups'
                  ? 'Logo / Banner'
                  : routeId === 'news'
                  ? 'Thumbnail Image'
                  : 'Profile Photo'} {!isEditing && <span className="text-destructive">*</span>}
              </label>
              {isEditing && !selectedFile && previewUrl && (
                <span className="text-[10px] text-muted-foreground font-mono">Current image kept</span>
              )}
            </div>

            {previewUrl ? (
              <div className="relative rounded-xl border border-border bg-background/60 p-2.5 flex items-center gap-3 shadow-2xs">
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  className="w-14 h-14 rounded-lg object-cover border border-border shrink-0"
                />
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-semibold text-foreground truncate">
                    {selectedFile ? selectedFile.name : 'Existing Media'}
                  </p>
                  <p className="text-muted-foreground text-[10px] font-mono">
                    {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Attached to record'}
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
                  PNG, JPG, WEBP up to 10MB
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
        </form>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="p-3.5 border-t border-border bg-card shrink-0 flex items-center gap-2">
        <button
          type="button"
          onClick={handleResetForm}
          disabled={loading}
          className="px-3 py-2 rounded-xl border border-border bg-background hover:bg-accent text-foreground text-xs font-medium transition-all disabled:opacity-40 cursor-pointer shadow-2xs flex items-center gap-1.5"
        >
          <RotateCcw className="w-3 h-3 text-muted-foreground" />
          <span>{isEditing ? 'Cancel' : 'Clear'}</span>
        </button>

        <button
          type="submit"
          form="side-edit-form"
          disabled={loading}
          className={`flex-1 px-4 py-2 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer ${
            isEditing
              ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
              : 'bg-primary hover:bg-primary/90 shadow-primary/20 text-primary-foreground'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              {isEditing ? <Save className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
              <span>{isEditing ? 'Update Record' : 'Create Record'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
