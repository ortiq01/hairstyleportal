# Contributing

## Branching
- Create feature branches from `main`: `feat/<short-name>`
- Keep PRs small and focused.

## Commits
- Conventional commits preferred (feat, fix, chore, docs, test, refactor).

## Setup
- Node.js 20 (see `.nvmrc`)
- Install: `npm install`
- Run: `npm start`
- Test: `npm test`
 - Lint: `npm run lint` (auto-fix: `npm run lint:fix`)

## Tests
- Jest + Supertest lives under `tests/`.
- CI runs lint and tests on push/PR via GitHub Actions.

## Releases
- Tag versions using semver: `git tag -a vX.Y.Z -m "vX.Y.Z: summary"`
- Push tag: `git push origin vX.Y.Z`
- Optionally draft a GitHub Release from the tag.

## Pull Requests
- Draft early; convert to Ready for Review when the checklist is green.
- Reference the issue number in the description.
	- Prefer GitHub closing keywords to automatically close issues on merge.
		- Examples: `Closes #123`, `Fixes #456`, `Resolves #789`.
		- Multiple: `Closes #12, fixes #34`.
		- If only partial work is done, use non-closing phrasing: `Refs #123`.
- Required checklist before marking Ready:
	- CI green (lint + tests)
	- Screenshots for UI changes (desktop + mobile)
	- Accessibility verified (focus-visible; keyboard for carousels/forms)
	- Performance sanity: LCP < 2.5s, CLS < 0.1
	- SEO unaffected or improved (metadata/JSON-LD)
	- Docs updated if behavior/config changed
	- No secrets committed; `.env` usage respected
 	- Uses closing keywords to auto-close any completed issue(s)
