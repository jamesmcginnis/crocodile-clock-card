# Crocodile Clock Card

A customisable analog clock card for Home Assistant Lovelace dashboards. Choose from seven clock faces, configure a smooth sweep or snappy mechanical tick second hand, and tap the clock to reveal a glassmorphic popup with a large digital clock and interactive calendar.

## Clock faces

Seven distinct faces are available: **Classic** (Arabic numerals), **Minimal** (dot indices, clean stick hands), **Roman** (Roman numeral dial), **Modern** (bold quarter numerals with accent tick marks), **Luxury** (baton indices with highlighted baton hands), **Skeleton** (diamond markers with structural rings), and **Neon** (glowing accent-coloured elements with canvas glow effects).

Select a face in the visual editor — it takes effect immediately with no page reload needed.

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

Tapping the clock opens a glassmorphic overlay with a large digital time display in either 12-hour or 24-hour format, the full current date, and an interactive monthly calendar. Navigate between months with the arrow buttons or jump back to the current month with the **Today** button. The current day is highlighted with the accent colour. Close the popup by tapping the × button or pressing Escape.

## Display options

An optional **date display** can be shown below the clock face on the card itself. An optional **title** can be shown above the clock.

## Visual editor

All settings are configurable through the built-in visual editor — no YAML required.
