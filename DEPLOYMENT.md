# Git and Cloudflare Pages Deployment

This app is a static Vite site. Cloudflare Pages can build it from GitHub and host the generated `dist` directory.

## 1. Check the project locally

Run these before committing:

```sh
npm install
npm run test
npm run build
```

## 2. Turn this folder into a Git repo

From the project root:

```sh
git init
git add .
git commit -m "Initial Mr White web app"
git branch -M main
```

## 3. Create a GitHub repository

Option A, with the GitHub CLI:

```sh
gh repo create monsieur-blanc --private --source=. --remote=origin --push
```

Option B, from github.com:

1. Create a new empty repository.
2. Copy the repository URL.
3. Connect and push:

```sh
git remote add origin git@github.com:YOUR_USERNAME/monsieur-blanc.git
git push -u origin main
```

Use the HTTPS remote instead if you do not use SSH keys.

## 4. Deploy on Cloudflare Pages

1. Open the Cloudflare dashboard.
2. Go to Workers & Pages.
3. Create a Pages app by importing an existing Git repository.
4. Select the GitHub repo for this project.
5. Use these build settings:

```text
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: /
```

6. Save and deploy.

Cloudflare Pages will deploy the app to a `pages.dev` URL and rebuild automatically when you push new commits to the connected branch.

## 5. Update the deployed app

After making changes:

```sh
npm run test
npm run build
git status
git add .
git commit -m "Describe the change"
git push
```

Cloudflare will pick up the pushed commit and start a new deployment.

## References

- Cloudflare Vite Pages guide: https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/
- Cloudflare Git integration guide: https://developers.cloudflare.com/pages/get-started/git-integration/
- Cloudflare GitHub integration docs: https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/
