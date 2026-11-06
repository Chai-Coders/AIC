import { useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { AlertCircle, Bot, Check, CheckCircle2, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { run } from '../services/convex';

// Where an AI app (Claude, ChatGPT, ...) sends the admin to connect: the
// OAuth authorization page. The admin is already signed in to the CMS (or
// signs in first), sees which app is asking and clicks Allow.

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

function Problem({ children }) {
  return (
    <Shell>
      <div className="space-y-3 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="text-lg font-semibold text-foreground">This connection can’t be made</h1>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </Shell>
  );
}

const CAN = [
  'Read everything on the website',
  'Suggest edits, new items, deletions and pictures',
];
const CANNOT = [
  'Publish anything: its changes wait on the Versions page until you approve them',
  'See your password',
];

export default function OAuthAuthorizePage() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const clientId = params.get('client_id') ?? '';
  const redirectUri = params.get('redirect_uri') ?? '';
  const valid = params.get('response_type') === 'code' && clientId && redirectUri && params.get('code_challenge');

  const info = useQuery(anyApi.oauth.clientInfo, isAuthenticated && valid ? { clientId, redirectUri } : 'skip');
  const authorize = useMutation(anyApi.oauth.authorize);
  const [status, setStatus] = useState('idle'); // idle | working | done
  const [error, setError] = useState(null);

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!valid) return <Problem>The link from the AI app is incomplete. Start connecting again from the app.</Problem>;
  if (info === undefined) {
    return (
      <Shell>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </Shell>
    );
  }
  if (!info.ok) return <Problem>{info.problem}</Problem>;

  const allow = async () => {
    setStatus('working');
    setError(null);
    try {
      const back = await run(() =>
        authorize({
          clientId,
          redirectUri,
          codeChallenge: params.get('code_challenge'),
          codeChallengeMethod: params.get('code_challenge_method') ?? 'plain',
          ...(params.get('state') ? { state: params.get('state') } : {}),
        })
      );
      setStatus('done');
      window.location.assign(back);
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  };

  const deny = () => {
    const back = new URL(redirectUri);
    back.searchParams.set('error', 'access_denied');
    if (params.get('state')) back.searchParams.set('state', params.get('state'));
    window.location.assign(back.toString());
  };

  if (status === 'done') {
    return (
      <Shell>
        <div className="space-y-3 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <h1 className="text-lg font-semibold text-foreground">{info.name} is connected</h1>
          <p className="text-sm text-muted-foreground">
            Going back to {info.name}… If nothing happens, return to it yourself. You can close this tab.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Bot className="h-5 w-5" />
        </span>
        <div className="min-w-0 space-y-1">
          <h1 className="text-lg font-semibold text-foreground">Connect {info.name} to the AIC website?</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {user?.email || user?.username}. It will return to {info.redirectHost}.
          </p>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <p className="font-medium text-foreground">It will be able to:</p>
        <ul className="space-y-2">
          {CAN.map((text) => (
            <li key={text} className="flex gap-2 text-muted-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              {text}
            </li>
          ))}
        </ul>
        <p className="pt-1 font-medium text-foreground">It won’t be able to:</p>
        <ul className="space-y-2">
          {CANNOT.map((text) => (
            <li key={text} className="flex gap-2 text-muted-foreground">
              <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              {text}
            </li>
          ))}
        </ul>
      </div>

      <p className="rounded-lg bg-muted px-3 py-2.5 text-[13px] text-muted-foreground">
        Only connect apps you started connecting yourself. You can disconnect it at any time on the AI connection page.
      </p>

      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={deny} disabled={status === 'working'} className="btn-secondary">
          Cancel
        </button>
        <button type="button" onClick={allow} disabled={status === 'working'} className="btn-primary">
          {status === 'working' && <Loader2 className="h-4 w-4 animate-spin" />}
          Allow
        </button>
      </div>
    </Shell>
  );
}
