# Contributing to Flux Chamber

## Issue Tracking

All bugs, enhancements, and tasks are tracked via GitHub Issues. This applies across all `@COMMENCINGTHESCOURGE` core repositories.

### Standard Labels

| Label | Purpose |
|-------|---------|
| `bug` | Something isn't working |
| `enhancement` | New feature or request |
| `bounty` | Has a monetary bounty attached |
| `documentation` | Improvements or additions to documentation |
| `wontfix` | This will not be worked on |
| `meta` | Repository infrastructure and process |
| `good first issue` | Good for newcomers |
| `help wanted` | Extra attention is needed |

### Filing Issues

- Use the appropriate issue template (Bug Report, Enhancement, or Bounty)
- One issue per problem — don't bundle unrelated items
- Reference specific files and line numbers when possible
- For bounties: include clear acceptance criteria and dollar amount in the title

### Bounty Workflow

1. Issues labeled `bounty` have a monetary reward
2. Comment on the issue to claim it
3. Submit a PR referencing the issue (`Closes #N`)
4. Bounty is paid on merge

## Development

```bash
npm ci
npm run build
npm test
npm run lint
```

### Code Style

- TypeScript strict mode
- Biome for formatting and linting (`npm run lint`)
- Vitest for testing (`npm test`)

### Pull Requests

- One PR per issue
- Include a test plan
- All CI checks must pass
- Keep diffs minimal and focused
