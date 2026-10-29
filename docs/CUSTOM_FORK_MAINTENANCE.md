# Maintaining This Customised slskd Fork

This guide explains how the customised slskd fork is organised and how to keep
it up to date with upstream slskd.  It assumes you can open a terminal and run
commands, but not that you are a programmer.

## 1. What the branches mean

| Branch | Purpose |
| --- | --- |
| `master` | An exact mirror of upstream slskd (`slskd/slskd`). It is never edited by hand. |
| `custom` | Your personalised version, with both features applied. This is the branch you build releases from. |
| `feature/favourite-users` | The Favourite Users feature on its own, kept for review. |
| `feature/search-filters` | The improved Search feature on its own, kept for review. |
| `integration/favourite-users-and-search-filters` | A local integration branch used while the features were being combined. |
| `update/upstream-YYYYMMDD-<sha>` | Temporary candidate branches created by the update script. |

`master` tracks upstream.  `custom` is where your changes live.  The two feature
branches are kept so each improvement can be reviewed independently.

## 2. How upstream updates are detected

A local script, `bin/check-upstream-update`, fetches the latest upstream
commits and compares them with `custom`:

```
bin/check-upstream-update
```

If upstream has not changed, it prints "No new upstream commits. Nothing to do."
and exits.  If upstream has changed, it prints the new commits and creates a
candidate branch for review.  It never changes `master` or `custom`.

A GitHub Actions workflow (`.github/workflows/update-upstream.yml`) can do the
same thing manually from the Actions tab of your fork.  It is intentionally
**manual only** (`workflow_dispatch`), because scheduled workflows run from the
repository's default branch, and `master` must stay a clean upstream mirror.

## 3. How to review a proposed update

When new upstream commits exist, the script or workflow creates a candidate
branch named `update/upstream-YYYYMMDD-<sha>` based on `custom`, with upstream
merged into it.

Review the candidate the same way you would review any branch:

```
git checkout update/upstream-YYYYMMDD-<sha>
git log --oneline custom..HEAD
git diff custom..HEAD
```

The workflow also opens a pull request targeting `custom` for review.

## 4. How conflicts are handled

- The script attempts the merge automatically.
- If the merge is clean, it continues to the tests and build.
- If there are conflicts, it stops, leaves the candidate branch in place with
  the conflicts, and reports the conflicting files.  You resolve them by hand,
  commit, and then run the tests yourself.
- `custom` and `master` are never modified by the script, so a failed merge
  cannot damage your working version.

## 5. Tests and builds

The web frontend has its own test suite:

```
cd src/web
npm ci
npm run test-unattended        # run the unit tests
npm run lint                   # lint check
npm run build                  # production web build
```

The .NET backend:

```
dotnet test --configuration Release tests/slskd.Tests.Unit
```

Everything together:

```
bin/build                      # web + dotnet, with tests
bin/package-release            # produce a release archive
```

`bin/check-upstream-update` runs all of the above automatically.

## 6. How to download and run a new custom release

After an update is merged into `custom`:

```
bin/package-release
```

This produces a self-contained Linux x64 release in
`~/Downloads/slskd-custom/slskd-custom-linux-x64-<version>/` and a matching
archive `slskd-custom-linux-x64-<version>.tar.gz`, including the launcher and
README.  Previous releases are kept alongside it for rollback.

Run it with:

```
~/Downloads/slskd-custom/slskd-custom-linux-x64-<version>/start.sh
```

The new version reads your existing configuration (`~/.local/share/slskd/slskd.yml`)
and application data (`~/.local/share/slskd/data`) automatically.

## 7. How to roll back

Each release lives in its own directory, so the previous one is never
overwritten.  To roll back, simply run the launcher from the previous release
directory:

```
~/Downloads/slskd-custom/slskd-custom-linux-x64-<previous-version>/start.sh
```

Or stop the new instance and start your original `~/Downloads/sls/slskd`.

## 8. How to disable automated update checks

The GitHub Actions workflow is manual only by default.  To disable it entirely,
delete or rename `.github/workflows/update-upstream.yml` on the `custom`
branch.  The local script (`bin/check-upstream-update`) only runs when you
invoke it, so it never acts on its own.

## Scheduling options (require approval)

If you later want automatic weekly checks, one of these is needed:

1. Change the repository's default branch to `custom` (Settings -> Branches),
   then uncomment the `schedule:` block in the workflow.
2. Use a separate automation branch as the default branch.
3. Trigger the workflow manually from the Actions tab.

Changing the default branch affects how GitHub presents the repository and
requires explicit approval, which is why it is not done automatically.

## Command reference

| Task | Command |
| --- | --- |
| Check for upstream updates | `bin/check-upstream-update` |
| Run web tests | `cd src/web && npm run test-unattended` |
| Run lint | `cd src/web && npm run lint` |
| Run .NET tests | `dotnet test --configuration Release tests/slskd.Tests.Unit` |
| Build everything | `bin/build` |
| Package a release | `bin/package-release` |
| Start custom build | `~/Downloads/slskd-custom/slskd-custom-linux-x64/start.sh` |

## Notes

- `master` is a clean mirror of upstream.  Do not commit custom changes to it.
- `custom` is the branch that is built and released.
- Feature branches are kept for review; future improvements should start from
  `custom` (or from `master` and then be merged into `custom`).
- No credentials or configuration files are ever committed to Git.  The
  application reads them from `~/.local/share/slskd/` at runtime.
