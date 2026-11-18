# Architecture

```text
conversation -> Host tools -> one service layer -> policy/privacy -> narrow browser adapter -> typed observations -> redacted report
```

The plugin is independent of any account, workspace, localhost port, or production dashboard. A browser bridge can be added without changing the tool contract. Publishing and social actions remain outside this package.

Error codes include `LOGIN_REQUIRED`, `ACCOUNT_MISMATCH`, `HOST_NOT_ALLOWED`, `INPUT_TOO_LARGE`, `RATE_LIMITED`, `NOT_CONNECTED`, `NOT_IMPLEMENTED`, `CONFIRMATION_REQUIRED`, and `NOT_FOUND`.
