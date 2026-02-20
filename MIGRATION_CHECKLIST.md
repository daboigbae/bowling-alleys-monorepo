# Monorepo Migration Quick Checklist

Use this checklist when migrating to the monorepo structure.

## Pre-Migration

- [ ] Review `MONOREPO_MIGRATION.md` for detailed instructions
- [ ] Backup current repository
- [ ] Ensure all changes are committed
- [ ] Review and understand the target structure

## Repository Setup

- [ ] Create new repository: `bowling-alleys-monorepo`
- [ ] Initialize git in new repository
- [ ] Create directory structure:
  - [ ] `packages/frontend/`
  - [ ] `packages/api/`
  - [ ] `packages/shared/`
  - [ ] `attached_assets/` (root)

## Workspace Configuration

- [ ] Choose package manager (pnpm recommended)
- [ ] Create workspace config file:
  - [ ] `pnpm-workspace.yaml` (if using pnpm)
  - [ ] Or update root `package.json` with workspaces
- [ ] Create root `package.json` with workspace scripts

## File Migration

- [ ] Copy `frontend/` → `packages/frontend/`
- [ ] Copy `server/` → `packages/api/`
- [ ] Copy `shared/` → `packages/shared/`
- [ ] Copy `attached_assets/` → root `attached_assets/`
- [ ] Copy root config files (`.gitignore`, `README.md`, etc.)

## Package Configuration

- [ ] Update `packages/frontend/package.json`:
  - [ ] Change name to `@bowling-alleys/frontend`
  - [ ] Verify all dependencies
- [ ] Update `packages/api/package.json`:
  - [ ] Change name to `@bowling-alleys/api`
  - [ ] Verify all dependencies
- [ ] Create/update `packages/shared/package.json`:
  - [ ] Set name to `@bowling-alleys/shared`
  - [ ] Configure exports

## Path Updates

- [ ] Update `packages/api/routes.ts`:
  - [ ] Blog content path (line 284)
- [ ] Update `packages/api/index.ts`:
  - [ ] Attached assets path (line 77)
- [ ] Update `packages/frontend/next.config.js`:
  - [ ] Attached assets alias (line 31)
- [ ] Update `packages/frontend/lib/blog-server.ts`:
  - [ ] Blog directory path (line 23) - verify it works

## TypeScript Configuration

- [ ] Update root `tsconfig.json`:
  - [ ] Add project references
  - [ ] Configure paths for monorepo
- [ ] Update `packages/frontend/tsconfig.json`:
  - [ ] Update `@shared/*` path
- [ ] Create/update `packages/api/tsconfig.json`:
  - [ ] Update `@shared/*` path

## Import Path Updates

- [ ] Search for `@shared/*` imports in frontend
- [ ] Update to `@bowling-alleys/shared/*` or relative paths
- [ ] Search for `@shared/*` imports in API
- [ ] Update to `@bowling-alleys/shared/*` or relative paths

## Environment Variables

- [ ] Copy `server/.env` → `packages/api/.env`
- [ ] Update paths in `packages/api/.env`:
  - [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON string)
- [ ] Copy `frontend/.env.local` → `packages/frontend/.env.local`
- [ ] Verify `NEXT_PUBLIC_API_URL` is correct
- [ ] Create `.env.example` files for documentation

## Dependencies Installation

- [ ] Run `pnpm install` (or `npm install` / `yarn install`)
- [ ] Verify all packages install correctly
- [ ] Check for dependency conflicts

## Testing

- [ ] Start API server: `pnpm dev:api`
- [ ] Verify API starts on port 5000
- [ ] Start frontend: `pnpm dev:frontend`
- [ ] Verify frontend starts on port 3000
- [ ] Test API connectivity from frontend
- [ ] Test asset loading (images, logos)
- [ ] Test blog post loading
- [ ] Test venue data loading
- [ ] Test authentication flow

## Build Testing

- [ ] Build API: `pnpm build:api`
- [ ] Verify API build succeeds
- [ ] Build frontend: `pnpm build:frontend`
- [ ] Verify frontend build succeeds
- [ ] Test production builds locally

## Documentation

- [ ] Update root `README.md`:
  - [ ] New structure description
  - [ ] Updated setup instructions
  - [ ] New script commands
- [ ] Update `ENV_VARIABLES.md` if needed
- [ ] Update any deployment docs
- [ ] Update CI/CD configurations

## Git & Version Control

- [ ] Initialize git in new repo (if not done)
- [ ] Create initial commit
- [ ] Set up `.gitignore`:
  - [ ] Verify all patterns are correct
  - [ ] Ensure `.env` files are ignored
  - [ ] Ensure service account files are ignored
- [ ] Create initial branch structure

## Cleanup

- [ ] Remove old repository (after verification)
- [ ] Update any external references
- [ ] Update deployment configurations
- [ ] Archive or delete old repo

## Post-Migration Verification

- [ ] All tests pass
- [ ] Development servers work
- [ ] Production builds work
- [ ] All features functional
- [ ] No console errors
- [ ] Documentation is up to date

## Notes

- Keep old repository until migration is fully verified
- Test thoroughly before deleting old repo
- Update team members about new structure
- Update any CI/CD pipelines

