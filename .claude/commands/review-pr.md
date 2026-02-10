# Review PR Comments

Review and address PR review comments for this repository.

> **Note:** This extends the global `/review-pr` command with project-specific checks.

## Arguments

- `$ARGUMENTS` - PR number (e.g., `123`) or PR URL

## Project-Specific Build Commands

Based on changed files, run these checks BEFORE committing:

| Path | Commands |
| --- | --- |
| `src/` | `bun run lint && bun run typecheck && bun run test` |
| `ios/` | `cd example && bun run ios --no-launch` (requires Xcode) |
| `android/` | `cd example && bun run android --no-launch` (requires Android Studio) |
| `example/` | `cd example && bun run lint && bun run typecheck && bun run test` |

**Important:** Always run both root and example tests:

```bash
bun run test
cd example && bun run test
```

## Project Conventions

When reviewing and fixing, check these project-specific rules:

### Naming Conventions

- **iOS fields/functions**: Must end with `IOS` suffix (e.g., `currencyCodeIOS`, `getStorefrontIOS`)
- **Android fields/functions**: Must end with `Android` suffix (e.g., `nameAndroid`, `deepLinkToSubscriptionsAndroid`)
- **ID fields**: Use `Id` not `ID` (e.g., `productId`, `transactionId`)
- **Type names**: Use `Iap` prefix (e.g., `IapPurchase`), iOS suffix `IOS`, Android prefix `ProductAndroid...`

### Files NOT to Edit

- `src/types.ts` - Generated from OpenIAP schema, run `bun run generate:types` instead
- `ios/ExpoIap.podspec` - iOS version must stay at `13.4` (see CLAUDE.md)

### Error Codes

- Use `ErrorCode` enum, NOT string literals
- Format is kebab-case: `'user-cancelled'` not `'E_USER_CANCELLED'`

See [CLAUDE.md](../../CLAUDE.md) for full conventions.

## Workflow

### Step 1: Get PR Information

```bash
# Get PR review comments
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments

# Get PR reviews (approve, request changes, etc.)
gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews

# Get changed files
gh pr view {pr_number} --json files
```

### Step 2: Analyze Each Comment

For each review comment:

1. `path` - File path
2. `line` or `original_line` - Line number
3. `body` - Review content
4. `diff_hunk` - Code context
5. Determine if code change is needed

### Step 3: Apply Fixes

1. Read the target file
2. Apply changes per reviewer feedback
3. Track changes with TodoWrite
4. Run project-specific checks

### Step 4: Run Checks Before Commit

```bash
# Always run these
bun run lint
bun run typecheck
bun run test

# If example/ changed
cd example && bun run test
```

### Step 5: Commit Changes

```bash
git add <changed-files>
git commit -m "$(cat <<'EOF'
fix: address PR review comments

- <summary of change 1>
- <summary of change 2>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

### Step 6: Reply to Comments

Reply to each addressed comment:

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments/{comment_id}/replies \
  -X POST -f body="Fixed in abc1234.

**Changes:**
- Description of what was changed"
```

## Reply Format Rules (CRITICAL)

When replying to PR comments:

### Commit Hash Formatting

**NEVER wrap commit hashes in backticks or code blocks.** GitHub only auto-links plain text commit hashes.

| Format     | Example                 | Result                   |
| ---------- | ----------------------- | ------------------------ |
| ✅ CORRECT | `Fixed in f3b5fec.`     | Clickable link to commit |
| ❌ WRONG   | `Fixed in \`f3b5fec\`.` | Plain text, no link      |

**Examples of correct replies:**

```text
Fixed in f3b5fec.

**Changes:**
- Updated type definition to use IOS suffix
```

```text
Fixed in abc1234 along with other review items.
```

**Do NOT use backticks around the commit hash** - this breaks GitHub's auto-linking feature.

## Result Report

After addressing all comments, report:

- List of modified files
- Summary of changes per file
- Commit hash
- Any comments not addressed and why

## Notes

- If a comment is a question or praise, no code change needed
- If reviewer intent is unclear, ask for clarification
- Follow CLAUDE.md coding conventions strictly
- Use `bun` exclusively for all commands
