# Douyin research assistant

A standalone DSH Host plugin for conversation-first, read-only Douyin research.

## Current release

`0.1.0` provides the Host tool contract and a safe adapter boundary. The default adapter deliberately reports `NOT_CONNECTED` until a browser bridge is configured. It never accepts passwords, cookies, QR bytes, arbitrary browser scripts, or arbitrary URLs.

The plugin is read-only by default. It does not publish, reply, send direct messages, share, delete works, or alter account settings.

## Conversation flow

1. Ask the agent to log in to Douyin.
2. Finish QR or browser login yourself.
3. Ask which account is active.
4. Browse the visible following/friend list and works.
5. Ask for a quick, simple, or full interpretation of a video.

## Tools

- `dy_login_status`
- `dy_login_start`
- `dy_session_status`
- `dy_session_clear`
- `dy_works`
- `dy_comments`
- `dy_analytics`
- `dy_video_interpret`
- `dy_interpret_detail`

## Interpretation modes

`simple` is bounded and focuses on observable metadata, frames, captions when available, hook, story, visual structure, audio clues, and gaps. `full` is feature-gated and may add visible account and comment context only when the adapter can observe it. Claims should be classified as observed, inferred, or unknown.

## Privacy

The plugin omits raw URLs, captions, comments, cookies, tokens, passwords, QR data, usernames, and frames from persisted results by default. Results are stored only when `interpretation.persist` is explicitly enabled, under a user-selected workspace root with restrictive file permissions.

## Browser bridge contract

Implement a narrow adapter for `loginStatus`, `beginLogin`, `clearSession`, `readWorks`, `readComments`, `readAnalytics`, and `readVideo`. Validate and allowlist references before the adapter is called. The adapter must return typed observations and must not execute model-provided scripts.

## Install as a local bundle

The package is a DSH bundle. Install the package directory with the Harness plugin manager, or publish the package to a registry/GitHub release and install it from there. Do not copy its files into an application workspace. After installation, verify the plugin row, Config schema, and registered Host tools.

## Known limits

A public GitHub package cannot promise access to every Douyin friend list, private account, comment, or video. Results depend on the account's own permissions, page state, region, and current Douyin UI. The plugin reports unavailable capabilities explicitly.
