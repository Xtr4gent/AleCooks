# AleCooks

AleCooks is a planner-first recipe app prototype for weekly menu planning.

## Current MVP

- Weekly planner with day cards for breakfast, lunch, and dinner
- Side-panel editing for each day
- Optional "Something sweet" field per day
- Recipe library with source links, notes, categories, and ingredients
- Shopping list snapshot generation from linked recipes
- Kitchen tablet preview for a single day view
- Browser persistence with `localStorage`

## Run It

```bash
npm install
npm run dev
```

## Checks

```bash
npm run lint
npm run build
```

## Notes

- Data is currently stored in the browser, not a backend.
- Recipe import is lightweight in this first pass. Link parsing is not implemented yet.
- Shopping lists are stable snapshots and only change when you regenerate them.
