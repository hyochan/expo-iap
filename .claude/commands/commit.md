# Commit Changes

Complete workflow: branch → commit → push → PR

## Usage

```
/commit [options]
```

**Options:**

- `--push` or `-p`: Push to remote after commit
- `--pr`: Create PR after push
- `--all` or `-a`: Commit all changes at once
- `<path>`: Commit only specific path (e.g., `ios`, `android`, `src`)

## Examples

```bash
# Full workflow: commit src changes, push, create PR
/commit src --pr

# Commit all and create PR
/commit --all --pr

# Just commit specific path
/commit ios
```

## Complete Workflow

### 1. Check Branch

```bash
# Check current branch
git branch --show-current
```

**If on `main`** → Create a feature branch first:

```bash
git checkout -b feat/<feature-name>
```

**If NOT on `main`** → Proceed with commits directly.

**Branch naming conventions:**

- `feat/<feature-name>` - New features
- `fix/<bug-description>` - Bug fixes
- `docs/<doc-update>` - Documentation only
- `chore/<task>` - Maintenance tasks

### 2. Pre-Commit Checks (CRITICAL)

Before staging any changes, run the following checks:

```bash
# Lint check
bun run lint

# Type check
bun run typecheck

# Run tests
bun run test

# Run example tests
cd example && bun run test && cd ..
```

**IMPORTANT:** Only proceed with commit if ALL checks pass.

### 3. Check Current Status

```bash
git status
git diff --name-only
```

### 4. Stage Changes

**TypeScript source only:**

```bash
git add src/
```

**iOS native code:**

```bash
git add ios/
```

**Android native code:**

```bash
git add android/
```

**Specific path:**

```bash
git add <path>
```

**All changes:**

```bash
git add .
```

### 5. Review Staged Changes

```bash
git diff --cached --stat
git diff --cached --name-only
```

### 6. Create Commit

Follow Angular Conventional Commit format:

```bash
git commit -m "$(cat <<'EOF'
<type>(<scope>): <description>

<body - what changed and why>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

**Commit Types:** | Type | Description | |------|-------------| | `feat` | New feature | | `fix` | Bug fix | | `docs` | Documentation only | | `refactor` | Code refactoring | | `chore` | Maintenance tasks | | `test` | Adding/updating tests | | `perf` | Performance improvement | | `style` | Code style (formatting, semicolons, etc.) |

**Scope Examples:**

- `ios` - iOS/Swift native code changes
- `android` - Android/Kotlin native code changes
- `types` - TypeScript type definitions
- `hook` - useIAP hook changes
- `example` - Example app changes
- `release` - Release related changes

### 7. Push to Remote

```bash
git push -u origin <branch-name>
```

### 8. Create Pull Request

```bash
gh pr create --title "<type>(<scope>): <description>" --body "$(cat <<'EOF'
## Summary

<1-3 bullet points describing changes>

## Changes

### <Category 1>
- Change 1
- Change 2

### <Category 2>
- Change 1

## Test plan

- [ ] `bun run lint` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run test` passes
- [ ] `cd example && bun run test` passes

🤖 Generated with [Claude Code](https://claude.ai/code)
EOF
)"
```

---

## Commit Order (CRITICAL)

When making cross-platform changes, commit in this order:

| Order | Path           | Description                            |
| ----- | -------------- | -------------------------------------- |
| 1     | `src/types.ts` | Type definitions (if manually updated) |
| 2     | `src/`         | TypeScript source code                 |
| 3     | `ios/`         | iOS/Swift native implementation        |
| 4     | `android/`     | Android/Kotlin native implementation   |
| 5     | `example/`     | Example app updates                    |
| 6     | Root files     | package.json, README, etc.             |

**IMPORTANT - Type changes should be committed first:**

```bash
# Stage ONLY type files
git add src/types.ts

# Verify - should only show types.ts
git diff --cached --name-only
# src/types.ts

# Commit type changes
git commit -m "feat(types): add new types..."
```

This order allows:

- Type definitions to be reviewed first
- Implementation to follow approved types
- Native code to implement the TypeScript interface
- Example to demonstrate the new feature

---

## Example Commit Messages

**TypeScript API update:**

```
feat(hook): add hasActiveSubscriptions method

Add helper method to check if user has any active subscriptions.
Returns Promise<boolean> for easy conditional checks.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**iOS implementation:**

```
feat(ios): implement win-back offers support

- Add WinBackOffer handling in ExpoIapHelper
- Support iOS 18+ win-back offer redemption
- Add @available annotations for version checking

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**Android implementation:**

```
feat(android): add product status enum support

- Map BillingResult codes to ProductStatusAndroid
- Return status in fetchProducts response
- Handle edge cases for unavailable products

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**Bug fix:**

```
fix(ios): resolve ambiguous Subscription type reference

Fully qualify StoreKit.Product.SubscriptionInfo.RenewalInfo.ExpirationReason
to avoid conflicts with expo-iap Subscription type.

Closes #312

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**Release commit:**

```
chore(release): 3.4.8

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

---

## Example PR Body

```markdown
## Summary

- Add win-back offers support for iOS 18+
- Add ProductStatusAndroid for Billing 8.0+ status codes
- Update useIAP hook with new offer handling

## Changes

### TypeScript (src/)

- Add `WinBackOfferInputIOS` type
- Add `ProductStatusAndroid` enum
- Update `requestPurchase` signature

### iOS (ios/)

- Implement win-back offer handling in purchase flow
- Add @available annotations for iOS 18+
- Update ExpoIapHelper with new offer types

### Android (android/)

- Map ProductStatusAndroid from BillingResult
- Return status in fetchProducts response

### Example (example/)

- Add win-back offer demo screen
- Update purchase flow example

## Test plan

- [x] `bun run lint` passes
- [x] `bun run typecheck` passes
- [x] `bun run test` passes
- [x] `cd example && bun run test` passes

🤖 Generated with [Claude Code](https://claude.ai/code)
```

---

## Quick Reference

```bash
# Full workflow from main
git checkout -b feat/my-feature

# Pre-commit checks
bun run lint && bun run typecheck && bun run test
cd example && bun run test && cd ..

# Commit in order
git add src/types.ts
git commit -m "feat(types): add new types"
git add src/
git commit -m "feat(hook): implement new feature"
git add ios/
git commit -m "feat(ios): implement new types"
git add android/
git commit -m "feat(android): implement new types"
git add example/
git commit -m "chore(example): update demo"
git add .
git commit -m "chore: update configs"

# Push and create PR
git push -u origin feat/my-feature
gh pr create --title "feat: add new feature" --body "..."
```

---

## Important Notes

- **NEVER** modify iOS platform version in `ios/ExpoIap.podspec` (must stay at `13.4`)
- **ALWAYS** run pre-commit checks before committing
- **ALWAYS** include `Co-Authored-By` footer for Claude-assisted commits
- Follow OpenIAP naming conventions for types and functions
- Use `bun` exclusively for all package management
