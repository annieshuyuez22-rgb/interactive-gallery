import json
from pathlib import Path

from build_gallery import ROOT, CASES, esc, header, footer

PROCESS = {int(number): item for number, item in json.loads((ROOT / 'data/process.json').read_text()).items()}

LEVELS = {
    'verified-iteration': ('Verified iteration', 'Source snapshots, technical logs and/or measurable checks'),
    'implementation-comparison': ('Implementation comparison', 'Real code-level variants, not a fabricated release timeline'),
    'prompt-evolution': ('Prompt evolution', 'Basic → Advanced specification refinement'),
    'source-only': ('Source study', 'Current implementation details; no earlier version claimed'),
    'final-only': ('Final presentation', 'No reliable process record found'),
}


def case_dir(case):
    return f"{case['number']:02d}-{case['slug']}"


def clean_write(path, text):
    path.write_text('\n'.join(line.rstrip() for line in text.splitlines()) + '\n')


def comparison_html(comparison):
    return f'''<div class="comparison-block"><div class="comparison-grid">
  <figure><img src="{comparison['before']}" alt="{esc(comparison['before_label'])}"><figcaption>{esc(comparison['before_label'])}</figcaption></figure>
  <figure><img src="{comparison['after']}" alt="{esc(comparison['after_label'])}"><figcaption>{esc(comparison['after_label'])}</figcaption></figure>
</div><p class="comparison-caption">{esc(comparison['caption'])}</p></div>'''


def comparison_md(comparison):
    return f'''**{comparison['before_label']}**

![{comparison['before_label']}]({comparison['before']})

**{comparison['after_label']}**

![{comparison['after_label']}]({comparison['after']})

{comparison['caption']}
'''


def build_case(case, item):
    directory = case_dir(case)
    target = ROOT / 'cases' / directory
    level, level_description = LEVELS[item['level']]
    steps = ''.join(f'<li class="timeline-item"><span class="timeline-number">{index:02d}</span><div><h3>{esc(step["title"])}</h3><p>{esc(step["description"])}</p></div></li>' for index, step in enumerate(item['improvements'], 1))
    if not steps:
        steps = '<li class="timeline-item"><span class="timeline-number">—</span><div><h3>No invented iterations</h3><p>This entry preserves the final work without filling gaps in the record.</p></div></li>'
    metrics = ''.join(f'<li>{esc(metric)}</li>' for metric in item['metrics'])
    metrics_html = f'<section class="info-card"><h2>Measured details</h2><ul class="info-list">{metrics}</ul></section>' if metrics else ''
    versions = ''.join(f'<a class="button button-small" href="{esc(version["path"])}">{esc(version["label"])} ↗</a>' for version in item['versions'])
    evidence = ''.join(f'<a class="button button-small button-ghost" href="{esc(file["path"])}">{esc(file["label"])} ↗</a>' for file in item['evidence'])
    comparisons = ''.join(comparison_html(comparison) for comparison in item['comparisons'])
    page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Improvement · {esc(case['title'])} · Social Bench</title><meta name="description" content="The verified improvement and refinement record for {esc(case['title'])}."><link rel="icon" href="../../assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="../../assets/styles.css"></head><body>{header('../../')}
<main class="container"><section class="case-hero"><a class="breadcrumb" href="index.html">← Back to {esc(case['title'])}</a><p class="eyebrow">BMK—{case['number']:02d} · Improvement archive</p><h1>Improvement,<br>with receipts.</h1><p class="case-summary">{esc(case['title'])} · {esc(case['zh'])}</p><div class="case-actions"><a class="button" href="index.html">Final presentation</a>{versions}</div></section>
<section class="archive-note process-baseline"><div><p class="section-kicker">{esc(level)}</p><h2>Starting point</h2></div><div><p>{esc(item['baseline'])}</p><p><strong>Evidence standard:</strong> {esc(level_description)}</p></div></section>
{comparisons}
<section class="section"><div class="section-heading"><div><p class="section-kicker">Refinement sequence</p><h2>What changed</h2></div><p>{len(item['improvements'])} documented implementation or specification improvements.</p></div><ol class="timeline">{steps}</ol></section>
<div class="case-layout"><aside class="case-sidebar">{metrics_html}<section class="info-card"><h2>Versions & evidence</h2><div class="case-actions">{versions}{evidence}</div></section></aside><section class="info-card process-limit"><h2>Evidence boundary</h2><p>{esc(item['limitation'])}</p></section></div>
</main>{footer('../../')}<script src="../../assets/app.js"></script></body></html>'''
    clean_write(target / 'process.html', page)

    step_md = '\n\n'.join(f'{index}. **{step["title"]}** — {step["description"]}' for index, step in enumerate(item['improvements'], 1)) or 'No intermediate steps are claimed.'
    metrics_md = '\n'.join(f'- {metric}' for metric in item['metrics']) or '- No additional quantitative claim is made.'
    versions_md = '\n'.join(f'- [{version["label"]}]({version["path"]}) — {version["note"]}' for version in item['versions']) or '- No earlier runnable version is claimed.'
    evidence_md = '\n'.join(f'- [{file["label"]}]({file["path"]})' for file in item['evidence'])
    comparisons_md = '\n\n'.join(comparison_md(comparison) for comparison in item['comparisons'])
    markdown = f'''# {case['title']} · Improvement archive

**Evidence level:** {level} — {level_description}

## Starting point

{item['baseline']}

## What changed

{step_md}

## Measured details

{metrics_md}

## Before / after evidence

{comparisons_md or 'No visual before/after pair is claimed for this project.'}

## Versions

{versions_md}

## Additional evidence

{evidence_md or 'No additional evidence file is linked.'}

## Evidence boundary

{item['limitation']}
'''
    clean_write(target / 'process.md', markdown)


def build_index():
    counts = {level: sum(item['level'] == level for item in PROCESS.values()) for level in LEVELS}
    verified = [CASES[number - 1] for number in (4, 18, 23, 24, 25)]
    cards = ''.join(f'''<article class="project-card process-card"><div class="card-body"><p class="card-category">Verified iteration</p><div class="card-title-row"><h3><a href="cases/{case_dir(case)}/process.html">{esc(case['title'])}</a></h3><span class="card-zh">BMK—{case['number']:02d}</span></div><p class="card-summary">{esc(PROCESS[case['number']]['improvements'][0]['description'])}</p><div class="tech-list">{''.join(f'<span class="tech-tag">{esc(metric)}</span>' for metric in PROCESS[case['number']]['metrics'][:2])}</div><div class="card-footer"><a class="button button-small" href="cases/{case_dir(case)}/process.html">Read the iteration log →</a><div class="material-badges"><span>{len(PROCESS[case['number']]['improvements'])} steps</span></div></div></div></article>''' for case in verified)
    prompt_cards = ''.join(f'<li><a href="cases/{case_dir(CASES[number - 1])}/process.html"><strong>{esc(CASES[number - 1]["title"])}</strong></a> · {len(PROCESS[number]["improvements"])} specification refinements</li>' for number in (1, 2, 3, 5, 7, 8, 9))
    source_cards = ''.join(f'<li><a href="cases/{case_dir(CASES[number - 1])}/process.html"><strong>{esc(CASES[number - 1]["title"])}</strong></a> · {LEVELS[PROCESS[number]["level"]][0]}</li>' for number in (6, 17, 22))
    final_cards = ''.join(f'<li><a href="cases/{case_dir(CASES[number - 1])}/process.html">{esc(CASES[number - 1]["title"])}</a></li>' for number in (10, 11, 12, 13, 14, 15, 16, 19, 20, 21))
    page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Improvement Archive · Social Bench</title><meta name="description" content="Real iteration logs, before/after evidence and prompt refinement across 25 creative coding projects."><link rel="icon" href="assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="assets/styles.css"></head><body>{header('')}
<main><section class="case-hero container"><p class="eyebrow">The improvement archive</p><h1>Not just the final cut.<br><span class="hero-title-accent">The work behind it.</span></h1><p class="case-summary">Real source snapshots, iteration logs, before/after captures and prompt refinements — with an explicit evidence standard for every project.</p><div class="case-actions"><a class="button button-primary" href="#verified">Explore verified iterations ↓</a><a class="button" href="index.html#archive">Final presentations</a></div><ul class="stats"><li class="stat"><strong>05</strong><span>Verified iteration histories</span></li><li class="stat"><strong>07</strong><span>Prompt-evolution pairs</span></li><li class="stat"><strong>03</strong><span>Implementation studies</span></li><li class="stat"><strong>10</strong><span>Final-only archives</span></li></ul></section>
<section class="section" id="verified"><div class="container"><div class="section-heading"><div><p class="section-kicker">Source, process and measurable change</p><h2>Verified iteration histories</h2></div><p>These projects preserve actual source versions, technical logs, visual comparisons or repeatable checks.</p></div><div class="project-grid">{cards}</div></div></section>
<section class="container"><div class="archive-note"><div><p class="section-kicker">Basic → Advanced</p><h2>Prompt refinement</h2></div><div><p>Seven projects preserve two prompt versions. These pages document how scope, physical constraints, materials, interactions, cameras and accessibility became more precise. They are specification improvements, not fabricated code commits.</p><ul class="process-link-list">{prompt_cards}</ul></div></div></section>
<section class="container"><div class="archive-note"><div><p class="section-kicker">Implementation studies</p><h2>Code without a claimed timeline</h2></div><div><p>These entries explain real implementation differences or current engineering choices, without converting them into an unsupported version history.</p><ul class="process-link-list">{source_cards}</ul></div></div></section>
<section class="container"><div class="archive-note"><div><p class="section-kicker">Evidence boundary</p><h2>Final presentations only</h2></div><div><p>Ten projects have no reliable prompt pair or earlier source package. Their final work is preserved, but no intermediate steps are invented.</p><ul class="process-link-list final-list">{final_cards}</ul><p><a href="PROCESS.md">Read the complete evidence index in Markdown →</a></p></div></div></section>
</main>{footer('')}</body></html>'''
    clean_write(ROOT / 'process.html', page)

    index_rows = []
    for case in CASES:
        item = PROCESS[case['number']]
        index_rows.append(f'| {case["number"]:02d} | [{case["title"]}](cases/{case_dir(case)}/process.md) | {LEVELS[item["level"]][0]} | {len(item["improvements"])} | {len(item["versions"])} |')
    markdown = f'''# Social Bench · Improvement Archive

This is the process counterpart to the final project gallery. It preserves **how the work changed**: source snapshots, technical refinements, visual comparisons, prompt evolution and measurable checks.

## Evidence standard

- **Verified iteration · {counts['verified-iteration']} projects:** real source versions, technical logs and/or measurable verification.
- **Implementation comparison · {counts['implementation-comparison']} project:** real code-level variants, without inventing a dated release sequence.
- **Prompt evolution · {counts['prompt-evolution']} projects:** Basic → Advanced specification refinement; not presented as code commits.
- **Source study · {counts['source-only']} projects:** current implementation details only; no earlier version is claimed.
- **Final presentation · {counts['final-only']} projects:** no reliable process record, so no intermediate steps are invented.

Internal prices, token accounting, private review states, people, record IDs, attachment tokens and unrelated backend details are excluded. Where the surviving evidence is incomplete, the limitation is stated on the project page.

## Verified iteration histories

### [04 · Vehicle Physics Trio](cases/04-vehicle-physics/process.md)

Seven logged refinement rounds: contact geometry, shared damage fields, deterministic replay, resource cleanup, 21-point tire support and load-dependent flattening. Includes initial/final source, the iteration log and a final reset soak.

### [18 · Ship in a Bottle](cases/18-ship-in-a-bottle/process.md)

S.V. Kestrel R0/R1/R2 source snapshots, two 50-item refinement checklists, a separate R4 glass/camera line, and The Bottled Sea's source-level water, sail, rigging, lighting and recording improvements.

### [23 · Fjord Seaplane](cases/23-fjord-seaplane/process.md)

Water and exposure, terrain and reflections, float contact, camera composition, wake physics, frame-step correctness, clipping repair and the final alpine-lake implementation switch.

### [24 · Whale Breach](cases/24-whale-breach/process.md)

Three retained browser source stages plus a separate Blender asset branch: orientation, multi-scale ocean, 2,450 spray emitters, verified asset orientation, water-entry rerendering and an 11-second lateral choreography.

### [25 · Fawn Deer Motion](cases/25-fawn-deer-motion/process.md)

Asset preservation, packed textures, 30 light-direction tests and five sun angles, short-fur shading, EEVEE shadow/sampling improvements and an honest distinction between source frames and interpolated slow motion.

## Implementation and prompt studies

- [06 · Rocket Launch 3D](cases/06-rocket-launch/process.md): Basic/Rich implementation differences without a claimed release timeline.
- [17 · Stickman Website Wreck](cases/17-stickman-destroy/process.md): current webpage-tile destruction pipeline, controls and resource budgets.
- [22 · Roadster](cases/22-roadster-rush/process.md): reference-to-implementation engineering notes without invented optimization rounds.
- Prompt-evolution archives: [01](cases/01-demolition-physics/process.md), [02](cases/02-interactive-cloth-lab/process.md), [03](cases/03-cannon-brick-wall/process.md), [05](cases/05-galton-board/process.md), [07](cases/07-roman-colosseum/process.md), [08](cases/08-pelican-cyclist-svg/process.md), [09](cases/09-pos-card-swipe/process.md).

## Complete evidence index

| # | Project | Evidence level | Documented changes | Linked versions |
|---:|---|---|---:|---:|
{chr(10).join(index_rows)}

## Reading the artifacts

- `process.md` and `process.html` live beside every project's final presentation.
- `versions/` contains retained source snapshots where their provenance is clear.
- `process-evidence/` contains selected visual comparisons, technical logs and public verification summaries.
- The final gallery and source packages remain separate, so process documentation never substitutes for a runnable final artifact.
'''
    clean_write(ROOT / 'PROCESS.md', markdown)


def main():
    assert len(PROCESS) == 25
    for case in CASES:
        build_case(case, PROCESS[case['number']])
    build_index()
    print('Built PROCESS.md, process.html and 25 project improvement pages.')


if __name__ == '__main__':
    main()
