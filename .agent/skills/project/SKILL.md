---
name: project
description: Project-specific architecture, maintenance tasks, and unique conventions for Zen Mode.
---

# Zen Mode Project Skill

Hide most UI elements for a focused writing experience. This "distraction-free" plugin systematically hides Obsidian's sidebars, status bar, and ribbons, focusing entirely on the editor view.

## Core Architecture

- **UI Hiding Logic**: Dynamically injects CSS classes to `document.body` to collapse and hide non-editor components.
- **State Persistence**: Remembers Zen Mode status across Obsidian restarts.
- **Visual Polish**: Uses a 6KB `styles.css` for smooth transitions and "Zen" aesthetics.

## Project-Specific Conventions

- **Minimalist Preference**: Logic focuses on complete UI reduction.
- **Focus Transitions**: Commands should trigger smooth visual transitions rather than abrupt hiding.
- **Legacy Compatibility**: Originally developed by @paperbenni; maintainer should respect the original "Hide Everything" philosophy.

## Key Files

- `src/main.ts`: Main logic for UI state toggling and class management.
- `manifest.json`: Plugin identification and id (`zenmode`).
- `styles.css`: Extensive hiding rules and transition timings.
- `.prettierrc`: Project code formatting standards.

## Maintenance Tasks

- **DOM Fragmentation**: Obsidian's interface undergoes frequent DOM changes; audit CSS selectors for sidebars and ribbons.
- **Mobile Compatibility**: Zen Mode is highly useful on mobile; ensure hiding logic doesn't block critical touch navigation.
- **Plugin Interop**: Verify that other status bar or ribbon-based plugins don't break Zen Mode's layout assumptions.
