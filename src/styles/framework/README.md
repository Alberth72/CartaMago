# UI Framework Adapter

Bootstrap is the current CSS framework provider, but components should not import Bootstrap directly or depend on Bootstrap class names as their primary API.

Rules:

- Keep the app import pointed at `src/styles/framework/index.css`.
- Keep provider imports in this folder.
- Keep CartaMago-owned classes and utility compatibility in `src/index.css`.
- Prefer project-owned semantic classes for new shared UI.
- If Bootstrap is replaced later, update this adapter first and keep component changes small.
