/*
 * Food data for the Baby Meal Planner.
 *
 * Based on the Children's Food Pyramid (safefood / HSE, Ireland).
 * Serving targets below are taken directly from the pyramid for the two
 * age bands shown on it: "Ages one and two" and "Ages three and four".
 *
 * Counted shelves have a daily serving target. Advisory shelves
 * (fats/spreads/oils and the top treat shelf) are not counted toward a
 * number — they are shown as gentle reminders instead.
 */

const FOOD_GROUPS = {
  cereals: {
    id: 'cereals',
    name: 'Cereals, breads, potatoes, pasta & rice',
    short: 'Starchy foods',
    color: '#a9764b',
    counted: true,
    targets: { toddler: { min: 3, max: 4 }, preschool: { min: 4, max: 6 } },
    note: 'The base of the pyramid — energy for play and growing.',
  },
  veg: {
    id: 'veg',
    name: 'Vegetables, salad & fruit',
    short: 'Veg & fruit',
    color: '#6aa84f',
    counted: true,
    targets: { toddler: { min: 2, max: 3 }, preschool: { min: 4, max: 5 } },
    note: 'Offer a variety of colours. Cut soft and into small pieces.',
  },
  milk: {
    id: 'milk',
    name: 'Milk, yogurt & cheese',
    short: 'Dairy',
    color: '#4a90c2',
    counted: true,
    targets: { toddler: { min: 3, max: 3 }, preschool: { min: 3, max: 3 } },
    note: 'For calcium and growth. Whole/full-fat dairy under age 2.',
  },
  protein: {
    id: 'protein',
    name: 'Meat, poultry, fish, eggs, beans & nuts',
    short: 'Protein foods',
    color: '#f1c232',
    counted: true,
    targets: { toddler: { min: 2, max: 2 }, preschool: { min: 3, max: 4 } },
    note: 'Iron-rich foods are important for babies. Include oily fish.',
  },
  fats: {
    id: 'fats',
    name: 'Fats, spreads & oils',
    short: 'Fats & oils',
    color: '#f6b26b',
    counted: false,
    note: 'In very small amounts. Choose unsaturated spreads and oils.',
  },
  treats: {
    id: 'treats',
    name: 'Foods & drinks high in fat, sugar & salt',
    short: 'Treats',
    color: '#e06666',
    counted: false,
    note: 'Not needed by babies. Maximum once a week and in tiny amounts.',
  },
};

// A toddler-sized serving of each food. Quantities are example serving sizes
// suitable for a 1–2 year old. choke = age-appropriate safety reminder.
const FOODS = [
  // ---- Cereals / starchy ----
  { id: 'porridge', name: 'Porridge', group: 'cereals', emoji: '🥣', serving: '3–4 tbsp cooked' },
  { id: 'wbread', name: 'Wholemeal bread', group: 'cereals', emoji: '🍞', serving: '½–1 slice' },
  { id: 'toastfingers', name: 'Toast fingers', group: 'cereals', emoji: '🍞', serving: '1 slice, in fingers' },
  { id: 'pasta', name: 'Pasta', group: 'cereals', emoji: '🍝', serving: '2–3 tbsp cooked' },
  { id: 'rice', name: 'Rice', group: 'cereals', emoji: '🍚', serving: '2–3 tbsp cooked' },
  { id: 'potato', name: 'Potato (mashed)', group: 'cereals', emoji: '🥔', serving: '½ medium' },
  { id: 'sweetpotato', name: 'Sweet potato', group: 'cereals', emoji: '🍠', serving: '½ small, mashed' },
  { id: 'oatcereal', name: 'Low-sugar cereal', group: 'cereals', emoji: '🥣', serving: '3–4 tbsp' },
  { id: 'couscous', name: 'Couscous', group: 'cereals', emoji: '🍚', serving: '2–3 tbsp cooked' },

  // ---- Vegetables & fruit ----
  { id: 'banana', name: 'Banana', group: 'veg', emoji: '🍌', serving: '½ small, sliced' },
  { id: 'berries', name: 'Soft berries', group: 'veg', emoji: '🫐', serving: 'small handful, halved', choke: 'Halve or quarter to avoid choking.' },
  { id: 'apple', name: 'Apple', group: 'veg', emoji: '🍎', serving: '2–3 tbsp grated/cooked', choke: 'Grate or cook soft — raw chunks are a choking risk.' },
  { id: 'pear', name: 'Pear', group: 'veg', emoji: '🍐', serving: '½ ripe, soft' },
  { id: 'broccoli', name: 'Broccoli', group: 'veg', emoji: '🥦', serving: '2–3 soft florets' },
  { id: 'carrot', name: 'Carrot (cooked)', group: 'veg', emoji: '🥕', serving: '2 tbsp soft sticks', choke: 'Cook until soft — raw carrot is a choking risk.' },
  { id: 'peas', name: 'Peas', group: 'veg', emoji: '🟢', serving: '2 tbsp, lightly mashed' },
  { id: 'tomato', name: 'Tomato', group: 'veg', emoji: '🍅', serving: '2–3 quartered cherry', choke: 'Quarter cherry tomatoes lengthways.' },
  { id: 'avocado', name: 'Avocado', group: 'veg', emoji: '🥑', serving: '2 tbsp, sliced' },
  { id: 'cucumber', name: 'Cucumber', group: 'veg', emoji: '🥒', serving: 'a few soft sticks' },
  { id: 'spinach', name: 'Spinach (cooked)', group: 'veg', emoji: '🍃', serving: '1–2 tbsp' },
  { id: 'sweetcorn', name: 'Sweetcorn', group: 'veg', emoji: '🌽', serving: '1–2 tbsp' },

  // ---- Milk / dairy ----
  { id: 'wholemilk', name: 'Whole milk', group: 'milk', emoji: '🥛', serving: '100 ml (in a cup)' },
  { id: 'yogurt', name: 'Plain whole yogurt', group: 'milk', emoji: '🥣', serving: '1 small pot (~100g)' },
  { id: 'cheese', name: 'Cheese', group: 'milk', emoji: '🧀', serving: '~25g, grated/sliced' },
  { id: 'creamcheese', name: 'Cream cheese', group: 'milk', emoji: '🧀', serving: '1–2 tbsp on toast' },
  { id: 'custard', name: 'Homemade custard', group: 'milk', emoji: '🍮', serving: '2–3 tbsp' },

  // ---- Protein ----
  { id: 'egg', name: 'Egg (cooked through)', group: 'protein', emoji: '🥚', serving: '1 egg' },
  { id: 'chicken', name: 'Chicken', group: 'protein', emoji: '🍗', serving: '1–2 tbsp, minced/shredded' },
  { id: 'beefmince', name: 'Beef mince', group: 'protein', emoji: '🥩', serving: '1–2 tbsp' },
  { id: 'salmon', name: 'Salmon (oily fish)', group: 'protein', emoji: '🐟', serving: '1–2 tbsp, flaked', choke: 'Check carefully for bones.' },
  { id: 'whitefish', name: 'White fish', group: 'protein', emoji: '🐟', serving: '1–2 tbsp, flaked', choke: 'Check carefully for bones.' },
  { id: 'lentils', name: 'Lentils', group: 'protein', emoji: '🫘', serving: '3–4 tbsp cooked' },
  { id: 'beans', name: 'Beans (low-salt)', group: 'protein', emoji: '🫘', serving: '3–4 tbsp' },
  { id: 'chickpeas', name: 'Chickpeas (mashed)', group: 'protein', emoji: '🫛', serving: '3–4 tbsp' },
  { id: 'tofu', name: 'Tofu', group: 'protein', emoji: '🧈', serving: '2–3 tbsp cubes' },
  { id: 'nutbutter', name: 'Smooth nut butter', group: 'protein', emoji: '🥜', serving: 'thin spread on toast', choke: 'Smooth only — never whole nuts under age 5.' },

  // ---- Fats & oils (advisory) ----
  { id: 'oliveoil', name: 'Olive oil (cooking)', group: 'fats', emoji: '🫒', serving: '½ tsp' },
  { id: 'butter', name: 'Butter/spread', group: 'fats', emoji: '🧈', serving: 'thin scrape' },

  // ---- Treats (advisory) ----
  { id: 'cake', name: 'Cake / biscuit', group: 'treats', emoji: '🍰', serving: 'tiny taste only' },
  { id: 'icecream', name: 'Ice cream', group: 'treats', emoji: '🍨', serving: 'tiny taste only' },
];

const MEAL_SLOTS = [
  { id: 'breakfast', name: 'Breakfast', emoji: '🌅' },
  { id: 'amsnack', name: 'Morning snack', emoji: '🍎' },
  { id: 'lunch', name: 'Lunch', emoji: '🍽️' },
  { id: 'pmsnack', name: 'Afternoon snack', emoji: '🧀' },
  { id: 'dinner', name: 'Dinner', emoji: '🌙' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
