---
name: recommended-skills-sh
description: Referencia de skills del ecosistema skills.sh recomendadas para IB_Scope (Electron, JS, múltiples apps). Usar cuando se pregunte qué skills externas añadir o al evaluar nuevas capacidades para el agente.
---

# Skills recomendadas de skills.sh para IB_Scope

IB_Scope es una app Electron con varias sub-apps (dashboard, feedback-tracker, activity-scope, idle-time, space-heatmap), HTML/CSS/JS, SQLite, ECharts, Lottie y tests con Playwright. Las siguientes skills de [skills.sh](https://skills.sh/) son relevantes; **no se instalan automáticamente** — el usuario decide cuáles añadir.

Instalación cuando se decida: `npx skills add <owner/repo>`.

## Alta relevancia

| Skill | Repo | Motivo |
|-------|------|--------|
| **web-design-guidelines** | vercel-labs/agent-skills | UI/UX y consistencia visual en las varias apps del renderer. |
| **frontend-design** | anthropics/skills | Buenas prácticas de diseño frontend (vistas, componentes, flujos). |
| **webapp-testing** | anthropics/skills | Alineado con Playwright; pruebas de la app como producto. |
| **systematic-debugging** | obra/superpowers | Depuración ordenada en main/renderer/preload e IPC. |
| **error-handling-patterns** | wshobson/agents | Patrones de errores en Electron (IPC, async, ventanas). |
| **architecture-patterns** | wshobson/agents | Estructura multi-app, separación main/renderer/core. |
| **e2e-testing-patterns** | wshobson/agents | Refuerza estrategia E2E con Playwright. |
| **javascript-testing-patterns** | wshobson/agents | Tests unitarios e integración en JS. |

## Relevancia media

| Skill | Repo | Motivo |
|-------|------|--------|
| **code-review-excellence** | wshobson/agents | Revisión de código antes de merge. |
| **responsive-design** | wshobson/agents | Ventanas redimensionables y layouts por app. |
| **accessibility-compliance** | wshobson/agents | Accesibilidad en formularios y tablas (p. ej. feedback-tracker). |
| **design-system-patterns** | wshobson/agents | Consistencia entre dashboard, heatmap, etc. |

## Opcionales (según necesidad)

| Skill | Repo | Motivo |
|-------|------|--------|
| **writing-plans** / **executing-plans** | obra/superpowers | Planificación y ejecución de tareas grandes. |
| **requesting-code-review** / **receiving-code-review** | obra/superpowers | Flujo de revisión con humanos. |
| **vercel-react-best-practices** | vercel-labs/agent-skills | Solo si se adopta más React (p. ej. más componentes JSX). |

## No recomendadas para este proyecto

- Skills de Next/Nuxt/Vue/Remotion: stack es Electron + JS vanilla/ligero.
- Skills de marketing/SEO/copy: app de escritorio interna.
- Skills de PDF/docx/xlsx como foco principal: solo si se prioriza export/import de documentos.

## Resumen de comandos (cuando quieras instalar)

```bash
# Ejemplos (no ejecutar sin decidir antes)
npx skills add vercel-labs/agent-skills    # incluye web-design-guidelines y otros
npx skills add anthropics/skills           # frontend-design, webapp-testing, etc.
npx skills add wshobson/agents             # error-handling, architecture, e2e, a11y
npx skills add obra/superpowers            # systematic-debugging, plans, code review
```

Comprobar en [skills.sh](https://skills.sh/) el nombre exacto del skill dentro de cada repo antes de instalar.
