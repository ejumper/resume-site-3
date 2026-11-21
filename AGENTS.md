# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static portfolio/resume website for Eric Jumper. Structuring done in HTML, styling in CSS and interactive/moving elements in JavaScript. Showcases IT work including Linux server administration, troubleshooting, and Windows AD DS projects.

## Architecture

### Layout System

The site uses a modular content architecture:
```
layout/
├── [section-name]/
│   ├── description/
│   │   └── description.html    # Left sidebar content
│   └── content/
│       └── content.html         # Main content area
│       └── *.cast               # Asciinema recordings (optional)
```
### CSS Grid Structure

1. **Root Grid** ([body.css](2_Projects/1_Repos/resume-site-3/styling/body.css)):
   - 1 column × 3 rows: header (auto), main (5fr), footer (1fr)
   - Max width: 1500px, centered
   - body styling, basic layout structuring, variables and fonts go here

2. **Main Grid** ([main.css](main.css)):
   - Responsive layout using container queries
   - Portrait (≤1.1 aspect): 1 column × 2 rows (description 1fr, content 3fr)
   - Landscape (>1.1 aspect): 2 columns × 1 row (description 1fr, content 2fr)
   - all CSS elements pertaining to "main" go here

3. **Header Grid** ([header.css](header.css)):
   - 3 columns: left (1fr), center (2fr), right (1fr)
   - all CSS elements pertaining to "header" go here

4. **Header Grid** ([header.css](header.css)):
   - all footer styling goes here

### Debug Mode
Each element has colored outlines (via `hsla()`) to visualize the grid structure during development.

## File Organization
**Core Files:**
- [index.html](2_Projects/1_Repos/resume-site-3/index.html)
- [script.js](2_Projects/1_Repos/resume-site-3/scripting/script.js)

**Styling:**
- [2_Projects/1_Repos/resume-site-3/styling/body.css](2_Projects/1_Repos/resume-site-3/styling/body.css) - Root grid, fonts, global styles
- [header.css](header.css) - Header layout and components
- [main.css](main.css) - Main content grid with responsive queries
- [footer.css](footer.css) - Footer grid

**Assets:**
- `fonts/input/` - Input Sans Narrow font
- `fonts/ibm/` - IBM Plex Sans Variable font
- `icons/` - Site icons

## Key Technologies
- **CSS Grid** - Primary layout system
- **Container Queries** - Responsive design (not media queries)
- **Custom Fonts** - Input Sans Narrow (primary), IBM Plex Sans (secondary)
- **Asciinema** - Terminal session recordings (.cast files)
