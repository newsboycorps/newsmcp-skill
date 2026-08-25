# Contributing

Contributions are welcome through pull requests.

## Workflow

1. Fork this repository.
2. Create a branch in your fork.
3. Make a focused change and add or update tests when behavior changes.
4. Run the release checks.

   ```bash
   pnpm install --frozen-lockfile
   pnpm release:check
   ```

5. Open a pull request against `main` with a concise description of the change.

Do not include credentials, tokens, local configuration, private documents, or
personal filesystem paths. Maintainers review and merge accepted changes; a pull
request does not grant write or release access.

## Releases

Only maintainers publish Git tags, GitHub releases, npm packages, or marketplace
updates. Contributors should not change the package version unless requested in
an issue or pull request review.
