# Job Lifecycle Model

## Purpose

This document captures the canonical vocabulary used by Asteria for jobs, queues, batch runs, AI actions, package exports, and processing reports.

The goal is not to force every domain into one exact status list. The goal is to make every domain readable through the same lifecycle lens so UI, storage, and reports stay aligned.

## Canonical lifecycle concepts

### Active states

States that represent work in flight or a job that is still being prepared:

- `queued`
- `preparing`
- `running`
- `processing`
- `exporting`
- `checking`

### Terminal states

States that represent the end of a lifecycle branch:

- `completed`
- `failed`
- `cancelled`
- `partial`
- `skipped`
- `unsupported`
- `available`
- `not_configured`
- `unavailable`
- `error`

### Tone mapping

- `success`: completed-like states
- `danger`: failed-like states
- `active`: in-flight states
- `info`: placeholder and readiness states
- `neutral`: draft or idle states

## Current usage

- Export queue labels now delegate to the shared lifecycle service.
- Batch labels now delegate to the shared lifecycle service.
- AI labels now delegate to the shared lifecycle service, while keeping the special placeholder wording.
- Package export now starts in `preparing` to stay inside the documented lifecycle.
- Processing reports now use the same shared label vocabulary in summaries.

## Scope kept intentionally narrow

- Domain-specific payloads remain separate.
- Export, batch, AI, and package job shapes are not collapsed into one interface yet.
- This is a canonical interpretation layer, not a full domain merge.

