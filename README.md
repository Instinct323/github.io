# Instinct323.github.io

Personal site built with Astro and published to GitHub Pages.

## Quick Start

```bash
pnpm install
pnpm dev
```

## Project Layout

```text
├── content/                  # Site content and config files
├── src/
│   ├── components/           # Astro UI components
│   ├── layouts/              # Shared layout shell
│   ├── lib/                  # Config/content/media loaders
│   ├── pages/                # Route entry pages
│   └── styles/               # Global tokens and shared styles
├── tests/
└── package.json
```

## References

- Carousel references: https://swiperjs.com/demos
- Visual effects inspiration: https://codepen.io/trending

## For LLM

`github.io/` is the release repository. Keep changes production-safe and fully verified.

Do not use `git` commands in this repository.

### Engineering quality gate (must pass)

- Naming and structure: simplify names where clarity is preserved, and prefer maintainable module boundaries.
- Duplication and dead code: remove duplicate logic, unused functions, and unused styles; merge similar style rules.
- CSS tokens: avoid unnecessary `var(--x)` forwarding chains; consume source tokens directly when practical.
- Config safety: avoid default-parameter fallbacks that can hide invalid configuration; prefer fail-fast behavior.
- Runtime path: simplify critical render and loading paths; avoid unnecessary work in page-level code.
- Documentation and comments: update docs when behavior changes; add useful English comments in non-obvious blocks (roughly every 6-10 lines in dense logic, not on obvious lines).

### Loading orchestration

- Use `src/lib/page-load-orchestrator.ts` as the single entry for page-load priority (`frame -> background -> controls`).
- Build deferred-mount runtime payload/bootstrap options via `src/lib/deferred-mount-page.ts` to avoid page-level inline wiring duplication.

### Shared validation helpers

- Reuse `src/lib/assertions.ts` for cross-module primitive assertions (`assertString`, `assertFiniteNumber`, `assertBoolean`, `assertPositiveInteger`).
- Keep module-local assertions only when they are domain-specific and not safely generalizable.

### Test hygiene gate (must pass)

- Keep `tests/` minimal and stable.
- Keep only repository-generic guardrail tests; remove plan-private or one-off refactor checks once the plan is done.
- Do not keep temporary diagnostics scripts in the repository.
- Remove throwaway test helpers after the related verification is complete.

### Validation gate (must pass)

- Use risk-based validation; do not run expensive checks when the change cannot affect runtime behavior.
- Doc-only changes (for example README/text-only docs): skip `pnpm check` and `pnpm test:site`.
- Code, config, style, or route changes: run `pnpm check` and `pnpm test:site`.
- If failures are pre-existing, separate them clearly from new regressions in your report.

### README gate (must pass)

- English only.
- Keep text concise, operational, and non-redundant.
- Do not remove existing mandatory constraints unless the change explicitly replaces them.
- After every project change, update README sections (`Project Layout`) when project reality changes.
