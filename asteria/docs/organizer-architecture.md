# Organizer Architecture

## Goal

Prepare Asteria to act as a local-first media organizer without claiming heavy AI that is not enabled yet.

## Main Layers

- `services/mediaDetectionService.ts`
  - detects `image`, `video`, `folder`, or `unknown`
  - identifies screenshot and likely camera-file hints
- `services/mediaOrganizationService.ts`
  - builds lightweight organization metadata
  - creates safe suggestions for screenshots, videos, dates, formats, large files, and unorganized assets
- `services/organizationStorageService.ts`
  - persists metadata-only organization records, people clusters, place tags, event clusters, and dismissed suggestions
- `services/fileOrganizationService.ts`
  - creates preview-only move/copy plans
  - keeps execution disabled in this phase
- `services/organizationReportService.ts`
  - exports metadata-only organizer summaries

## UI Surface

- `features/organizer/OrganizerView.tsx`
  - organizer overview
  - library statistics
  - suggestion cards
  - plan preview
- `features/organizer/PeoplePanel.tsx`
- `features/organizer/PlacesPanel.tsx`
- `features/organizer/EventsPanel.tsx`
- `features/smart-folders/SmartFoldersView.tsx`
- `features/materials/MaterialVaultView.tsx`

## Media Model

- folders remain explicit `kind: folder`
- images remain explicit `kind: image`
- videos now use `kind: video`
- organization metadata lives in `item.metadata.organization`
- smart folder metadata lives on folder assets via `item.smartFolder`
- material metadata lives on folder assets via `item.material`
- no blobs, object URLs, or raw bytes are persisted

## Safety Rules

- browser mode can inspect and filter only
- organization plans are preview-only
- desktop mode is required for any future file move/copy execution
- no fake people recognition or duplicate certainty is reported in this phase
