# Crocodile Clock Card

A custom Home Assistant Lovelace card featuring a fully customisable analog clock with seven distinct clock faces, a smooth sweep or mechanical tick second hand, and a glassmorphic popup with a large digital clock, interactive calendar, and optional link.

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=jamesmcginnis&repository=crocodile-clock-card&category=plugin)

---

## Features

- **Seven clock faces** — Classic, Minimal, Roman, Modern, Luxury, Skeleton, Neon
- **Smooth or Tick second hand** — true continuous sweep or damped-spring mechanical tick with realistic overshoot and recoil
- **Seven colour pickers** — full control over the card background, dial, text and marks, hour hand, minute hand, second hand, and accent colour
- **Transparent background** support with adjustable opacity (10–100%)
- **Tap-to-open popup** — glassmorphic overlay with a large digital clock (12 hr / 24 hr) and a full interactive calendar
- **Interactive calendar** — Monday-first grid, month navigation, today highlighted with the accent colour
- **Optional popup link** — configure a URL that appears as a button at the bottom of the popup
- **Optional date display** below the clock on the card face
- **Full visual editor** — no YAML required

---

## Installation

### HACS (recommended)

Click the button above, or:

1. In HACS → Frontend, click the three-dot menu → **Custom repositories**
1. Add `https://github.com/jamesmcginnis/crocodile-clock-card` with category **Frontend**
1. Install **Crocodile Clock Card**
1. Refresh your browser

### Manual

1. Download `crocodile-clock-card.js` from this repository
1. Copy it to `/config/www/crocodile-clock-card.js`
1. In Home Assistant → Settings → Dashboards → Resources, add:
   - URL: `/local/crocodile-clock-card.js`
   - Type: JavaScript module
1. Refresh your browser

---

## Configuration

The card has a full visual editor — click the pencil icon after adding it to a dashboard. You can also configure it directly in YAML:

```yaml
type: custom:crocodile-clock-card
face: classic
show_seconds: true
seconds_style: smooth
popup_format: "12"
card_background: "#1C1C1E"
card_opacity: 88
dial_color: "#1C1C1E"
dial_text_color: "#FFFFFF"
hour_hand_color: "#FFFFFF"
minute_hand_color: "#FFFFFF"
second_hand_color: "#FF3B30"
accent_color: "#007AFF"
show_date: false
popup_url: ""
```

### Options

| Option              | Type    | Default     | Description                                                                 |
|---------------------|---------|-------------|-----------------------------------------------------------------------------|
| `face`              | string  | `classic`   | Clock face style: `classic`, `minimal`, `roman`, `modern`, `luxury`, `skeleton`, `neon` |
| `show_seconds`      | boolean | `true`      | Show or hide the second hand                                                |
| `seconds_style`     | string  | `smooth`    | Second hand mode: `smooth` (continuous sweep) or `tick` (mechanical spring) |
| `popup_format`      | string  | `12`        | Digital clock format in the popup: `12` or `24`                            |
| `card_background`   | string  | `#1C1C1E`   | Card background colour, or `transparent` to show through to the dashboard  |
| `card_opacity`      | number  | `88`        | Background opacity as a percentage (10–100). Ignored when transparent      |
| `dial_color`        | string  | `#1C1C1E`   | Clock dial fill colour                                                      |
| `dial_text_color`   | string  | `#FFFFFF`   | Colour of numerals, indices, and tick marks on the dial                    |
| `hour_hand_color`   | string  | `#FFFFFF`   | Hour hand colour                                                            |
| `minute_hand_color` | string  | `#FFFFFF`   | Minute hand colour                                                          |
| `second_hand_color` | string  | `#FF3B30`   | Second hand and centre cap colour                                           |
| `accent_color`      | string  | `#007AFF`   | Accent colour used for glow effects, calendar today highlight, and the popup colon pulse |
| `show_date`         | boolean | `false`     | Show the current date below the clock on the card face                     |
| `popup_url`         | string  | `""`        | URL to open as a link at the bottom of the popup. Leave blank to disable   |

---

## Clock Faces

### Classic
Arabic numerals at all twelve positions with tapered hour and minute hands. A traditional, readable clock face.

### Minimal
Dot indices only — no numerals. Clean stick hands with no taper. Best suited to minimalist dashboards.

### Roman
Roman numerals (I through XII) with tapered hands. A traditional face with a formal look.

### Modern
Bold Arabic numerals at the four quarter positions (12, 3, 6, 9) with accent-coloured tick marks at the remaining positions. Tapered hands.

### Luxury
Baton indices replacing numerals, rendered in gold with a highlight stripe along each baton. Baton-style hands with a matching highlight. Inspired by high-end mechanical watch design.

### Skeleton
Diamond-shaped markers at each hour position with structural decorative rings on the dial face. Tapered hands. Suited to technical or dark dashboards.

### Neon
Glowing canvas effects using the accent colour. Marker dots and hands are rendered with a multi-layer glow, with a bright white core on the hands for a neon tube effect. Works best with a vivid accent colour against a dark dial.

---

## Second Hand Modes

### Smooth
The second hand moves continuously with no visible steps between positions. One full rotation every 60 seconds with no pausing, jumping, or ticking.

### Tick
A damped-spring animation. On each new second the hand jumps slightly past the target position and then springs back, producing a natural overshoot and recoil. The effect closely resembles the feel of a well-tuned mechanical movement.

---

## Tap Popup

Tapping anywhere on the clock opens a popup overlay with:

- **Large digital time** — displayed in the format selected in the visual editor (12-hour with AM/PM, or 24-hour)
- **Full date line** — day of week, date, month, and year
- **Interactive calendar** — monthly grid, Monday-first, with navigation arrows and a **Today** button to return to the current month
- **Optional link** — if a URL is configured, a styled button appears at the bottom of the popup

The current day is highlighted with a filled circle in the accent colour. Days from the previous and next month are shown at reduced opacity to fill the grid. The popup can be closed with the × button or by pressing Escape.

---

## Colours

Seven colour pickers in the visual editor control every visual element of the card.

**Card Background** includes an optional **None** setting that makes the card surface fully transparent, allowing your dashboard background to show through. When a colour is selected, an opacity slider (10–100%) controls how opaque the background appears — useful for layering the clock over a dashboard background image or coloured panel.

The **Accent / Highlight** colour is used in several places: the glow and marker colour in the Neon face, the tick marks in the Modern face, the baton index and hand highlight in the Luxury face, the today highlight circle in the popup calendar, and the pulsing colon in the digital clock display.

---

## Requirements

- Home Assistant 2023.1.0 or later

---

## License

MIT — see [LICENSE](LICENSE)
