# Crocodile Clock Card

A customisable analog clock card for Home Assistant Lovelace dashboards. Choose from twelve clock faces, configure a smooth sweep or snappy mechanical tick second hand, and tap the clock to reveal a glassmorphic popup with a large digital clock, interactive calendar with Home Assistant calendar events, and an optional link. Long-press the clock to switch faces instantly — the choice is saved automatically to your dashboard.

## Clock faces

Twelve distinct faces are available: **Classic** (Arabic numerals with tapered hands), **Minimal** (dot indices with clean stick hands), **Roman** (Roman numeral dial), **Modern** (bold quarter numerals with accent tick marks), **Luxury** (gold baton indices and baton hands), **Skeleton** (diamond markers with structural rings), **Neon** (glowing accent-coloured elements), **Retro** (vintage-styled Roman numerals), **Sport** (bold geometric markers), **Art Deco** (pointed gold indices with serif numerals), **Celestial** (star markers with a deep-space aesthetic), and **Stargate** (an animated portal with a rotating glyph ring, twelve chevrons, and a living water-ripple puddle).

Long-press the clock face to open the face selector and switch instantly. The selected face is saved permanently to your dashboard YAML with no manual editing required.

## Stargate face

The Stargate face renders an animated Dhd-style gate: a rotating outer ring of 39 glyph slots, twelve chevrons at the hour positions, and a dark water portal with perspective-foreshortened ripples. The chevrons respond to the clock hands — lighting red as each hand passes over them. Every five seconds one chevron briefly illuminates, and when the minute turns all twelve flash simultaneously. A kawoosh burst plays on each new minute.

## Second hand

Two modes are available. **Smooth** moves the second hand continuously with no visible steps — a true sweep. **Tick** uses a damped-spring animation: the hand jumps slightly past each second mark then springs back, giving a realistic mechanical feel with a subtle overshoot and recoil.

The second hand can be hidden entirely using the toggle in the visual editor.

## Colours

Seven colour pickers give full control over the look of the card:

- **Card Background** — the card surface, with an opacity slider (10–100%) or set to transparent to let your dashboard background show through
- **Clock Dial** — the face of the clock
- **Dial Text & Marks** — numerals, indices, and tick marks
- **Hour Hand** — the hour hand
- **Minute Hand** — the minute hand
- **Second Hand** — the second hand and its centre cap
- **Accent / Highlight** — used for glow effects, the Neon face, the Modern face tick marks, the today highlight in the calendar, and the popup digital clock colon pulse

## Tap popup

Tapping the clock opens a glassmorphic overlay with a large digital time display in either 12-hour or 24-hour format, the full current date, and an interactive monthly calendar. Navigate between months with the arrow buttons. The current day is highlighted with the accent colour. If a Home Assistant calendar entity is configured, events for the selected day are shown below the calendar grid. If a URL is configured, a styled link button appears at the bottom of the popup. Close by tapping the × button, tapping outside the popup, or pressing Escape.

## Calendar events

Set `calendar_entity` to a Home Assistant calendar entity (e.g. `calendar.home`) and the popup will display events for whichever day you tap in the calendar. Click any date to see its events. The card fetches events directly from the Home Assistant calendar API.

## Long-press face selector

Long-pressing the clock (600 ms) opens an overlay showing all twelve faces as a grid. Tap any face to switch immediately — the card updates live and the new face is written back to your dashboard configuration automatically.

## Display options

An optional **date display** can be shown below the clock face on the card itself.

## Visual editor

All settings are configurable through the built-in visual editor — no YAML required.
