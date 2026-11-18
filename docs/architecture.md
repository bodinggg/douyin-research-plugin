# Architecture

```text
DSH conversation
  -> Host tool definitions (ContentBlock output)
  -> service: bounds, source policy, persistence projection
  -> serialized Ego Lite adapter
  -> fixed ego-browser nodejs program
  -> visible DOM observations
  -> bounded metadata report with evidence gaps
```

Config uses @deepseek-ai/schemastery and Standard Schema v1. Runtime registration is owned by a Cordis effect; unload unregisters tools, aborts child processes and refuses queued browser operations.

The plugin stores its own task-space handle in memory. It never selects unrelated user tabs, reads cookies, or executes caller-supplied scripts. Login and verification hand control to the user. Subsequent reads require browser control to have been returned through Ego Lite. A failed operation retains the task ID; an expired task resets plugin references.

Works are selected exclusively from the signed-in account's user-post-list container. Comment workRef handles are issued by the same adapter instance and map to validated video URLs. Each navigation validates the allowed HTTPS origin and requested video path. Following results represent a visible sample, not a complete friend directory.

Video interpretation currently means metadata observation only: title, duration and player presence. It returns partial with no audiovisual findings. Full analysis and analytics return CAPABILITY_UNAVAILABLE. Publishing and social writes are outside this package.

Reports persist only when explicitly enabled with workspaceRoot. Persisted observations contain durationSeconds and videoPresent; page titles, comments, usernames and frames are excluded. DSH conversation history itself is managed by DSH, separately from plugin persistence.

Error codes include LOGIN_REQUIRED, ACCOUNT_MISMATCH, INVALID_URL, HOST_NOT_ALLOWED, INVALID_LIMIT, INPUT_TOO_LARGE, BROWSER_NOT_INSTALLED, BROWSER_UNAVAILABLE, BROWSER_TIMEOUT, TASK_EXPIRED, PAGE_NOT_READY, VIDEO_UNAVAILABLE, CAPABILITY_UNAVAILABLE, PLUGIN_STOPPED, CONFIRMATION_REQUIRED and NOT_FOUND.
