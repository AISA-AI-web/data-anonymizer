# Student Data Anonymizer

A web app that lets teachers use AI tools to analyse student spreadsheets **without the AI ever seeing who the students are**, and then puts the real names back into the AI's results.

1. **Anonymize.** Upload a CSV or Excel file. The app reads the column headings and suggests what to do with each column: replace names and IDs with codes like `STU-004`, remove emails, phone numbers, Emirates IDs and medical or SEN details, or reduce dates of birth to the year. You decide; the suggestions are only a starting point.
2. **Check.** A review screen flags anything risky that is left: contact details still in the data, high-risk columns you chose to keep, and students who could be singled out by a combination of columns (for example, gender + nationality + section). A checklist must be completed before anything can be downloaded.
3. **Share.** Download the anonymized file for the AI, plus a private **key file** (optionally locked with a passphrase) that records which code belongs to which student. The app also gives you instructions to paste into the AI so it keeps the codes intact.
4. **Re-identify.** Bring the AI's answer back (a CSV/Excel/text file, or pasted text) with the key, and every code turns back into the real name.

Try it without real data: on the first screen, click **Try it with a made-up class list**.

New users can watch the **Video tutorial** or open the step-by-step **[user guide (PDF)](public/user-guide.pdf)**, both from buttons in the app's header. The guide uses only made-up student data.

## Privacy model

- **Nothing leaves the browser.** Files are read and processed locally in JavaScript. There is no server, database, analytics or tracking.
- The built page has a Content Security Policy with `connect-src 'none'`, so the browser itself blocks the page from sending data anywhere, even if a bug or a dependency tried to.
- Fonts are bundled with the app, so no requests go to Google Fonts or any other CDN.
- The video tutorial is played by Google Drive's embedded player. It loads only when someone presses play, and the security policy allows frames from `drive.google.com` and nowhere else. The player is a separate, isolated page, so it cannot see anything in the app. The video's address is `TUTORIAL_VIDEO` in `src/lib/policy.ts`.
- The key exists only in the tab's memory and in the file you download. If you set a passphrase, the key file is encrypted with AES-256-GCM using a key derived from the passphrase (PBKDF2-SHA-256, 600,000 iterations) through the browser's Web Crypto API.
- Codes are assigned in random order, so `STU-001` does not reveal alphabetical or list position. Output file names are neutral, because original file names often contain a student's or class's name.

This is **pseudonymization**, not full anonymization: whoever holds the key can re-identify students, so both files still need care.

## Policies, and keeping confidential documents private

The guidance in the app (`src/lib/policy.ts`) is written in our own words and cites only **public** sources:

- [ADEK School Digital Policy v1.1](https://www.adek.gov.ae/-/media/Project/TAMM/ADEK/Policies/School-Policies/Health-safety-and-wellbeing/ADEK_S_Digital-Policy_EN.pdf), mainly the definition of personal information and sections 4.1, 5.5, 6.1 and 7.1
- [UAE Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data (PDPL)](https://uaelegislation.gov.ae/en/legislations/1972)

**This repository is public, and the deployed website is public whatever the repository's visibility.** Anything committed here, or bundled into the site, can be read by anyone. Never commit confidential or draft policy documents, or text copied from them. The `.gitignore` blocks `*.pdf`, `*.docx` and `policies/` as a safety net.

To point staff to an internal policy, keep the document in access-controlled storage (for example a Google Drive file shared only with the school domain) and link to it:

1. In GitHub, go to **Settings → Secrets and variables → Actions → Variables** and add a repository variable named `VITE_POLICY_LINKS`:
   ```json
   [{"title":"School AI & data policy (staff only)","url":"https://drive.google.com/file/d/…/view","note":"Sign in with your school account"}]
   ```
2. Re-run the **Deploy to GitHub Pages** workflow.

The links appear on the **Guidance & policy** tab. The link text and URL are visible to anyone, but only signed-in staff can open the document. Use a neutral title.

## Deploying

### GitHub Pages (free for public repositories)

1. Merge to `main`.
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions** (one time only).
3. The **Deploy to GitHub Pages** workflow builds, tests and publishes the site to `https://<owner>.github.io/data-anonymizer/`.

### Keeping the repository private

GitHub Pages on a private repository needs a paid GitHub plan. Instead, connect the repository to Netlify, Vercel or Cloudflare Pages (free tiers support private repositories) with:

- Build command: `npm run build`
- Output directory: `dist`
- Node version: 24

### Any static web server

`npm run build` produces a static `dist/` folder that can be hosted on any web server, including an internal school server.

## Developing

Requires Node 24 (npm 11).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (detection, anonymization, re-identification, key encryption, file I/O)
npm run build      # type-check and build to dist/
npm run preview    # serve the production build locally
```

### Project structure

```
src/
  lib/
    fileio.ts       Read CSV/TSV/XLSX (auto-detects type, delimiter, encoding, header row); write CSV/XLSX
    detect.ts       Column classification from headings (English + Arabic) and value patterns
    anonymize.ts    Codes, removal, year-only dates, names inside comments, redaction of contact details
    reidentify.ts   Swap codes back (tolerates AI changes like "stu_004"); CSV/XLSX/TXT/MD/JSON/HTML
    keyfile.ts      Key file format and optional passphrase encryption
    risk.ts         Combination (re-identification) risk and leftover contact-detail checks
    policy.ts       Checklist, guidance text and public policy references
    sample.ts       Made-up class list for demos
  components/       React UI
```

## Limitations

- Suggestions are automated and can be wrong or incomplete. Human judgement decides what is shared.
- Names inside free text are caught only if they appear in a column you replace with codes. Nicknames, misspellings, siblings, staff and places are not caught.
- Hidden rows and columns are included like any others. Excel formatting, formulas, cell comments and other sheets are not carried over (values only). Old `.xls` files must be saved as `.xlsx` first.
- AI tools sometimes change or invent codes. Unknown codes are flagged on the results screen.
