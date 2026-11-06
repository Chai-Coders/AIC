# Working memory: version history + MCP

Things decided or learned while building `idea.md`. Read before changing this area.

## Decisions (from the user, 2026-11-06)

- History is **one linear line, like git without branches**. Undo / restore never
  rewrite or delete versions; they append a new `rollback` version on top.
- A version offers **both** actions, clearly labelled:
  - **Undo these changes**: puts back this version's before-values (git revert).
  - **Restore website to this point**: makes the site look as it did right after
    this version, undoing everything newer (git checkout + commit).
  - Plus **Put back** on a single field.
- Fields changed again later are shown greyed with "Changed again on <date>" and are
  **unticked by default**; the admin can tick them to overwrite anyway.
- An AI draft works like staged changes: approving appends it as the newest version.
- All five build steps from `idea.md` are in scope, done in one sitting.
- **This goes to production for real (non-technical) admins**: no known bugs, every
  flow tested end to end, plain wording, forgiving UI. Review before calling it done.

## Design notes

- `changes.field === ""` means the whole record was added (`op: create`) or deleted
  (`op: delete`); `before` / `after` then hold the full record. null = empty value.
- Within one open version (CMS sitting or AI draft), changes merge per field
  (`addChange` in `lib/history.ts`): first before, latest after. Add + delete in
  the same version cancels out.
- A deleted record that is put back gets a new id; `recordAliases` maps old -> new
  and `resolveRecordId` follows it, so older changes still find the record.
- Starting any applied non-CMS version closes the open sitting, so a sitting never
  spans an undo or an approval (keeps the history linear).
- Pictures are no longer deleted on replace / delete; `images.cleanupUnused` keeps
  any picture referenced by a change (except in rejected drafts).
- Testing functions from the CLI as the dev admin:
  `npx convex run --identity '{"subject":"<userId>|x","issuer":"x","tokenIdentifier":"x"}' fn '{...}'`
