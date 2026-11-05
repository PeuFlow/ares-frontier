<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Ares Frontier phase 1 is frontend-only: territory data lives in `src/data/territories.ts`, shared UI state in `src/hooks/use-frontier.tsx` (localStorage persistence) — keeps later backend swap in one place.
- Auth uses FastAPI routes in `backend/app/routers/auth.py`, Argon2 password hashes and revocable database sessions via an HttpOnly cookie. Never persist plaintext passwords or browser tokens in frontend storage. Mission planning remains a local demo in `src/hooks/use-mission.tsx`; catalog data lives in `src/data/catalog.ts`. Providers and chrome live in `__root.tsx`.
- The root chrome waits for `/api/auth/me` before restoring an explorer; only guest state may restore from localStorage. The entry screen is a presentation gate; private backend endpoints must enforce `current_user` and CSRF checks for mutations. See `backend/README.md` for setup.
- User administration lives in `src/routes/admin.tsx` and `backend/app/routers/admin.py`. Enforce the live `admin` role on every administrative endpoint. Role/status changes revoke affected sessions; preserve an active administrator and prohibit removing one's own admin access. Bootstrap an existing account with `python -m app.cli promote-admin EMAIL`; never add default admin credentials.
- 3D code lives in `src/components/three/` and is lazy-loaded client-side via `GlobeStage` — three.js must never run during SSR.
- Territory imagery is defined per territory in the shared data model with image, imageAlt, and imageSource; catalog cards, details dialogs, and the gallery consume those same fields so individual landscapes can be replaced consistently without changing layout or controls.
