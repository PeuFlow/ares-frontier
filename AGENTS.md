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
- Phase 2 adds demo-only auth + mission planner in `src/hooks/use-mission.tsx` and travel/stay/experience data in `src/data/catalog.ts`; providers and site chrome live in `__root.tsx` so state survives navigation. Never store passwords.
- The root chrome reuses the login screen until persisted demo state is hydrated and an explorer or guest session exists; this is a presentation gate only, not secure authentication.
- 3D code lives in `src/components/three/` and is lazy-loaded client-side via `GlobeStage` — three.js must never run during SSR.
- Territory catalog imagery is defined per territory in the shared data model with image, imageAlt, and imageSource; cards consume those fields so individual landscapes can be replaced without changing layout or controls.
