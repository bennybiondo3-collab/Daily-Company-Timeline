# Company Timeline Daily

A 5-round daily guessing game where the player picks which company was founded first.

## What is included

- Deterministic daily puzzle generation (same date = same rounds)
- Exactly 5 rounds per day (2 companies per round)
- Curated 200-company mainstream dataset (`data/companies.json`)
- Score tracking and one-click share text
- Logo URLs included for each company (`logo` field) with automatic initials fallback if an image fails to load

## Data shape

```json
{ "name": "Apple Inc.", "founded": 1976, "logo": "https://logo.clearbit.com/apple.com" }
```

## Run locally

Because the app fetches JSON, run it through a local server:

```bash
python -m http.server 8000
```

Then open:

`http://localhost:8000`

## Publish publicly (GitHub Pages)

1. Create a GitHub repository and push these files to the default branch.
2. In GitHub, open **Settings → Pages**.
3. Set source to **GitHub Actions**.
4. Push once to trigger `.github/workflows/deploy-pages.yml`.
5. Your public link will be: `https://<your-username>.github.io/<repo-name>/`
