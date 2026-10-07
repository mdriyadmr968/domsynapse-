# Contributing to DomSynapse 🤝

Thank you for your interest in contributing to DomSynapse! We welcome issues, discussions, and pull requests to help improve the project.

---

## 1. Monorepo Structure

DomSynapse is managed as a `pnpm` monorepo with the following workspace layout:

```text
domsynapse/
├── packages/
│   ├── core/         # Framework-agnostic observer, serializer, PII shield, and action engine
│   ├── react/        # React context provider, collapsible dock, spotlight overlay, and hooks
│   ├── server/       # Next.js, Express, Hono edge adapters & LLM streaming proxies
│   └── extension/    # Chrome/Edge Manifest V3 browser extension wrapper
├── apps/
│   └── demo/         # Interactive Next.js 14 playground app
├── docs/             # Architecture, API reference, security, and integration guides
└── .changeset/       # Version management and release changelog configs
```

---

## 2. Prerequisites

- **Node.js**: `v18.18.0` or higher (Node 20+ recommended).
- **Package Manager**: `pnpm` (`v9` or `v10`).

---

## 3. Local Development Setup

### Clone the repository
```bash
git clone https://github.com/mdriyadmr968/domsynapse-.git
cd domsynapse
```

### Install dependencies
```bash
pnpm install
```

### Build all packages
```bash
pnpm build
```

### Run the test suite
```bash
pnpm test
```

### Start the demo playground
```bash
pnpm --filter demo dev
```

---

## 4. Coding Standards

- **TypeScript**: Strict mode is enabled across all packages. Avoid using `any` wherever possible.
- **Rules of Hooks**: In `@domsynapse/react`, keep all hooks (`useState`, `useCallback`, `useEffect`) unconditionally at the top of component bodies before any early returns.
- **SSR Compatibility**: Protect any browser globals (`window`, `document`, `BroadcastChannel`, `CSS.escape`) with runtime environment guards.
- **Unit Tests**: Every new feature or bugfix should include corresponding unit tests using Vitest.

---

## 5. Commit Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new feature (e.g., `feat(react): add custom dock placement`)
- `fix:` A bug fix (e.g., `fix(core): guard CSS.escape for SSR`)
- `docs:` Documentation only changes (e.g., `docs: add security guide`)
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `test:` Adding or correcting tests (e.g., `test: add cross-tab sync test suite`)
- `chore:` Maintenance or tooling changes

---

## 6. Versioning & Changesets

We use [Changesets](https://github.com/changesets/changesets) for semver versioning and release notes:

1. After making code changes, generate a changeset:
   ```bash
   pnpm changeset
   ```
2. Follow the interactive prompts to select the affected packages, choose the bump type (`patch`, `minor`, `major`), and provide a descriptive summary.
3. Commit the generated markdown file in `.changeset/` along with your PR.

---

## 7. Submitting a Pull Request

1. Fork the repository and create your feature branch from `main`:
   ```bash
   git checkout -b feat/my-new-feature
   ```
2. Make your changes, write tests, and ensure all existing tests pass:
   ```bash
   pnpm test
   ```
3. Push your branch to GitHub and open a Pull Request against `main`.
4. Ensure CI checks pass on GitHub Actions.

---

## Code of Conduct

Please be respectful, constructive, and welcoming to all contributors.
