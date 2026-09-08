# Contributing

Thanks for your interest in contributing to Zen Mode. This document describes how to report issues, propose changes, and set up a local development environment.

## Reporting issues

- Search [existing issues](../../issues) before opening a new one.
- For bugs, include: Obsidian version, plugin version, operating system, reproduction steps, and what you expected vs. what happened. Screenshots or a short screen recording help.
- For feature requests, describe the use case and the problem the feature would solve, not just the proposed solution.

## Development setup

Requirements:

- [Node.js](https://nodejs.org/) (LTS recommended)
- [pnpm](https://pnpm.io/). This repo pins a specific version via `packageManager` in `package.json`.

```bash
pnpm install
pnpm dev       # watch mode build
pnpm build     # production build (runs format + type-check + bundle)
pnpm lint      # check code style
pnpm lint:fix  # auto-fix where possible
pnpm format    # apply Prettier formatting
```

Build artifacts (`main.js`, `manifest.json`, `styles.css`) are produced at the repo root.

To test against a real vault, point the build output at `<vault>/.obsidian/plugins/zenmode/` (symlink the three files, or use a tool like [hot-reload](https://github.com/pjeby/hot-reload)).

## Pull requests

- Open an issue first for anything non-trivial so direction can be agreed on before you spend time on it.
- Keep PRs focused. One concern per PR is easier to review.
- Run `pnpm lint` and `pnpm build` before submitting.
- Follow the existing code style; Prettier formatting is enforced by the build.
- Update the README if you change user-facing behavior.

## Releases

Maintainers cut releases by bumping the version in `manifest.json`, `package.json`, and `versions.json`, committing, then pushing a tag. The release workflow builds and attaches `main.js`, `manifest.json`, and `styles.css` with a build provenance attestation.

## License

By contributing, you agree that your contributions will be licensed under the [GPL-2.0 License](LICENSE).
