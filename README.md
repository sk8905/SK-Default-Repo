# 🍼 Baby Meal Planner

A simple, offline web app to help you plan **balanced daily meals for your baby**,
based on the **Children's Food Pyramid** (safefood / HSE, Ireland).

No installation, accounts, or internet required — just open `index.html` in any
browser. Your plan is saved automatically in your browser.

## What it does

- **Plan a full week**, one day at a time, across 5 meal slots
  (breakfast, morning snack, lunch, afternoon snack, dinner).
- **Add foods** from a built-in, age-appropriate food list organised by the
  pyramid's food groups, each with a toddler-sized serving example.
- **Live balance tracking** — progress bars show servings vs. the pyramid's
  daily targets for each food group, and tell you when the day is balanced. ✓
- **Age bands** — switch between **Ages 1–2** and **Ages 3–4**; targets update
  to match the pyramid.
- **✨ Suggest a balanced day** — auto-fills a day that meets every group's minimum.
- **Safety reminders** — choking-risk foods are flagged ⚠️ with prep tips, and
  the "fats" and "treats" shelves show gentle "small amounts / once a week" notes.
- **Print** a day's plan to stick on the fridge.

## Daily serving targets (from the pyramid)

| Food group | Ages 1–2 | Ages 3–4 |
|---|---|---|
| Cereals, breads, potatoes, pasta & rice | 3–4 | 4–6 |
| Vegetables, salad & fruit | 2–3 | 4–5 |
| Milk, yogurt & cheese | 3 | 3 |
| Meat, poultry, fish, eggs, beans & nuts | 2 | 3–4 |
| Fats, spreads & oils | very small amounts | very small amounts |
| Foods high in fat, sugar & salt | max once a week | max once a week |

## Run it

Open `index.html` in your browser. That's it — everything runs locally and your
plan persists via `localStorage`.

## Files

- `index.html` — page structure
- `css/styles.css` — styling
- `js/data.js` — food groups, foods, serving sizes & pyramid targets
- `js/app.js` — planner logic, balance tracking, persistence

## Note

This tool offers **general guidance only and is not medical advice**. Every baby
is different — for your child's individual needs, talk to your GP, public health
nurse, or a dietitian. Babies under 1 should not have cow's milk as a main drink,
whole nuts, honey, or added salt and sugar.
