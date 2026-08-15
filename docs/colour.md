# Colour

Nine categories on one screen, blocks landing next to each other in arbitrary
combinations. This is the hardest colour problem in the app and it's worth
recording what was actually verified, because the honest answer is *colour alone
cannot carry nine identities* and no palette fixes that.

## The palette

Eight hues in a fixed slot order, plus a neutral. Each has a separately chosen
dark step — the dark column is not an automatic flip of the light one.

| Slot | Category | Light | Dark | Style |
|---|---|---|---|---|
| 1 | Community | `#2a78d6` | `#3987e5` | solid |
| 2 | Promotion | `#eb6834` | `#d95926` | solid |
| 3 | Member Appreciation | `#1baf7a` | `#199e70` | solid |
| 4 | Marketing / Retail | `#eda100` | `#c98500` | outline |
| 5 | Charity | `#e87ba4` | `#d55181` | solid |
| 6 | Travel | `#008300` | `#008300` | hatch |
| 7 | Competition | `#4a3aa7` | `#9085e9` | solid |
| 8 | Closure / Holiday | `#e34948` | `#e66767` | outline |
| 9 | Operations | `#7a7a72` | `#96968c` | hatch |

Slot order is the colourblind-safety mechanism, not a cosmetic choice — the hues
are ordered so that neighbouring slots are the ones furthest apart perceptually.

## What was validated

Run against the eight chromatic hues on the **adjacent pairlist**, both modes:

| Check | Light | Dark |
|---|---|---|
| Lightness band | PASS | PASS |
| Chroma floor | PASS | PASS |
| CVD separation (worst adjacent) | PASS — ΔE 9.1 | PASS — ΔE 8.4 |
| Normal-vision floor (worst adjacent) | PASS — ΔE 19.6 | PASS — ΔE 19.3 |
| Contrast vs surface | WARN — 3 hues under 3:1 | PASS |

## What was NOT validated, and what we did about it

Under an **all-pairs** check — every category against every other, which is
closer to what a calendar actually does — the set fails, and so does every
5-hue subset of it. An exhaustive search of all 4- and 5-colour subsets found
exactly two passing 4-colour sets and no passing 5-colour set. Nine
distinguishable-by-colour-alone categories is not achievable.

So colour was demoted from an identity channel to a grouping aid, and identity is
carried by four other things that are always present:

1. **Every block is directly labelled** with its event title.
2. **A second visual channel** — solid / outlined / hatched — splits the nine into
   three style groups, so two categories that could be confused by hue are never
   also the same shape.
3. **The legend names every category** beside its swatch, with a live count.
4. **A table view** below the strip lists everything with its category spelled
   out, so the whole plan is readable with no colour at all.

Three light-mode hues (aqua, yellow, magenta) sit below 3:1 against the light
surface. That triggers the relief rule, satisfied by items 1 and 4 above — the
labels and the table are not optional decoration, they are what makes those hues
legal.

## Where the values live

In `planner_categories`, not in CSS, so categories stay editable without a
deploy. Each mark carries both steps inline as `--cat-l` / `--cat-d`; rules in
`globals.css` pick the one matching the active surface.

If you change a colour, re-run the validator before shipping it rather than
eyeballing the result.

## Related

- [README](../README.md)
