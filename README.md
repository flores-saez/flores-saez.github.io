# CSL Site Health Dashboard — static build

Per-project flow-monitoring health pages: for each project it reads a CSV, analyses the
trailing 14 days, flags problem sites, and charts level + velocity per site.

This is the **static / GitHub Pages** version — pages read their data from local `data/<CODE>.csv`
files via `fetch()` (no Cowork/Drive connection needed).

## Viewing it
`fetch()` of local files is blocked on the `file://` protocol, so **serve it over http/https**:
- **GitHub Pages:** push this folder to a repo, then Settings → Pages → deploy from branch
  (root). Open the Pages URL — `index.html` is the menu.
- **Locally:** from this folder run `python -m http.server` and open http://localhost:8000
  (double-clicking `index.html` will NOT load data).

## Data
Put each project's latest export in `data/<CODE>.csv`:

| Code | Project | Code | Project |
|---|---|---|---|
| OR | Oak Ridge TN | FC | Forsyth Co GA |
| AR | Arab AL | SM | Smyrna TN |
| CL | Cleveland TN | AU | Auburn AL |
| GV | Goodlettsville TN | OK | Okaloosa Co FL |
| GR | Greenbrier TN | USA | USA AL |
| TU | Tuscaloosa AL | GAT | Gatlinburg TN |
| COL | Columbia TN | JA | Jackson MS |

`data/OR.csv` is **DEMO data** so the Oak Ridge page renders out of the box — replace it with a
real export. A project with no data file shows an "awaiting data" card / page.

The Telog export you download is named like `Cleveland_CSV(2026-07-22_082220).csv`; rename (or have
a script copy) the latest one to `data/CL.csv`, etc. A GitHub Action or a scheduled copy can keep
these fresh automatically.

## Structure
```
index.html          menu / status board (links to each project page)
projects/<code>.html one page per project (charts + flags)
data/<CODE>.csv      per-project export (you provide; OR.csv is demo)
src/                 source used to regenerate the project pages
README.md
```

## Regenerating the project pages
```
cd src && node build_static.js     # rewrites ../projects/<code>.html from static_template.html + projects.js
```
Add/edit a project in `src/projects.js`, rerun, commit.

## Flag rules (edit CONFIG at the top of each page or src/static_template.html)
- **Offline** — a site with a Call Log channel silent > 48 h, OR any site with no data of any kind > 48 h.
- **Low battery** — latest Local Battery < 3.5 V.
- **Out of range** — latest level beyond Q1/Q3 ± 3×IQR, or flatlined for 12+ readings.

Charts use Chart.js from CDN; everything else is self-contained.
