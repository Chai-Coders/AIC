import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../services/api';
import { AlertCircle, Check, ChevronRight, Copy, Film, Loader2, RefreshCw, Upload, Video } from 'lucide-react';

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|mkv|m4v|avi)$/i;

const formatDate = (value) =>
  new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

export default function BackgroundVideoPage() {
  const { showToast } = useOutletContext();
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [videoName, setVideoName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const hasActiveVideo = Boolean(videoData?.id && videoData?.video_url);

  useEffect(() => {
    let cancelled = false;
    api.endpoints.backgroundVideo
      .get()
      .then((data) => {
        if (!cancelled) setVideoData(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to fetch background video:', err);
        setError(err.message || 'Could not load the current video.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Release the local preview when it is replaced or the page unmounts.
  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  // Warn before leaving the page in the middle of an upload.
  useEffect(() => {
    if (!uploading) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [uploading]);

  const refresh = () => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setVideoName('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('video/') && !VIDEO_EXTENSIONS.test(file.name)) {
      showToast?.('That file is not a video. Please choose an MP4, MOV or WEBM file.', 'error');
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      showToast?.(`That video is ${(file.size / (1024 * 1024)).toFixed(0)} MB. Please choose one under 500 MB.`, 'error');
      return;
    }
    setSelectedFile(file);
    setFilePreviewUrl(URL.createObjectURL(file));
    setError(null);
    if (!videoName.trim()) setVideoName(file.name.replace(/\.[^/.]+$/, ''));
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(videoData.video_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast?.('Could not copy. Select the link and copy it manually.', 'error');
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('videofile', selectedFile);
      formData.append('videoname', videoName.trim() || selectedFile.name);

      const updated = await api.endpoints.backgroundVideo.upload(formData);
      setVideoData(updated);
      clearSelectedFile();
      showToast?.('New homepage video uploaded. It may take a few minutes to appear on the website.', 'success');
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.message || 'The upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Homepage video</h1>
          <p className="text-sm text-muted-foreground">The video that plays in the background at the top of the website’s homepage.</p>
        </div>
        <button type="button" onClick={refresh} disabled={loading || uploading} title="Reload" aria-label="Reload" className="btn-secondary self-start px-3 sm:self-auto">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {/* Current video */}
        <section className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-foreground">Current video</h2>

          <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-muted">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : hasActiveVideo && videoData.thumbnail_url ? (
              <img src={videoData.thumbnail_url} alt={videoData.video_name} className="h-full w-full object-cover" />
            ) : hasActiveVideo ? (
              <Film className="h-10 w-10 text-muted-foreground/60" />
            ) : (
              <div className="space-y-2 p-6 text-center text-muted-foreground">
                <Video className="mx-auto h-10 w-10 opacity-50" />
                <p className="text-sm">No video has been set yet.</p>
              </div>
            )}
          </div>

          {hasActiveVideo && (
            <>
              <div className="space-y-0.5">
                <p className="font-medium text-foreground">{videoData.video_name}</p>
                {videoData.updated_at && (
                  <p className="text-sm text-muted-foreground">Last changed on {formatDate(videoData.updated_at)}</p>
                )}
              </div>

              <details className="group rounded-lg border border-border">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground">
                  <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                  Technical details (for developers)
                </summary>
                <div className="space-y-3 border-t border-border p-3 text-[13px]">
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Streaming link</span>
                    <div className="flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 font-mono text-xs text-foreground">
                        {videoData.video_url}
                      </code>
                      <button type="button" onClick={handleCopyUrl} title="Copy" aria-label="Copy streaming link" className="icon-btn">
                        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {videoData.mux_playback_id && (
                    <p className="text-muted-foreground">
                      Playback ID: <span className="font-mono text-foreground">{videoData.mux_playback_id}</span>
                    </p>
                  )}
                  {videoData.mux_asset_id && (
                    <p className="text-muted-foreground">
                      Asset ID: <span className="font-mono text-foreground">{videoData.mux_asset_id}</span>
                    </p>
                  )}
                </div>
              </details>
            </>
          )}
        </section>

        {/* Replace video */}
        <section className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">{hasActiveVideo ? 'Replace the video' : 'Upload a video'}</h2>
            <p className="text-sm text-muted-foreground">
              {hasActiveVideo ? 'The new video will take the place of the current one.' : 'It will start playing on the homepage once processed.'}
            </p>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {selectedFile ? (
              <div className="overflow-hidden rounded-lg border border-border">
                {filePreviewUrl && (
                  <video src={filePreviewUrl} className="aspect-video w-full bg-black object-contain" muted controls playsInline preload="metadata" />
                )}
                <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
                  <span className="min-w-0 truncate text-[13px] text-muted-foreground">
                    {selectedFile.name} · {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={clearSelectedFile} disabled={uploading} className="btn-ghost px-2.5 py-1.5 text-[13px]">
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="btn-secondary px-3 py-1.5 text-[13px]"
                    >
                      Choose another
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input px-4 py-12 text-center transition-colors hover:border-primary/60 hover:bg-muted/60"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Upload className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium text-foreground">Choose a video</span>
                <span className="text-[13px] text-muted-foreground">MP4, MOV or WEBM, up to 500 MB</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="video/*,.mp4,.mov,.webm,.mkv" className="hidden" onChange={handleFileChange} />

            {selectedFile && (
              <div className="space-y-1.5">
                <label htmlFor="video-name" className="block text-sm font-medium text-foreground">
                  Video name
                </label>
                <input
                  id="video-name"
                  type="text"
                  disabled={uploading}
                  value={videoName}
                  onChange={(e) => setVideoName(e.target.value)}
                  placeholder="e.g. Campus tour 2026"
                  className="field"
                />
                <p className="text-[13px] text-muted-foreground">Only used to help you recognise the video here.</p>
              </div>
            )}

            <button type="submit" disabled={uploading || !selectedFile} className="btn-primary w-full">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span>{uploading ? 'Uploading…' : hasActiveVideo ? 'Upload and replace' : 'Upload video'}</span>
            </button>
            {uploading && (
              <p className="text-center text-[13px] text-muted-foreground">
                Large videos can take a few minutes. Please keep this page open.
              </p>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}
