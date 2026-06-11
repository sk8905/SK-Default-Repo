/* Baby Meal Planner — vanilla JS, persists to localStorage. */

const STORE_KEY = 'babyMealPlanner.v1';
const state = {
  age: 'toddler',            // 'toddler' (1–2) or 'preschool' (3–4)
  day: DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1], // today
  plan: {},                  // plan[day][slot] = [foodId, ...]
};

let pickerSlot = null;       // slot currently being added to

/* ---------------- persistence ---------------- */
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved) {
      state.age = saved.age || state.age;
      state.plan = saved.plan || {};
    }
  } catch (_) { /* ignore corrupt data */ }
}
function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify({ age: state.age, plan: state.plan }));
}

function dayPlan(day = state.day) {
  if (!state.plan[day]) state.plan[day] = {};
  return state.plan[day];
}

/* ---------------- helpers ---------------- */
const foodById = id => FOODS.find(f => f.id === id);

function dayServings(day = state.day) {
  const counts = { cereals: 0, veg: 0, milk: 0, protein: 0, fats: 0, treats: 0 };
  const plan = state.plan[day] || {};
  MEAL_SLOTS.forEach(slot => {
    (plan[slot.id] || []).forEach(id => {
      const f = foodById(id);
      if (f) counts[f.group] += 1;
    });
  });
  return counts;
}

function isDayBalanced(day) {
  const counts = dayServings(day);
  return Object.values(FOOD_GROUPS).every(g => {
    if (!g.counted) return true;
    return counts[g.id] >= g.targets[state.age].min;
  });
}

function dayHasFood(day) {
  const plan = state.plan[day] || {};
  return MEAL_SLOTS.some(s => (plan[s.id] || []).length > 0);
}

/* ---------------- rendering ---------------- */
function render() {
  renderDays();
  renderMeals();
  renderBalance();
  renderPyramid();
  save();
}

function renderDays() {
  const el = document.getElementById('days');
  el.innerHTML = '';
  DAYS.forEach(day => {
    const b = document.createElement('button');
    b.textContent = day.slice(0, 3);
    b.title = day;
    if (day === state.day) b.classList.add('active');
    if (dayHasFood(day) && isDayBalanced(day)) {
      const dot = document.createElement('span');
      dot.className = 'dot';
      b.appendChild(dot);
    }
    b.onclick = () => { state.day = day; render(); };
    el.appendChild(b);
  });
}

function renderMeals() {
  document.getElementById('dayTitle').textContent = state.day;
  const wrap = document.getElementById('meals');
  wrap.innerHTML = '';
  const plan = dayPlan();

  MEAL_SLOTS.forEach(slot => {
    const card = document.createElement('div');
    card.className = 'meal';

    const h = document.createElement('h3');
    h.innerHTML = `<span>${slot.emoji}</span> ${slot.name}`;
    const add = document.createElement('button');
    add.className = 'btn primary add';
    add.textContent = '+ Add food';
    add.onclick = () => openPicker(slot.id);
    h.appendChild(add);
    card.appendChild(h);

    const items = document.createElement('div');
    items.className = 'items';
    const list = plan[slot.id] || [];
    if (!list.length) {
      items.innerHTML = '<div class="empty-hint">Nothing planned yet — tap “Add food”.</div>';
    } else {
      list.forEach((id, idx) => items.appendChild(foodChip(id, slot.id, idx)));
    }
    card.appendChild(items);
    wrap.appendChild(card);
  });
}

function foodChip(id, slotId, idx) {
  const f = foodById(id);
  const g = FOOD_GROUPS[f.group];
  const chip = document.createElement('div');
  chip.className = 'food-chip';
  chip.style.borderLeftColor = g.color;
  chip.innerHTML = `
    <span class="emoji">${f.emoji}</span>
    <span class="info">
      <b>${f.name}</b>
      <small>${g.short} · ${f.serving}</small>
    </span>
    ${f.choke ? `<span class="warn" title="${f.choke}">⚠️</span>` : ''}
  `;
  const rm = document.createElement('button');
  rm.className = 'remove';
  rm.innerHTML = '&times;';
  rm.title = 'Remove';
  rm.onclick = () => {
    dayPlan()[slotId].splice(idx, 1);
    render();
  };
  chip.appendChild(rm);
  return chip;
}

function renderBalance() {
  const counts = dayServings();
  const banner = document.getElementById('balanceBanner');
  const balanced = dayHasFood(state.day) && isDayBalanced(state.day);
  banner.className = 'balance-banner ' + (balanced ? 'ok' : 'work');
  banner.textContent = balanced
    ? '🎉 Balanced day — all food groups met!'
    : '🧩 Keep going to balance the day';

  const bars = document.getElementById('bars');
  bars.innerHTML = '';
  Object.values(FOOD_GROUPS).forEach(g => {
    if (g.counted) {
      bars.appendChild(servingBar(g, counts[g.id]));
    } else {
      bars.appendChild(advisoryRow(g, counts[g.id]));
    }
  });
}

function servingBar(g, count) {
  const t = g.targets[state.age];
  const wrap = document.createElement('div');
  wrap.className = 'bar';
  const met = count >= t.min;
  const over = count > t.max;
  if (met && !over) wrap.classList.add('met');
  if (over) wrap.classList.add('over');

  const targetLabel = t.min === t.max ? `${t.min}` : `${t.min}–${t.max}`;
  const pct = Math.min(100, (count / t.max) * 100);

  wrap.innerHTML = `
    <div class="top">
      <b>${g.short}</b>
      <span class="count">${count} / ${targetLabel} ${met ? '✓' : ''}</span>
    </div>
    <div class="track"><div class="fill" style="width:${pct}%;background:${g.color}"></div></div>
    <div class="note">${over ? 'A little over target — that’s usually fine.' : g.note}</div>
  `;
  return wrap;
}

function advisoryRow(g, count) {
  const row = document.createElement('div');
  row.className = 'advisory';
  row.style.background = g.color + '22';
  row.innerHTML = `
    <span class="swatch" style="background:${g.color}"></span>
    <span><b>${g.short}:</b> ${g.note}${count ? ` <em>(${count} planned today)</em>` : ''}</span>
  `;
  return row;
}

function renderPyramid() {
  const tiers = [
    { g: 'treats', cls: 't0' },
    { g: 'fats', cls: 't1' },
    { g: 'protein', cls: 't2' },
    { g: 'milk', cls: 't3' },
    { g: 'veg', cls: 't4' },
    { g: 'cereals', cls: 't5' },
  ];
  const el = document.getElementById('pyramid');
  el.innerHTML = '';
  tiers.forEach(({ g, cls }) => {
    const grp = FOOD_GROUPS[g];
    const div = document.createElement('div');
    div.className = `tier ${cls}`;
    div.style.background = grp.color;
    let amount;
    if (grp.counted) {
      const t = grp.targets[state.age];
      amount = (t.min === t.max ? `${t.min}` : `${t.min}–${t.max}`) + ' servings/day';
    } else {
      amount = g === 'treats' ? 'Max once a week' : 'Very small amounts';
    }
    div.innerHTML = `<b>${grp.short}</b><small>${amount}</small>`;
    el.appendChild(div);
  });
}

/* ---------------- food picker modal ---------------- */
function openPicker(slotId) {
  pickerSlot = slotId;
  document.getElementById('pickerSearch').value = '';
  renderPicker('');
  document.getElementById('modalBack').classList.add('open');
  document.getElementById('pickerSearch').focus();
}
function closePicker() {
  document.getElementById('modalBack').classList.remove('open');
  pickerSlot = null;
}

function renderPicker(query) {
  const q = query.trim().toLowerCase();
  const body = document.getElementById('pickerBody');
  body.innerHTML = '';
  Object.values(FOOD_GROUPS).forEach(g => {
    const foods = FOODS.filter(f => f.group === g.id &&
      (!q || f.name.toLowerCase().includes(q)));
    if (!foods.length) return;
    const block = document.createElement('div');
    block.className = 'group-block';
    block.innerHTML = `<div class="group-label">
      <span class="swatch" style="background:${g.color}"></span>${g.name}</div>`;
    const grid = document.createElement('div');
    grid.className = 'food-grid';
    foods.forEach(f => {
      const b = document.createElement('button');
      b.className = 'pick';
      b.innerHTML = `<span class="emoji">${f.emoji}</span>
        <span><b>${f.name}</b><small>${f.serving}</small></span>`;
      b.onclick = () => {
        const plan = dayPlan();
        if (!plan[pickerSlot]) plan[pickerSlot] = [];
        plan[pickerSlot].push(f.id);
        render();
        closePicker();
      };
      grid.appendChild(b);
    });
    block.appendChild(grid);
    body.appendChild(block);
  });
  if (!body.children.length) {
    body.innerHTML = '<p style="color:var(--muted)">No foods match that search.</p>';
  }
}

/* ---------------- auto-suggest a balanced day ---------------- */
function suggestDay() {
  const pick = (group, n) => {
    const pool = FOODS.filter(f => f.group === group);
    const chosen = [];
    for (let i = 0; i < n; i++) chosen.push(pool[Math.floor(Math.random() * pool.length)].id);
    return chosen;
  };
  const tg = g => FOOD_GROUPS[g].targets[state.age].min;

  // Build a simple balanced day hitting each group's minimum.
  const plan = { breakfast: [], amsnack: [], lunch: [], pmsnack: [], dinner: [] };
  // distribute starchy across breakfast/lunch/dinner
  pick('cereals', tg('cereals')).forEach((id, i) => {
    [plan.breakfast, plan.lunch, plan.dinner][i % 3].push(id);
  });
  pick('veg', tg('veg')).forEach((id, i) => {
    [plan.lunch, plan.dinner, plan.amsnack][i % 3].push(id);
  });
  pick('milk', tg('milk')).forEach((id, i) => {
    [plan.breakfast, plan.pmsnack, plan.dinner][i % 3].push(id);
  });
  pick('protein', tg('protein')).forEach((id, i) => {
    [plan.lunch, plan.dinner][i % 2].push(id);
  });

  state.plan[state.day] = plan;
  render();
}

function clearDay() {
  if (!dayHasFood(state.day)) return;
  if (confirm(`Clear all meals planned for ${state.day}?`)) {
    state.plan[state.day] = {};
    render();
  }
}

/* ---------------- age toggle ---------------- */
function setAge(age) {
  state.age = age;
  document.querySelectorAll('.age-toggle button').forEach(b =>
    b.classList.toggle('active', b.dataset.age === age));
  render();
}

/* ---------------- init ---------------- */
function init() {
  load();
  document.querySelectorAll('.age-toggle button').forEach(b => {
    b.onclick = () => setAge(b.dataset.age);
  });
  setAge(state.age);

  document.getElementById('suggestBtn').onclick = suggestDay;
  document.getElementById('clearBtn').onclick = clearDay;
  document.getElementById('printBtn').onclick = () => window.print();

  document.getElementById('pickerClose').onclick = closePicker;
  document.getElementById('modalBack').onclick = e => {
    if (e.target.id === 'modalBack') closePicker();
  };
  document.getElementById('pickerSearch').oninput = e => renderPicker(e.target.value);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePicker();
  });

  render();
}

document.addEventListener('DOMContentLoaded', init);
