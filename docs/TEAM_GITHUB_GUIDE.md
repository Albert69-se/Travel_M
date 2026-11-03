# TravelM setup and contribution guide

This guide helps Team Apollo clone, run, test and contribute to TravelM on macOS and Windows. Testing, documentation, design, diagrams and project coordination are meaningful contributions alongside code.

**Repository:** https://github.com/Albert69-se/Travel_M. It is private: the owner must invite your GitHub account and you must accept before opening or cloning it. If you see a 404, confirm the signed-in account and invitation with the owner.

> The maintainer must commit and push the current local work before teammates can see it on GitHub. A clone contains published commits, not another person's uncommitted files.

## 1. Install the tools

1. Sign in to your own [GitHub account](https://github.com/) and accept the repository invitation. Do not share accounts or passwords.
2. Install [Git](https://git-scm.com/downloads). On Windows, Git for Windows also includes Git Bash; default installer choices are suitable. On macOS, Git may already be installed or macOS may offer command-line developer tools when you run Git.
3. Install Node.js, including npm, from the [official download page](https://nodejs.org/en/download). This project was checked locally with Node **22.22.3**. The installed Vite requires Node `^20.19.0` or `>=22.12.0`; choose a supported LTS release meeting this requirement and the installer matching your computer.
4. Optionally install [Visual Studio Code](https://code.visualstudio.com/) to edit files and [GitHub Desktop](https://desktop.github.com/) for a graphical Git workflow. Sign in to Desktop using your own account.
5. Close and reopen your terminal. On a Mac, open **Terminal** from Applications → Utilities or Spotlight. On Windows, open **Command Prompt** from the Start menu. Check:

   ```text
   git --version
   node --version
   npm --version
   ```

   Each should print a version. If a command is not recognized, reopen the terminal and check the installation.

## 2. Clone the repository

A clone is a local copy of the repository and its Git history. Choose a folder for your projects and run:

```bash
git clone https://github.com/Albert69-se/Travel_M.git
cd Travel_M
```

If prompted, complete the GitHub sign-in flow offered by your credential manager or GitHub Desktop. GitHub does not accept your account password as the password for Git over HTTPS. See [GitHub authentication](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-authentication-to-github). Do not paste tokens in chat or put credentials in a URL.

Alternatively, in GitHub Desktop choose **File → Clone repository**, select `Albert69-se/Travel_M`, choose a local folder and select **Clone**. If it is missing, check your invitation and signed-in account. Use **Repository → Open in Command Prompt/Terminal** to run the commands below. In VS Code, use **File → Open Folder** and select the clone.

Clone once per computer. If the folder already exists, enter it with `cd Travel_M` instead of cloning over it. Run project commands from the folder containing `package.json`.

## 3. Run the app

From inside `Travel_M`, run:

```bash
npm ci
npm run dev
```

- `npm ci` installs the versions recorded in the lockfile and requires internet. Run it after the first clone and when dependencies change. It replaces the existing `node_modules` installation.
- Open the **Local** address printed by Vite, normally `http://localhost:5173`. If that port is busy, use the different address it prints. Keep the terminal open while using the app.
- To stop the server, focus the terminal and press **Ctrl+C** on either operating system. If Command Prompt asks to terminate the batch job, answer `Y`.
- Do not open `index.html` by double-clicking it; the app needs the development server to resolve its modules and routes.

Select **Try the demo** on the home page for a sample trip. Data is stored in that browser's local storage: it is not synchronized across devices, and clearing browser site data can remove it. The demo accounts are prototype-only and do not provide production-grade security. Existing browser data may change what you see.

Maps, places, photos and weather can depend on external providers and internet access. Google Maps may need an authorized local key; other parts of the app can be explored without one, while provider-dependent features may show an unavailable state. Ask the maintainer about approved configuration. Never put API keys or passwords in issues, commits, screenshots or chat. Although `.env.local` is ignored by Git, browser-exposed `VITE_` values are visible in a built app.

For team practice, select **Show FR debug mode** in the footer. The guide explains the M2 SRS requirements and red outlines identify related areas. It is off by default and resets on reload; labels are not proof of passing tests.

## 4. Check your work

In another terminal opened in `Travel_M`, or after stopping the development server, run:

```bash
npm test
npm run lint
npm run build
```

`npm test` runs automated tests, lint checks code issues, and build creates `dist/`. Report failures and warnings to your reviewer. A passing build alone does not prove every browser flow works. For a manual test, record the date, browser, starting state, steps, expected result and actual result. Only mark a test passed if you ran it. For documentation or diagrams, proofread and open the result to check it displays correctly.

## 5. Set your commit identity

From inside the clone, set **your own** name and a verified email associated with your GitHub account, or your GitHub-provided `noreply` email:

```bash
git config user.name "Your Name"
git config user.email "your-verified-github-email@example.com"
git config user.name
git config user.email
```

Replace the examples and check the printed values. Without `--global`, this applies only to this clone. See [GitHub's commit email guide](https://docs.github.com/en/get-started/git-basics/setting-your-commit-email-address). This setting does not sign you in or grant access. Credit must reflect work you actually did.

## 6. Make a contribution using Git

Agree on a small task first: for example, test packing and record real results, fix a typo, improve a diagram, or fix one bug. Ask for help before changing unfamiliar code.

1. **Start with current `main`.** Run `git status`. If there are uncommitted changes you need to keep, ask the maintainer before switching branches or pulling.

   ```bash
   git switch main
   git pull --ff-only origin main
   git switch -c docs/packing-test-notes
   ```

   Replace the branch name with one describing your task, such as `fix/expense-validation`. If the pull cannot fast-forward or reports a conflict, stop and ask for help; do not reset or force-push.

2. **Make and review your change.** Save the files and run:

   ```bash
   git status
   git diff
   ```

   `git diff` shows tracked changes; open new untracked files in your editor too. Check for unrelated edits, secrets and private information. If a secret was committed, tell the maintainer immediately: deleting it in a later commit does not remove it from history.

3. **Run the relevant checks** from section 4. Stage only files belonging to your task, replacing the example path with your actual file:

   ```bash
   git add docs/your-test-notes.md
   git diff --cached
   git commit -m "docs: record packing test results"
   ```

   `git add` selects changes for the next commit, `git diff --cached` shows what is staged, and `git commit` records them locally. Put paths containing spaces in quotes. Stage other relevant files explicitly with `git add path/to/file`. Do not commit `node_modules`, `dist`, `.env` files, credentials or unrelated work.

4. **Publish your branch**, substituting your branch name:

   ```bash
   git push -u origin docs/packing-test-notes
   ```

   If access or authentication fails, check the invitation and account with the owner; do not use a teammate's account.

5. **Open a pull request (PR)** on the [repository](https://github.com/Albert69-se/Travel_M). GitHub may show **Compare & pull request** after a push. Choose your branch as the source and `main` as the target. Describe the problem, change, checks and limitations; link an issue if applicable. Ask a teammate to review; an authorized maintainer can merge after review.

6. **After the PR is merged**, update `main` before the next task:

   ```bash
   git switch main
   git pull --ff-only origin main
   ```

   Create a new branch for the next task. `git status` shows your branch and uncommitted work. Keep unrelated changes in separate PRs.

## 7. GitHub Desktop and website alternatives

**GitHub Desktop:** fetch/pull the latest `main`, choose **Branch → New branch**, and edit files. Review the changes in Desktop, write a truthful summary and commit to the branch. Select **Publish branch** or **Push origin**, then **Create Pull Request**. Choose `main` as target and request review. Menu wording may vary by version.

**GitHub website:** for a small documentation edit, open the file, select the pencil icon, make the change and preview it. Choose **Commit changes**, create a new branch when offered, and open a PR. You can also open an issue describing a bug or actual test findings, including reproduction steps and results. Ask the owner if you lack access.

Each member should perform and explain their own work. Reviewers should review the actual change and record their own feedback. Do not manufacture commits, backdate work or claim someone else's contribution. Record AI assistance honestly and verify generated work.

## Troubleshooting

| Problem | What to try |
| --- | --- |
| Repository not found / 404 | Check the exact URL, signed-in account, accepted invitation and access with the owner. |
| `git`, `node` or `npm` not recognized | Finish installation, reopen the terminal and repeat the version checks. |
| Windows PowerShell blocks `npm.ps1` | Open **Command Prompt** and run the same npm commands there; no system execution-policy change is needed. |
| Unsupported Node version | Check `node --version`, install a supported version, reopen the terminal and run `npm ci`. |
| `npm ci` fails | Check internet and that `package.json` and `package-lock.json` are in the current folder. Share the error with the maintainer after removing secrets. |
| Port already in use | Open the Local address Vite prints, or stop the other server in its own terminal. |
| Maps or weather fail | Check the network and the app's message. Provider access/configuration may be unavailable; record the actual result. |
| Push rejected, conflict or pull cannot fast-forward | Stop and ask for help reconciling changes. Do not force-push, reset or delete someone else's work. |
| New dependency needed | Ask the maintainer before adding or changing production dependencies. |

For course requirements and open checks, see [COURSE_TRACEABILITY.md](COURSE_TRACEABILITY.md).
