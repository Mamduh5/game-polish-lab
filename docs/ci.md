# CI

The GitHub Actions workflow in `.github/workflows/ci.yml` runs on push and pull request.

It checks:

- `npm ci`
- `npm run compile`
- `npm test`
- `npm run package:check`

CI has no secret tokens and does not publish the extension. TypeScript errors fail CI through `npm run compile`. The test command runs the existing regression suite plus release-readiness safety coverage.

Run the same checks locally:

```bash
npm ci
npm run compile
npm test
npm run package:check
```

`npm run lint` is currently equivalent to `tsc --noEmit -p ./`; run it when you want a compile-only check without emitting files.
