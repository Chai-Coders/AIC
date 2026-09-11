import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../services/api';
import {
  Video,
  Upload,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  Sparkles,
  AlertCircle,
  Loader2,
  FileVideo,
  ExternalLink,
  Layers,
  Radio,
} from 'lucide-react';

export default function BackgroundVideoPage() {
  const { showToast } = useOutletContext();
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Upload Form State
  const [videoName, setVideoName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const fetchBackgroundVideo = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.endpoints.backgroundVideo.get();
      setVideoData(data);
      if (data?.video_name) {
        setVideoName(data.video_name);
      }
    } catch (err) {
      console.error('Failed to fetch background video:', err);
      setError(err.message || 'Failed to load background video');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackgroundVideo();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      setSelectedFile(file);
      setFilePreviewUrl(URL.createObjectURL(file));
      if (!videoName.trim()) {
        setVideoName(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleCopyUrl = () => {
    if (!videoData?.video_url) return;
    navigator.clipboard.writeText(videoData.video_url);
    setCopied(true);
    showToast?.('Streaming URL copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast?.('Please select a video file to upload.', 'error');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('videofile', selectedFile);
      formData.append('videoname', videoName || selectedFile.name);

      const updated = await api.endpoints.backgroundVideo.upload(formData);
      setVideoData(updated);
      setSelectedFile(null);
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      showToast?.('Background video uploaded to Mux and updated successfully!', 'success');
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.message || 'Failed to upload video to Mux.');
      showToast?.(err.message || 'Video upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-fade-content">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              <span>Background Video</span>
            </h2>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse text-emerald-500" />
              <span>Mux Streaming</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            GET /api/backgroundvideo/ &bull; POST /api/backgroundvideo/
          </p>
        </div>

        <button
          type="button"
          onClick={fetchBackgroundVideo}
          disabled={loading || uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-accent text-foreground text-xs font-medium transition-all cursor-pointer shadow-2xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-3 text-destructive text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5 flex-1">
            <p className="font-semibold">Operation Error</p>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Left is Current Video Preview, Right is Upload & Replace Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Current Active Video Details & Player Preview */}
        <div className="lg:col-span-7 space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-sm font-bold text-foreground">Current Active Video</h3>
              </div>
              {videoData?.updated_at && (
                <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Updated: {new Date(videoData.updated_at).toLocaleDateString()}</span>
                </span>
              )}
            </div>

            {/* Video Player / Poster Thumbnail */}
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/80 border border-border flex items-center justify-center group shadow-md">
              {videoData?.video_url ? (
                videoData.thumbnail_url ? (
                  <div className="relative w-full h-full">
                    <img
                      src={videoData.thumbnail_url}
                      alt={videoData.video_name || 'Background Video'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-4">
                      <p className="text-sm font-bold text-white tracking-wide">
                        {videoData.video_name}
                      </p>
                      <p className="text-xs font-mono text-white/70 truncate">
                        Playback ID: {videoData.mux_playback_id}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center space-y-2">
                    <FileVideo className="w-12 h-12 text-primary/80 mx-auto" />
                    <p className="text-sm font-medium text-foreground">{videoData.video_name}</p>
                  </div>
                )
              ) : (
                <div className="p-8 text-center space-y-2 text-muted-foreground">
                  <Video className="w-10 h-10 opacity-30 mx-auto" />
                  <p className="text-xs font-medium">No background video uploaded yet</p>
                  <p className="text-[11px]">Upload a video file on the right to start streaming</p>
                </div>
              )}
            </div>

            {/* Streaming URL Details */}
            {videoData?.video_url && (
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Mux HLS Streaming URL (.m3u8)
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 bg-background/80 border border-input rounded-xl px-3 py-2 text-xs font-mono text-foreground truncate select-all">
                    {videoData.video_url}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    title="Copy URL"
                    className="p-2 rounded-xl border border-border bg-background hover:bg-accent text-foreground transition-all cursor-pointer shadow-2xs shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <a
                    href={videoData.video_url}
                    target="_blank"
                    rel="noreferrer"
                    title="Open Stream"
                    className="p-2 rounded-xl border border-border bg-background hover:bg-accent text-foreground transition-all cursor-pointer shadow-2xs shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}

            {/* Meta tags */}
            {videoData?.mux_playback_id && (
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono">
                <div className="bg-background/40 p-2.5 rounded-xl border border-border/80">
                  <span className="text-[10px] uppercase text-muted-foreground block">Playback ID</span>
                  <span className="font-semibold text-foreground truncate block">{videoData.mux_playback_id}</span>
                </div>
                <div className="bg-background/40 p-2.5 rounded-xl border border-border/80">
                  <span className="text-[10px] uppercase text-muted-foreground block">Asset ID</span>
                  <span className="font-semibold text-foreground truncate block">{videoData.mux_asset_id || 'N/A'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Upload & Replace Card */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary border border-primary/30 flex items-center justify-center">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-foreground">
                  Replace Background Video
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Uploads to Mux and replaces the active stream
                </p>
              </div>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Video Title / Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Video Label / Name
                </label>
                <input
                  type="text"
                  value={videoName}
                  onChange={(e) => setVideoName(e.target.value)}
                  placeholder="e.g. Hero Section Background Video"
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-2xs"
                />
              </div>

              {/* Video File Dropzone */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Video File (MP4, MOV, WEBM) *
                </label>

                {selectedFile ? (
                  <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 flex items-center gap-3">
                    <FileVideo className="w-8 h-8 text-primary shrink-0" />
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-semibold text-foreground truncate">{selectedFile.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
                        setFilePreviewUrl(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors font-medium px-2 py-1"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-background/40 hover:bg-accent/40 p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                  >
                    <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Click to browse video</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        MP4, MOV, WEBM up to 500MB
                      </p>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,.mp4,.mov,.webm,.mkv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="w-full px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Ingesting to Mux & Updating DB...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Upload & Replace Active Video</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
