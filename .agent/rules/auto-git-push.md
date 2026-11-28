---
trigger: always_on
description: Permanent GitHub auto-commit and push workflow for Skill Exchange after every completed development task
---

# Automatic GitHub Commit & Push Workflow

After completing any code or configuration task in this repository (`https://github.com/abuubaydah2012/Skill-Exchange.git`, branch `main`), automatically execute this sequence without waiting to be asked:

1. **Review & Secret Check**: Run `git status` and `git diff` to verify all modified files are intended and contain no `.env` files, passwords, API keys, MongoDB credentials, or other secrets.
2. **Validate**:
   - Run frontend TypeScript check (`npx tsc --noEmit`) and production build (`npm run build`).
   - Run backend TypeScript check (`Push-Location backend; npx tsc --noEmit; Pop-Location`).
   - Run lint or relevant tests if configured.
   - If any check/build fails due to your changes, fix it before committing. If it cannot be safely fixed, stop and report instead of pushing broken code.
3. **Commit & Push**:
   - Stage intended changes (`git add -A`, verifying no secrets/untracked sensitive files).
   - Commit using Conventional Commits (`feat:`, `fix:`, `ui:`, `refactor:`, `perf:`, `chore:`, `docs:`).
   - Push to `origin main` (never force push, never overwrite GitHub history).
4. **Report**:
   - Changes implemented and files modified
   - Test and build results
   - Commit message and commit hash
   - GitHub push status (and Render auto-deploy trigger note)
