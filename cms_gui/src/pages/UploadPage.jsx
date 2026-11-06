import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { AlertCircle, CheckCircle2, Loader2, Upload } from 'lucide-react';
import { run } from '../services/convex';

// The one-time upload link an AI app hands out (MCP request_upload_link).
// No sign-in: the link itself is the key. The picture goes into the AI draft,
// not onto the website; the admin still approves it on the Versions page.

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function Shell({ children }) {
  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <img src="/logo1.png" alt="AIC IIITK" className="h-10 w-auto object-contain dark:brightness-0 dark:invert" />
        </div>
        <div className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">{children}</div>
      </div>
    </div>
  );
}

export default function UploadPage() {
  const { token } = useParams();
  const info = useQuery(anyApi.uploads.info, { token });
  const generateUploadUrl = useMutation(anyApi.uploads.generateUploadUrl);
  const complete = useMutation(anyApi.uploads.complete);
  const input = useRef(null);
  const [state, setState] = useState('idle'); // idle | uploading | done
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  // The link is used up the moment the upload completes; keep showing what it
  // was for until the success screen takes over.
  const [shown, setShown] = useState(null);
  if (info?.ok && !shown) setShown(info);
  const view = info?.ok ? info : shown;

  const send = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('That file is not an image. Please choose a JPG, PNG or WEBP picture.');
    if (file.size > MAX_IMAGE_BYTES) {
      return setError(`That picture is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Please choose one under 10 MB.`);
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
    setState('uploading');
    try {
      const url = await run(() => generateUploadUrl({ token }));
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
      if (!res.ok) throw new Error('The picture could not be uploaded. Please try again.');
      const { storageId } = await res.json();
      await run(() => complete({ token, storageId }));
      setState('done');
    } catch (err) {
      setError(err.message);
      setState('idle');
    }
  };

  if (state === 'done') {
    return (
      <Shell>
        <div className="space-y-3 text-center">
          {preview && <img src={preview} alt="" className="mx-auto h-32 w-auto rounded-lg border border-border object-contain" />}
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <h1 className="text-lg font-semibold text-foreground">Picture added to the draft</h1>
          <p className="text-sm text-muted-foreground">
            You can close this page. The picture appears on the CMS Versions page under “Waiting for approval”, and goes on the
            website once you approve it.
          </p>
        </div>
      </Shell>
    );
  }

  if (info === undefined) {
    return (
      <Shell>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </Shell>
    );
  }

  if (!info.ok && !(state === 'uploading' && shown)) {
    return (
      <Shell>
        <div className="space-y-3 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="text-lg font-semibold text-foreground">This link can’t be used</h1>
          <p className="text-sm text-muted-foreground">{info.problem}</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-foreground">Send a picture</h1>
        <p className="text-sm text-muted-foreground">
          {view.app} asked for the <strong className="font-medium text-foreground">{view.fieldLabel.toLowerCase()}</strong> of{' '}
          <strong className="font-medium text-foreground">{view.itemTitle}</strong> ({view.page}). It won’t be on the website
          until you approve it.
        </p>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          send(e.dataTransfer.files?.[0]);
        }}
        disabled={state === 'uploading'}
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors ${
          dragActive ? 'border-primary bg-accent' : 'border-input hover:border-primary/60 hover:bg-muted/60'
        }`}
      >
        {state === 'uploading' ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm font-medium text-foreground">Uploading…</span>
          </>
        ) : (
          <>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Upload className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-foreground">{dragActive ? 'Drop the picture here' : 'Choose a picture'}</span>
            <span className="text-[13px] text-muted-foreground">or drag one here · JPG, PNG or WEBP, up to 10 MB</span>
          </>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          send(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <p className="text-center text-xs text-muted-foreground">
        This link works once and expires {new Date(view.expiresAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}.
      </p>
    </Shell>
  );
}
