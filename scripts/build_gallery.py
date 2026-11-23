import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CASES = json.loads((ROOT / 'data/cases.json').read_text())
SITE = json.loads((ROOT / 'data/site.json').read_text()) if (ROOT / 'data/site.json').exists() else {}


def esc(value):
    return html.escape(str(value), quote=True)


def case_dir(case):
    return f"{case['number']:02d}-{case['slug']}"


def case_path(case):
    return f"cases/{case_dir(case)}"


def header(prefix=''):
    repo = SITE.get('repo_url')
    repo_button = f'<a class="button button-small" href="{esc(repo)}" target="_blank" rel="noreferrer">GitHub ↗</a>' if repo else ''
    return f'''<header class="site-header"><div class="container nav">
  <a class="brand" href="{prefix}index.html"><span class="brand-mark">S/B</span><span>SOCIAL BENCH</span></a>
  <nav class="nav-links" aria-label="Main navigation"><a href="{prefix}index.html#archive">Projects</a><a href="{prefix}index.html#about">About</a>{repo_button}</nav>
</div></header>'''


def footer(prefix=''):
    return f'''<footer class="site-footer"><div class="container footer-inner">
  <span>Social Bench · 25 creative coding experiments</span>
  <span>Source, prompts & final cuts where available · <a href="{prefix}index.html#about">Archive notes</a></span>
</div></footer>'''


def card(case):
    directory = case_path(case)
    first_video = case['videos'][0]
    badges = [f"<span>{len(case['videos'])} film{'s' if len(case['videos']) != 1 else ''}</span>"]
    badges.append('<span>Source</span>' if case['source_available'] else '<span>Demo archive</span>')
    if case['prompts']:
        badges.append('<span>Prompt</span>')
    tech = ''.join(f'<span class="tech-tag">{esc(item)}</span>' for item in case['tech'])
    search = ' '.join([case['title'], case['zh'], case['summary'], case['category_label'], *case['tech']]).lower()
    return f'''<article class="project-card" data-category="{case['category']}" data-search="{esc(search)}">
  <a class="project-poster" href="{directory}/index.html"><img src="{directory}/poster.jpg" alt="{esc(case['title'])} poster" loading="lazy"><span class="card-number">SB—{case['number']:02d}</span></a>
  <div class="card-body">
    <p class="card-category {case['category']}">{esc(case['category_label'])}</p>
    <div class="card-title-row"><h3><a href="{directory}/index.html">{esc(case['title'])}</a></h3><span class="card-zh">{esc(case['zh'])}</span></div>
    <p class="card-summary">{esc(case['summary'])}</p>
    <div class="tech-list">{tech}</div>
    <div class="card-footer">
      <div class="card-links"><button class="play-button" type="button" data-play="{directory}/{first_video['path']}" data-poster="{directory}/poster.jpg" data-title="{esc(case['title'])}" data-case="{directory}/index.html">▶ Play film</button><a class="button button-small button-ghost" href="{directory}/index.html">Details →</a></div>
      <div class="material-badges">{''.join(badges)}</div>
    </div>
  </div>
</article>'''


def build_root():
    featured = [case for case in CASES if case['featured']]
    tiles = ''.join(f'<a class="hero-tile" href="{case_path(case)}/index.html"><img src="{case_path(case)}/poster.jpg" alt="{esc(case["title"])}"><span>SB—{case["number"]:02d}</span></a>' for case in featured)
    counts = {category: sum(case['category'] == category for case in CASES) for category in ('physics', 'worlds', 'interactive')}
    video_count = sum(len(case['videos']) for case in CASES)
    source_count = sum(case['source_available'] for case in CASES)
    prompt_count = sum(bool(case['prompts']) for case in CASES)
    page = f'''<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Social Bench · Creative Coding Archive</title>
<meta name="description" content="A curated collection of 25 physics, 3D and interactive creative-coding projects, with source, prompts and final cuts where available.">
<meta property="og:title" content="Social Bench · Creative Coding Archive"><meta property="og:description" content="25 small experiments. Big little worlds."><meta property="og:image" content="assets/social-bench-banner.jpg">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="assets/styles.css">
</head><body>
{header('')}
<main>
  <section class="hero"><div class="container hero-grid">
    <div>
      <p class="eyebrow">Creative coding archive · 2026</p>
      <h1>Small experiments.<br><span class="hero-title-accent">Big little worlds.</span></h1>
      <p class="hero-copy">A curated collection of 25 physics, 3D and interactive projects — with source, prompts and final cuts where available.</p>
      <div class="hero-actions"><a class="button button-primary" href="#archive">Explore all 25 <span>↓</span></a><a class="button" href="#about">About the archive</a></div>
      <ul class="stats"><li class="stat"><strong>25</strong><span>Projects</span></li><li class="stat"><strong>{video_count}</strong><span>Final cuts</span></li><li class="stat"><strong>03</strong><span>Collections</span></li></ul>
    </div>
    <div class="hero-collage">{tiles}</div>
  </div></section>

  <section class="section" id="archive"><div class="container">
    <div class="section-heading"><div><p class="section-kicker">The complete collection</p><h2>Explore the archive</h2></div><p>Play a final cut directly, or open a project to inspect its source, prompt and implementation notes.</p></div>
    <div class="filter-panel">
      <div class="filters" role="group" aria-label="Filter projects">
        <button class="filter-button is-active" type="button" data-filter="all" aria-pressed="true">All · 25</button>
        <button class="filter-button" type="button" data-filter="physics" aria-pressed="false">Physics · {counts['physics']}</button>
        <button class="filter-button" type="button" data-filter="worlds" aria-pressed="false">3D & Motion · {counts['worlds']}</button>
        <button class="filter-button" type="button" data-filter="interactive" aria-pressed="false">Interactive · {counts['interactive']}</button>
      </div>
      <label class="search-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg><input id="project-search" type="search" placeholder="Search projects or technology…" aria-label="Search projects"></label>
    </div>
    <p class="result-meta" id="result-count">25 projects</p>
    <div class="project-grid">{''.join(card(case) for case in CASES)}</div>
    <div class="empty-state" id="empty-state" hidden><h3>No projects found</h3><p>Try another keyword or choose a different collection.</p></div>
  </div></section>

  <section class="container" id="about"><div class="archive-note">
    <div><p class="section-kicker">A note on provenance</p><h2>A project gallery,<br>not a leaderboard.</h2></div>
    <div><p>This archive preserves creative-coding and visual experiments. It is not a controlled model benchmark and does not make performance, price or ranking claims.</p><p>Some historical comparison cuts include reference or user-provided footage. Source code and original prompts are included only when their provenance could be verified: {source_count} projects include source material and {prompt_count} include prompt archives.</p><p>Public reference posts remain linked on each project page. Third-party footage, characters and trademarks belong to their respective owners; generated recreations are not presented as original-author source code.</p></div>
  </div></section>
</main>
{footer('')}
<dialog class="video-dialog" id="video-dialog"><div class="dialog-header"><div><h2 id="dialog-title"></h2><a id="dialog-case-link" href="#">Open project details →</a></div><button class="dialog-close" type="button" data-close-dialog aria-label="Close video">✕</button></div><video controls playsinline preload="metadata"></video></dialog>
<script src="assets/app.js"></script>
</body></html>'''
    (ROOT / 'index.html').write_text('\n'.join(line.rstrip() for line in page.splitlines()) + '\n')


def build_case(case):
    directory = case_dir(case)
    target = ROOT / 'cases' / directory
    apps = ''.join(f'<a class="button button-primary" href="{esc(app["path"])}">{esc(app["label"])} ↗</a>' for app in case['apps'])
    source_button = '<a class="button" href="source.html">Browse source files →</a>' if case['source_available'] else ''
    videos = ''.join(f'<div><div class="video-frame"><video controls playsinline preload="none" poster="poster.jpg" src="{esc(video["path"])}"></video></div><p class="video-label">{esc(video["label"])} · MP4</p></div>' for video in case['videos'])
    prompts = ''.join(f'<details class="prompt-block"><summary>{esc(prompt["label"])}</summary><pre>{esc(prompt["text"])}</pre></details>' for prompt in case['prompts'])
    prompt_section = f'<section class="prompt-section"><div class="section-heading"><div><p class="section-kicker">Prompt archive</p><h2>From brief to build</h2></div></div>{prompts}</section>' if prompts else ''
    source_text = case['source_scope'] if case['source_available'] else 'This project is preserved as a final video archive. No verified source package was found; no substitute source is claimed.'
    prompt_text = f'{len(case["prompts"])} original prompt section{"s" if len(case["prompts"]) != 1 else ""}' if case['prompts'] else 'No public prompt in the source record'
    page = f'''<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{esc(case['title'])} · Social Bench</title>
<meta name="description" content="{esc(case['summary'])}"><link rel="icon" href="../../assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="../../assets/styles.css">
</head><body>{header('../../')}
<main class="container">
  <section class="case-hero"><a class="breadcrumb" href="../../index.html#archive">← Back to all projects</a><p class="eyebrow">SB—{case['number']:02d} · {esc(case['category_label'])}</p><h1>{esc(case['title'])}</h1><p class="case-zh">{esc(case['zh'])}</p><p class="case-summary">{esc(case['summary'])}</p><div class="case-actions">{apps}{source_button}<a class="button" href="{esc(case['reference'])}" target="_blank" rel="noreferrer">Public reference ↗</a></div></section>
  <div class="case-layout"><div class="video-stack">{videos}</div><aside class="case-sidebar">
    <section class="info-card"><h2>Project materials</h2><ul class="info-list"><li><strong>{len(case['videos'])}</strong> final presentation{'s' if len(case['videos']) != 1 else ''}</li><li>{'Verified source material' if case['source_available'] else 'Demo-only archive'}</li><li>{prompt_text}</li></ul></section>
    <section class="info-card"><h2>Source notes</h2><p>{esc(source_text)}</p>{source_button}</section>
    <section class="info-card"><h2>Techniques</h2><div class="tech-list">{''.join(f'<span class="tech-tag">{esc(item)}</span>' for item in case['tech'])}</div><p>{esc(case['archive_note'])}</p></section>
  </aside></div>
  {prompt_section}
</main>{footer('../../')}<script src="../../assets/app.js"></script></body></html>'''
    (target / 'index.html').write_text('\n'.join(line.rstrip() for line in page.splitlines()) + '\n')
    build_source_page(case, target)


def build_source_page(case, target):
    if not case['source_available']:
        (target / 'source.html').unlink(missing_ok=True)
        return
    source_root = target / 'source'
    files = sorted(path for path in source_root.rglob('*') if path.is_file())
    rows = ''.join(f'<li><a href="source/{path.relative_to(source_root).as_posix()}">{path.relative_to(source_root).as_posix()}</a><small>{path.stat().st_size / 1024:.0f} KB</small></li>' for path in files)
    apps = ''.join(f'<a class="button button-primary" href="{esc(app["path"])}">{esc(app["label"])} ↗</a>' for app in case['apps'])
    page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Source · {esc(case['title'])} · Social Bench</title><link rel="icon" href="../../assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="../../assets/styles.css"></head><body>{header('../../')}
<main class="container"><section class="case-hero"><a class="breadcrumb" href="index.html">← Back to {esc(case['title'])}</a><p class="eyebrow">SB—{case['number']:02d} · Source archive</p><h1>Source files</h1><p class="case-summary">{esc(case['source_scope'])}</p><div class="case-actions">{apps}<a class="button" href="index.html">Watch the final cut</a></div></section>
<section class="section"><div class="section-heading"><div><p class="section-kicker">{len(files)} files</p><h2>Package contents</h2></div><p>Files open directly when the browser supports their format. Buildable projects retain their original manifests.</p></div><div class="info-card"><ul class="source-list">{rows}</ul></div></section>
</main>{footer('../../')}</body></html>'''
    (target / 'source.html').write_text('\n'.join(line.rstrip() for line in page.splitlines()) + '\n')


def build_readme():
    video_count = sum(len(case['videos']) for case in CASES)
    source_count = sum(case['source_available'] for case in CASES)
    prompt_count = sum(bool(case['prompts']) for case in CASES)
    gallery = SITE.get('pages_url')
    gallery_link = f'[**Open the interactive gallery →**]({gallery})' if gallery else '[**Browse the complete archive →**](#complete-archive)'
    featured = [case for case in CASES if case['featured']]
    rows = []
    for index in range(0, len(featured), 2):
        cells = []
        for case in featured[index:index + 2]:
            cells.append(f'<a href="{case_path(case)}/"><img src="{case_path(case)}/poster.jpg" width="100%" alt="{esc(case["title"])}"></a><br><strong>{esc(case["title"])}</strong><br><sub>{esc(case["summary"])}</sub>')
        rows.append('<tr>' + ''.join(f'<td width="50%" valign="top">{cell}</td>' for cell in cells) + '</tr>')
    archive_rows = []
    for case in CASES:
        materials = [f'{len(case["videos"])} video{"s" if len(case["videos"]) != 1 else ""}', 'Source' if case['source_available'] else 'Demo only', 'Prompt' if case['prompts'] else 'No public prompt']
        archive_rows.append(f'| {case["number"]:02d} | [**{case["title"]}**]({case_path(case)}/) · {case["zh"]} | {case["category_label"]} | {" · ".join(materials)} |')
    page = f'''![Social Bench — 25 creative coding experiments](assets/social-bench-banner.jpg)

# Social Bench · Creative Coding Archive

A curated collection of **25 physics, 3D and interactive projects**, with **{video_count} final presentation cuts**, verified source material for **{source_count} projects**, and original prompt archives for **{prompt_count} projects**.

{gallery_link}

## Selected works

<table>{''.join(rows)}</table>

## Complete archive

| # | Project | Collection | Materials |
|---:|---|---|---|
{chr(10).join(archive_rows)}

## Explore locally

No framework, package install or build step is needed for the gallery:

```bash
git clone https://github.com/annieshuyuez22-rgb/social-bench.git
cd social-bench
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000`. You can search and filter projects, play final cuts, and open individual project pages. Standalone browser apps live under their project's `source/` directory; TypeScript projects retain their manifests and production builds where available.

```text
cases/
  01-demolition-physics/
    README.md          # project notes
    index.html         # gallery detail page
    prompt.md          # included when publicly available
    poster.jpg
    demo.mp4
    source/            # included only for verified source packages
  ...
assets/                # gallery styles, scripts and cover art
data/cases.json        # public project metadata
scripts/build_gallery.py
```

## Archive notes

This is a **creative-coding showcase, not a controlled model benchmark**. It does not make performance, price or ranking claims.

- Historical comparison cuts may include reference or user-provided footage.
- Source is included only where a trustworthy project package could be matched. Missing source is labeled **Demo only**; no look-alike substitute is presented as the original.
- Public reference posts are linked from each project README. Generated recreations are not original-author source code.
- Internal review notes, attachment tokens, private project IDs, operational data and unrelated work files are intentionally excluded.
- Third-party footage, characters and trademarks remain the property of their respective owners. No blanket license is granted for third-party material.

## Rebuild the gallery

```bash
python3 scripts/build_gallery.py
```

The build uses only the Python standard library and the public metadata in `data/cases.json`.
'''
    (ROOT / 'README.md').write_text('\n'.join(line.rstrip() for line in page.splitlines()) + '\n')


def build_case_readmes():
    for case in CASES:
        directory = case_dir(case)
        videos = '\n'.join(f'- [{video["label"]}]({video["path"]})' for video in case['videos'])
        apps = '\n'.join(f'- [{app["label"]}]({app["path"]})' for app in case['apps'])
        source = f'## Source\n\n{case["source_scope"]}\n\n[Browse the source package](source.html)\n' if case['source_available'] else '## Source\n\nNo verified source package was found. This entry is preserved as a demo archive without claiming substitute source.\n'
        prompts = '\n## Prompt archive\n\n[Read the original prompt sections](prompt.md)\n' if case['prompts'] else '\n## Prompt archive\n\nNo public prompt was present in the source record.\n'
        page = f'''# {case['title']} · {case['zh']}

![{case['title']}](poster.jpg)

{case['summary']}

**Collection:** {case['category_label']} / {case['category_zh']}

**Techniques:** {', '.join(case['tech'])}

## Final presentations

{videos}

{apps}

{source}
{prompts}
## Public reference

{case['reference']}

## Archive note

{case['archive_note']} Generated recreations are not original-author source code. Third-party footage, characters and trademarks belong to their respective owners.
'''
        (ROOT / 'cases' / directory / 'README.md').write_text('\n'.join(line.rstrip() for line in page.splitlines()) + '\n')


def main():
    build_root()
    for case in CASES:
        build_case(case)
    build_readme()
    build_case_readmes()
    print(f'Built gallery, README and detail pages for {len(CASES)} projects.')


if __name__ == '__main__':
    main()
