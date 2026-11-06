// GitHub REST calls, for actions only. The token is a fine-grained token scoped
// to the AIC repo, in the GITHUB_TOKEN environment variable. It never reaches
// the model or the browser.
import { ConvexError } from "convex/values";

// The branch the agent reads and Publish commits to. See docs/ai-agent.md.
const DEFAULT_BRANCH = "migrations-johny";

export const githubBranch = () => process.env.GITHUB_BRANCH || DEFAULT_BRANCH;
export const githubConfigured = () => !!process.env.GITHUB_TOKEN && !!process.env.GITHUB_REPO;

async function gh<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    throw new ConvexError("Code changes aren't set up: GITHUB_TOKEN and GITHUB_REPO are missing on the server.");
  }
  const base = (process.env.GITHUB_API_URL || "https://api.github.com").replace(/\/+$/, "");
  const res = await fetch(`${base}/repos/${repo}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new GitHubError(res.status, `GitHub said ${res.status} for ${path.split("?")[0]}: ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export class GitHubError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type TreeEntry = { path: string; sha: string; size: number; type: string };

export async function branchHead(branch = githubBranch()) {
  const ref = await gh<{ object: { sha: string } }>(`/git/ref/heads/${encodeURIComponent(branch)}`);
  return ref.object.sha;
}

export async function commitTree(commitSha: string) {
  const commit = await gh<{ tree: { sha: string } }>(`/git/commits/${commitSha}`);
  const tree = await gh<{ tree: TreeEntry[]; truncated: boolean }>(`/git/trees/${commit.tree.sha}?recursive=1`);
  if (tree.truncated) throw new ConvexError("The repository is too large to read through the GitHub API.");
  return { treeSha: commit.tree.sha, entries: tree.tree.filter((e) => e.type === "blob") };
}

export async function blobText(sha: string) {
  const blob = await gh<{ content: string; encoding: string }>(`/git/blobs/${sha}`);
  if (blob.encoding !== "base64") return blob.content;
  const bytes = Uint8Array.from(atob(blob.content.replace(/\s/g, "")), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Commits whole-file changes on top of `parentSha`. Moving the branch is not
 * forced, so a commit pushed in the meantime makes this fail instead of being
 * overwritten.
 */
export async function commitFiles(args: {
  parentSha: string;
  message: string;
  files: { path: string; content: string | null }[];
  branch?: string;
}) {
  const { treeSha } = await commitTree(args.parentSha);
  const tree = await gh<{ sha: string }>(`/git/trees`, {
    method: "POST",
    body: {
      base_tree: treeSha,
      tree: args.files.map((f) =>
        f.content === null
          ? { path: f.path, mode: "100644", type: "blob", sha: null }
          : { path: f.path, mode: "100644", type: "blob", content: f.content },
      ),
    },
  });
  const commit = await gh<{ sha: string }>(`/git/commits`, {
    method: "POST",
    body: { message: args.message, tree: tree.sha, parents: [args.parentSha] },
  });
  await gh(`/git/refs/heads/${encodeURIComponent(args.branch ?? githubBranch())}`, {
    method: "PATCH",
    body: { sha: commit.sha, force: false },
  });
  return commit.sha;
}

/** Paths changed between two commits. */
export async function changedSince(baseSha: string, headSha: string) {
  if (baseSha === headSha) return [] as string[];
  const res = await gh<{ files?: { filename: string }[] }>(`/compare/${baseSha}...${headSha}`);
  return (res.files ?? []).map((f) => f.filename);
}

export type DeployState = "success" | "failure" | "pending" | "none";

/**
 * What the website's deploy check says about a commit. Only checks whose name
 * matches count (GITHUB_DEPLOY_CHECK, default "vercel"): a failing lint job isn't
 * a failed deploy, and a passing one doesn't mean the new code is live.
 */
export async function deployState(sha: string): Promise<DeployState> {
  const isDeploy = new RegExp(process.env.GITHUB_DEPLOY_CHECK || "vercel", "i");
  const [status, runs] = await Promise.all([
    gh<{ statuses: { state: string; context: string }[] }>(`/commits/${sha}/status`),
    gh<{ check_runs: { name: string; status: string; conclusion: string | null }[] }>(`/commits/${sha}/check-runs`),
  ]);
  const states = [
    ...status.statuses.filter((s) => isDeploy.test(s.context)).map((s) => s.state),
    ...runs.check_runs.filter((r) => isDeploy.test(r.name)).map((r) =>
      r.status !== "completed"
        ? "pending"
        : ["success", "neutral", "skipped"].includes(r.conclusion ?? "")
          ? "success"
          : "failure",
    ),
  ];
  if (states.length === 0) return "none";
  if (states.some((s) => s === "failure" || s === "error")) return "failure";
  return states.every((s) => s === "success") ? "success" : "pending";
}

/** Keeps anything shaped like a credential out of public commit messages. */
export function safeCommitMessage(text: string) {
  return text
    .replace(/\b(sk-[A-Za-z0-9_-]{8,}|gh[pousr]_[A-Za-z0-9]{8,}|github_pat_[A-Za-z0-9_]{8,}|AIza[A-Za-z0-9_-]{8,})\b/g, "[removed]")
    .slice(0, 2000);
}
