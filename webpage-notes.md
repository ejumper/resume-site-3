# Overview
The premise of this site is built around placing different files in .description, .content and .footer-grid depending on the "context"

**context structure**
- every "context" follows the same directory structure
	- the context directory will contain a description and a content directory.
		- the description directory contains an HTML file that goes in .description
		- the content directory will contain file(s) that goes in .content (either an HTML file or asciinema .cast file(s))

**defining contexts**
- directory.json lists all the contexts, the path to the contents and descriptions and the contexts that should be listed in footer-grid
- paths in directory.json should be relative without the "resume-site-3/" prefix

# Behavior
This is an extension of the overview section. In this section I will walk you through how the website should behave

**On First Load:**
- the website should load the "home" context as defined in directory.json
- the current context should be reflected in the URL hash (e.g., `#home`, `#docker-https-nginx`)

**Navigation:**
- when another context is selected from .footer-grid, that context should load
- the current context in footer-grid should have a white border around it
- the URL hash should update to reflect the current context
- when switching contexts, playback state should be reset

**Error Handling:**
- if a file referenced in directory.json doesn't exist, display: "`<path/from/directory.json>` doesn't exist"
- if a .cast file fails to load, display a simple error message
- if directory.json is malformed, display a simple error message

# HTML
Depending on the context selected, .content will either contain an HTML file or an asciinema player. If the directory.json file lists a .cast file under content, the asciinema player is loaded, if it lists a .html file, that html file should be displayed. Below is the styling guide for HTML files in .content.

**HTML Content Styling:**
- text should fill the width, and overflow to the bottom if necessary
- .content should be scrollable when HTML content is long
- for now, no custom styling - just `color: white` from body and default HTML styling
- images are in `images/` directory (paths in HTML files will be updated separately)

# Asciinema

Depending on the context selected, .content will either contain an HTML file or an asciinema player. If the directory.json file lists a .cast file under content, the asciinema player is loaded, if it lists a .html file, that html file should be displayed.

**Player Setup:**
- the asciinema JS/CSS files should be downloaded locally and placed in `asciinema/`
- asciinema files should be played locally

**Player Layout (CSS Grid):**
- Order from top to bottom:
  1. Asciinema player (top)
  2. Custom player controls (middle)
  3. Parts/chapters legend (bottom)
- Player should be centered in a row using CSS grid
- Size the player using rem units (start with a reasonable size for later adjustment)

**Parts/Chapters:**
- asciinema content is split into "parts", with a legend that auto-populates all the parts in a row, so they can be selected to play
- by default, when one part ends it should go to the next part automatically, and loop back to the first part when the last part is finished
- "parts" are listed in directory.json as a list of "content" - "docker-https-nginx" is an example of how it will be structured
- part names should be the name of the .cast file, minus the .cast extension, with "\_" replaced with ". " and "-" replaced with " "
- the currently playing part should have a white outline

**Custom Player Controls:**
- the default asciinema player controls should be replaced with custom ones
- custom controls should include (using .svg icons from `icons/`):
  - pause/play toggle button
  - loop/play-all toggle button
  - 2x/4x playback speed toggle button
- asciinema files should be played at 4x speed by default

# Footer-Grid

**Context Display:**
- each context has a "footer-grid" section that lists other contexts that when clicked on should open that context
- context labels should be transformed to readable format by converting "-" to " " (e.g., "docker-https-nginx" → "docker https nginx")

**Layout:**
- the contexts should be displayed in a single row that overflows to the right
- swipe navigation on mobile
- horizontal scrolling on desktop

# Description Section

**Content:**
- .description should display the HTML file specified in directory.json for the current context
- descriptions should be allowed to overflow and scroll

# State Management & Transitions

**URL & History:**
- current context should be reflected in URL hash (e.g., `#docker-https-nginx`)
- browser history should work (back button navigates contexts)

**Loading & Transitions:**
- for now, no loading indicators
- for now, no animations - instant context swaps
- get core functionality working first, polish later

# Technical Implementation

**JavaScript:**
- use lightweight, simple vanilla JavaScript approach
- minimize dependencies where possible

**Debug Mode:**
- debug grid outlines (colored borders on elements) can be toggled or removed as needed
