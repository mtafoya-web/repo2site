# Test Coverage

This repository now includes two testing layers:

- `tests/unit`
  Route- and helper-level automated checks for the core portfolio flows:
  - GitHub import validation
  - resume/profile enrichment validation
  - AI enhancement validation
  - export bundle generation
  - share publishing
  - template publishing
  - template reactions
- `tests/e2e`
  Playwright smoke coverage for:
  - `/`
  - `/builder`
  - `/templates`
  - public share pages

## Commands

- `npm run test:unit`
- `npm run test:e2e`

## Notes

- Playwright will start `npm run dev` automatically unless `PLAYWRIGHT_BASE_URL` is already set.
- The new production runtime guardrails only activate for true production deployments, so local tests can still use filesystem-backed share/template storage.
