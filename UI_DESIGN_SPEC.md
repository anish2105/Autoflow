# AutoFlow UI Design Specification & System Reference

This document is the **authoritative UI reference** for the AutoFlow application. Any new components, redesigns, or feature additions must strictly adhere to the design tokens, typography, layout rules, and component patterns defined below.

---

## 1. Visual Philosophy & Aesthetic
- **Atmosphere**: Warm Editorial, clean paper/canvas tone, sophisticated minimalism with pill geometries, and elegant typography.
- **Palette Identity**: Warm cream background (`#FBF9F5`), crisp white cards (`#FFFFFF`), subtle organic border strokes (`#E6E1D8`), periwinkle speech bubbles (`#E2E8F7`), and deep slate typography (`#192131` / `#5A6578`).
- **Typography Pairing**: Modern Editorial Serif for display headings + clean Neo-Grotesque Sans (`Inter`) for body text and interactive elements + `JetBrains Mono` for code & tokens.
- **Corner Radii**: 
  - Standard Pills: `9999px` (Buttons, search inputs, status badges).
  - Cards & Containers: `16px` to `20px`.
  - Nested elements / chips: `8px` to `12px`.

---

## 2. Color Palette & Tokens (CSS Variables)

```css
:root {
  /* Surface & Backgrounds */
  --color-canvas: #FBF9F5;          /* Warm cream app background */
  --color-surface-white: #FFFFFF;    /* Pure white for card elevation */
  --color-surface-subtle: #F3EFEA;   /* Secondary cream for badges/chips */
  --color-surface-hover: #ECE6DC;    /* Hover state on warm surfaces */

  /* Borders & Dividers */
  --border-subtle: #E8E2D8;         /* Light divider borders */
  --border-strong: #D5CEBF;         /* Card & container borders */
  --border-dark: #192131;           /* Dark outline for focused states */

  /* Typography Colors */
  --text-primary: #192131;          /* Deep rich slate for main text */
  --text-secondary: #5A6578;        /* Muted slate for captions/subtitles */
  --text-tertiary: #8C96A6;         /* Light grey-slate for timestamps/labels */
  --text-brand: #0F3B82;            /* Deep navy accent */

  /* Accent & Interaction Colors */
  --accent-user-bubble: #E2E8F7;    /* Periwinkle tint for user message bubble */
  --accent-user-text: #192742;      /* Deep navy for text inside user bubble */
  --accent-primary-btn: #0D3273;    /* Deep navy pill button */
  --accent-primary-hover: #08214D;  /* Darker navy on hover */
  --accent-send-circle: #5B72EE;    /* Soft purple/indigo circular send button */
  
  /* Node State Tones */
  --node-start: #059669;            /* Green for __start__ */
  --node-agent: #4F46E5;            /* Indigo for agent reasoning node */
  --node-tools: #D946EF;            /* Fuchsia/pink for tool executions */
  --node-end: #0891B2;              /* Cyan for __end__ */
}
```

---

## 3. Typography Hierarchy

| Role | Font Family | Size | Weight | Tracking / Line Height |
| :--- | :--- | :--- | :--- | :--- |
| **Editorial Display Title** | `'Newsreader', 'Playfair Display', Georgia, serif` | `1.4rem - 1.85rem` | `700` | `-0.02em` / `1.25` |
| **Brand Logo Header** | `'Newsreader', Georgia, serif` | `1.35rem` | `700` | `-0.02em` / `1` |
| **Section Kickers** | `'Inter', sans-serif` | `0.7rem` | `700` | `0.08em` uppercase |
| **Body & Assistant Text** | `'Inter', -apple-system, sans-serif` | `0.94rem` | `400` | `0em` / `1.7` |
| **User Message Bubble** | `'Inter', sans-serif` | `0.92rem` | `400` | `0em` / `1.5` |
| **Pill Buttons / Labels** | `'Inter', sans-serif` | `0.82rem` | `600` | `0em` / `1.2` |
| **Code & Monospace** | `'JetBrains Mono', monospace` | `0.75rem - 0.82rem` | `500` | `0em` / `1.5` |

---

## 4. Component Blueprints

### A. Top Navigation Bar
- Height: `56px`, seamless border bottom (`--border-subtle`).
- Left: Clean bold **AutoFlow** title (`fontFamily: 'Newsreader'`, `fontSize: 1.35rem`) + active node status pill.
- Right: Circular hamburger menu button (`34px x 34px`) to toggle session history.
- Clean without clutter (focus button and model chips omitted).

### B. Center Chat Area
- **Container**: Transparent/canvas background with max reading width (`720px`).
- **User Message**:
  - Background: `--accent-user-bubble` (`#E2E8F7`).
  - Border Radius: `18px`.
  - Alignment: Right / Right-of-center with small copy icon underneath.
- **Assistant Message**:
  - Clean left alignment with circular avatar.
  - Collapsible `> Thought about this` reasoning widget.
  - Clean layout without action buttons.
- **Floating Controls**:
  - `↓ Scroll to bottom` pill button.
  - Floating pill search/input bar (`border-radius: 9999px`) with attachment clip, latency counter (`⚡ 54`), and circular send button (`↑`).

### C. Right Panel: Dynamic Resizable & Vertical Triggered Execution Flow
- **Resizable Geometry**:
  - Draggable splitter divider (`.split-resizer`) allowing mouse drag to resize between 22% and 68%.
  - Width Slider control in header (`[ ──●── ] 45%`) for quick adjustments.
- **Vertical Triggered Node Pipeline**:
  - Step 1: User Query Ingestion (`__start__`) with prompt quote.
  - ⬇ Animated connecting arrow.
  - Step 2: Gemini LLM Reasoning Core (`agent`) with reasoning status.
  - ⬇ Animated connecting arrow.
  - Step 3: Triggered Tool Execution Cards (`web_search`, `calculate`, `get_current_time`) with inputs, execution status, and result preview.
  - ↺ Loopback arrow returning tool results to LLM Reasoner.
  - ⬇ Animated connecting arrow.
  - Step 4: Response Finalization (`__end__`) with output preview.
