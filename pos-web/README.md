# POS Web - Label Print Preview

Independent POS label printing preview application.

## Setup

```bash
npm install
npm run dev
```

## Configuration

Edit `src/config.ts` to change:
- `businessId` - Your POS business ID
- `token` - API authentication token
- `apiBase` - Backend API base URL (default: `/label`)

## Features

- Fetch active label template from POS API
- Real-time template preview on canvas
- Sync/refresh latest template
- Print preview functionality

## Building

```bash
npm run build
```
