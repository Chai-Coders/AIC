import { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { resolveImageUrl } from '../lib/media';
import { AlertCircle, ImagePlus, Loader2, Trash2, Upload, X } from 'lucide-react';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function initialValues(section, item) {
  return Object.fromEntries(
    section.fields.map((f) => [f.name, item?.[f.name] ?? f.defaultValue ?? ''])
  );
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Slide-in panel for adding a new item or editing an existing one. The parent
// mounts it fresh (via `key`) for each item, so state is initialised from props.
export default function EditBar({ section, item, onClose, onSaved, onDelete, showToast }) {
  const isEditing = !!item;
  const existingImageUrl = resolveImageUrl(item, section.imageField);
  const [initial] = useState(() => initialValues(section, item));
  const [values, setValues] = useState(initial);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(existingImageUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const panelRef = useRef(null);

  const isDirty =
    !!selectedFile || section.fields.some((f) => String(values[f.name] ?? '') !== String(initial[f.name] ?? ''));

  const requestClose = () => {
    if (saving) return;
    if (isDirty && !window.confirm('You have unsaved changes. Close without saving?')) return;
    onClose();
  };

  // Escape closes the panel; focus moves into it when it opens.
  useEffect(() => {
    panelRef.current?.querySelector('input, textarea, select')?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Release the local preview when it is replaced or the panel closes.
  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const acceptFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('That file is not an image. Please choose a JPG, PNG or WEBP picture.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`That picture is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Please choose one under 10 MB.`);
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
  };

  const handleFileChange = (e) => {
    acceptFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const undoNewImage = () => {
    setSelectedFile(null);
    setPreviewUrl(existingImageUrl);
  };

  const setValue = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const missing = section.fields.find((f) => f.required && !String(values[f.name] ?? '').trim());
    if (missing) {
      setError(`Please fill in "${missing.label}".`);
      document.getElementById(`field-${missing.name}`)?.focus();
      return;
    }
    if (!isEditing && !selectedFile) {
      setError(`Please add a ${section.imageLabel.toLowerCase()}.`);
      return;
    }

    setSaving(true);
    try {
      const data = new FormData();
      section.fields.forEach((f) => data.append(f.name, String(values[f.name] ?? '').trim()));
      if (selectedFile) data.append(section.imageField, selectedFile);

      const resource = api.endpoints[section.id];
      if (isEditing) {
        await resource.update(item.id, data);
        showToast?.('Changes saved. They are now live on the website.', 'success');
      } else {
        await resource.create(data);
        showToast?.(`${capitalize(section.noun)} added to the website.`, 'success');
      }
      onSaved();
    } catch (err) {
      console.error('Save failed:', err);
      setError(err.message || 'Could not save. Please check the details and try again.');
    } finally {
      setSaving(false);
    }
  };

  const title = isEditing ? `Edit ${section.noun}` : `Add ${section.noun}`;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-150" onClick={requestClose} aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
        className="relative flex h-full w-full max-w-lg flex-col bg-card shadow-2xl animate-in slide-in-from-right duration-200"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <h2 id="editor-title" className="text-lg font-semibold text-foreground">
            {capitalize(title)}
          </h2>
          <button type="button" onClick={requestClose} aria-label="Close" className="icon-btn -mr-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form id="item-editor" onSubmit={handleSubmit} noValidate className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Image */}
          <div className="space-y-2">
            <span className="block text-sm font-medium text-foreground">
              {section.imageLabel}
              {!isEditing && <span className="text-destructive"> *</span>}
            </span>

            {previewUrl ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="flex h-56 items-center justify-center bg-muted">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className={`h-full w-full ${section.imageFit === 'contain' ? 'object-contain p-4' : 'object-cover'}`}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
                  <span className="min-w-0 truncate text-[13px] text-muted-foreground">
                    {selectedFile ? selectedFile.name : 'Current picture'}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    {selectedFile && (
                      <button type="button" onClick={undoNewImage} disabled={saving} className="btn-ghost px-2.5 py-1.5 text-[13px]">
                        {isEditing ? 'Keep old picture' : 'Remove'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={saving}
                      className="btn-secondary px-3 py-1.5 text-[13px]"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Change picture
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                disabled={saving}
                className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors ${
                  dragActive ? 'border-primary bg-accent' : 'border-input hover:border-primary/60 hover:bg-muted/60'
                }`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Upload className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium text-foreground">
                  {dragActive ? 'Drop the picture here' : 'Choose a picture'}
                </span>
                <span className="text-[13px] text-muted-foreground">or drag one here · JPG, PNG or WEBP, up to 10 MB</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {section.fields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <label htmlFor={`field-${f.name}`} className="block text-sm font-medium text-foreground">
                {f.label}
                {f.required && <span className="text-destructive"> *</span>}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  id={`field-${f.name}`}
                  rows={f.rows || 4}
                  value={values[f.name]}
                  onChange={(e) => setValue(f.name, e.target.value)}
                  placeholder={f.placeholder}
                  disabled={saving}
                  className="field resize-y leading-relaxed"
                />
              ) : f.type === 'select' ? (
                <select
                  id={`field-${f.name}`}
                  value={values[f.name]}
                  onChange={(e) => setValue(f.name, e.target.value)}
                  disabled={saving}
                  className="field"
                >
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`field-${f.name}`}
                  type={f.type}
                  value={values[f.name]}
                  onChange={(e) => setValue(f.name, e.target.value)}
                  placeholder={f.placeholder}
                  maxLength={f.maxLength}
                  disabled={saving}
                  className="field"
                />
              )}
              {f.help && <p className="text-[13px] text-muted-foreground">{f.help}</p>}
            </div>
          ))}
        </form>

        <div className="flex shrink-0 items-center gap-2 border-t border-border px-6 py-4">
          {isEditing && (
            <button
              type="button"
              onClick={() => onDelete({ id: item.id, title: section.summarize(item).title, image: existingImageUrl })}
              disabled={saving}
              className="btn-ghost px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={requestClose} disabled={saving} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" form="item-editor" disabled={saving} className="btn-primary">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{saving ? 'Saving…' : isEditing ? 'Save changes' : `Add ${section.noun}`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
