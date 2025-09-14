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

## Tests
- Jest + Supertest lives under `tests/`.
- CI runs tests on push/PR via GitHub Actions.

## Releases
- Tag versions using semver: `git tag -a vX.Y.Z -m "vX.Y.Z: summary"`
- Push tag: `git push origin vX.Y.Z`
- Optionally draft a GitHub Release from the tag.
