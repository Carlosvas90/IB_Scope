---
name: infographic-creator
description: Create beautiful infographics based on given text content. Use when users request to create infographics.
---

Infographics convert data, information, and knowledge into perceptible visual language. They combine visual design with data visualization, compressing complex information with intuitive symbols to help audiences quickly understand and remember key points.

`Infographic = Information Structure + Visual Expression`

This task uses [AntV Infographic](https://infographic.antv.vision/) to create visual infographics.

Before starting the task, you need to understand the AntV Infographic syntax specifications, including template list, data structure, themes, etc.

*Fuente: [antvis/chart-visualization-skills](https://github.com/antvis/chart-visualization-skills).*

## Specifications

### AntV Infographic Syntax

AntV Infographic syntax is a custom DSL used to describe infographic rendering configurations. It uses indentation to describe information, has strong robustness, and is convenient for AI streaming output and infographic rendering. It mainly contains:

1. **template**: Use templates to express the text information structure.
2. **data**: Infographic data (title, desc, data items). Data items typically contain fields such as label, desc, icon, etc.
3. **theme**: Theme contains style configurations such as palette, font, etc.

Example:
```plain
infographic list-row-horizontal-icon-arrow
data
  title Title
  desc Description
  lists
  - label Label
    value 12.5
    desc Explanation
    icon document text
theme
  palette #3b82f6 #8b5cf6 #f97316
```

### Syntax Rules

- First line must be `infographic ` + template name (see "Available Templates" below).
- Use `data` / `theme` blocks, with two-space indentation within blocks.
- Key-value pairs: "key space value"; arrays: `-` as entry prefix.
- icon: use icon keywords (e.g., `star fill`).
- Main data field (use only one): `list-*` → `lists`; `sequence-*` → `sequences`; `compare-*` → `compares`; `hierarchy-structure` → `items`; `hierarchy-*` → single `root`; `relation-*` → `nodes` + `relations`; `chart-*` → `values`; fallback → `items`.
- `theme`: e.g. `theme dark`, `palette`, `theme.base.text.font-family`, `theme.stylize` (rough, pattern, linear-gradient, radial-gradient).
- Do not output JSON, Markdown, or explanatory text in the syntax.

### Available Templates (selection)

- **chart-***: chart-bar-plain-text, chart-column-simple, chart-line-plain-text, chart-pie-*, chart-wordcloud
- **compare-***: compare-binary-*, compare-quadrant-*, compare-swot
- **hierarchy-***: hierarchy-structure, hierarchy-mindmap-*, hierarchy-tree-*
- **list-***: list-row-horizontal-icon-arrow, list-column-*, list-grid-*, list-zigzag-*
- **relation-***: relation-dagre-flow-tb-*
- **sequence-***: sequence-steps-*, sequence-timeline-*, sequence-roadmap-*, sequence-pyramid-simple, etc.

Recommendations: strict sequence → `sequence-*`; listing → `list-row-*` or `list-column-*`; binary comparison → `compare-binary-*`; SWOT → `compare-swot`; tree → `hierarchy-tree-*`; charts → `chart-*`; quadrant → `compare-quadrant-*`; relationships → `relation-*`; mind map → `hierarchy-mindmap-*`.

## Generation Process

### Step 1: Understand user requirements
Extract key information (title, desc, items, label, value, icon). Select template. Describe content using AntV Infographic syntax. **Respect the language of user input** (e.g. Chinese in → Chinese in syntax).

### Step 2: Render the infographic
Create an HTML file that:
- DOCTYPE, charset utf-8, title `{title} - Infographic`
- Include script: `https://unpkg.com/@antv/infographic@latest/dist/infographic.min.js`
- Container div id `container`
- Initialize: `new AntVInfographic.Infographic({ container: '#container', width: '100%', height: '100%' })`
- Call `infographic.render(\`{syntax}\`)` (after `document.fonts?.ready` if needed)
- Add SVG export: `const svgDataUrl = await infographic.toDataURL({ type: 'svg' });`

Save as `{title}-infographic.html`. Tell the user to open in a browser to view and save as SVG.

## Example (list template)

```plain
infographic list-row-horizontal-icon-arrow
data
  title Internet Technology Evolution
  desc From Web 1.0 to AI era, key milestones
  lists
  - time 1991
    label Web 1.0
    desc Tim Berners-Lee published the first website
    icon web
  - time 2004
    label Web 2.0
    desc Social media and user-generated content
    icon account multiple
```

For full template list and data syntax examples, see the [AntV Infographic](https://infographic.antv.vision/) docs or the skill in the repo `antvis/chart-visualization-skills/skills/infographic-creator/`.
