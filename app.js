// 1. Date Helper (Local YYYY-MM-DD)
function getLocalDateString(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 2. State Variables
let foodEntries = [];
let savedFoods = [];
let userStats = null;
let selectedDate = getLocalDateString();
let currentBasis = '100g'; // '100g' or 'item'
let libraryTab = 'meal'; // 'meal', 'recent', or 'all'
let html5QrcodeScanner = null;

const MEAL_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];

// 3. DOM Elements
const toggleStatsBtn = document.getElementById('toggle-stats-btn');
const statsPanel = document.getElementById('stats-panel');
const statsForm = document.getElementById('stats-form');

const prevDateBtn = document.getElementById('prev-date-btn');
const nextDateBtn = document.getElementById('next-date-btn');
const datePicker = document.getElementById('date-picker');
const todayBtn = document.getElementById('today-btn');

const tabMealBtn = document.getElementById('tab-meal-btn');
const tabRecentBtn = document.getElementById('tab-recent-btn');
const tabAllBtn = document.getElementById('tab-all-btn');
const savedSearchInput = document.getElementById('saved-search');
const savedFoodsListEl = document.getElementById('saved-foods-list');
const directoryCountEl = document.getElementById('directory-count');
const statusToastEl = document.getElementById('status-toast');

const foodForm = document.getElementById('food-form');
const mealCategorySelect = document.getElementById('meal-category');
const foodNameInput = document.getElementById('food-name');
const caloriesInput = document.getElementById('calories');
const proteinInput = document.getElementById('protein');
const carbsInput = document.getElementById('carbs');
const fatInput = document.getElementById('fat');
const portionAmountInput = document.getElementById('portion-amount');

const basis100gBtn = document.getElementById('basis-100g-btn');
const basisItemBtn = document.getElementById('basis-item-btn');
const baseMacroHeading = document.getElementById('base-macro-heading');
const portionLabel = document.getElementById('portion-label');
const scaledPreviewEl = document.getElementById('scaled-preview');

const scanBtn = document.getElementById('scan-btn');
const saveOnlyBtn = document.getElementById('save-only-btn');
const readerDiv = document.getElementById('reader');
const mealsHeading = document.getElementById('meals-heading');
const groupedMealsContainer = document.getElementById('grouped-meals-container');

// Helper: Temporary Feedback Banner
function showToast(message) {
  statusToastEl.textContent = message;
  statusToastEl.style.display = 'block';
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    statusToastEl.style.display = 'none';
  }, 3000);
}

// 4. Load Saved Data on Startup
function initApp() {
  const today = getLocalDateString();
  selectedDate = today;
  datePicker.value = selectedDate;

  const savedEntries = localStorage.getItem('macroEntries');
  if (savedEntries) {
    foodEntries = JSON.parse(savedEntries);
    let migrated = false;
    foodEntries.forEach(entry => {
      if (!entry.date) {
        entry.date = today;
        migrated = true;
      }
    });
    if (migrated) {
      localStorage.setItem('macroEntries', JSON.stringify(foodEntries));
    }
  }

  const storedLibrary = localStorage.getItem('savedFoodLibrary');
  if (storedLibrary) {
    savedFoods = JSON.parse(storedLibrary).map(item => ({
      ...item,
      meals: Array.isArray(item.meals) ? item.meals : []
    }));
  }

  const savedStats = localStorage.getItem('userBodyStats');
  if (savedStats) {
    userStats = JSON.parse(savedStats);
    populateStatsForm();
  } else {
    statsPanel.style.display = 'block';
  }

  updateMealTabLabel();
  renderSavedFoods();
  updateUI();
}

// 5. Date Navigation & Daily Reset Logic
function setSelectedDate(newDateStr) {
  if (!newDateStr) return;
  selectedDate = newDateStr;
  datePicker.value = selectedDate;
  updateUI();
}

function shiftDate(days) {
  const [y, m, d] = selectedDate.split('-').map(Number);
  const shifted = new Date(y, m - 1, d + days);
  setSelectedDate(getLocalDateString(shifted));
}

prevDateBtn.addEventListener('click', () => shiftDate(-1));
nextDateBtn.addEventListener('click', () => shiftDate(1));
datePicker.addEventListener('change', (e) => setSelectedDate(e.target.value));
todayBtn.addEventListener('click', () => setSelectedDate(getLocalDateString()));

// 6. Body Stats & Mifflin-St Jeor Deficit Calculator
toggleStatsBtn.addEventListener('click', () => {
  statsPanel.style.display = statsPanel.style.display === 'none' ? 'block' : 'none';
});

function populateStatsForm() {
  if (!userStats) return;
  document.getElementById('user-sex').value = userStats.sex;
  document.getElementById('user-age').value = userStats.age;
  document.getElementById('user-weight').value = userStats.weight;
  document.getElementById('user-height').value = userStats.height;
  document.getElementById('user-activity').value = userStats.activity;
  document.getElementById('goal-adjustment').value = userStats.adjustment;
  document.getElementById('protein-ratio').value = userStats.proteinRatio;
}

function calculateTargets(stats) {
  let bmr = (10 * stats.weight) + (6.25 * stats.height) - (5 * stats.age);
  bmr += stats.sex === 'male' ? 5 : -161;

  const tdee = Math.round(bmr * stats.activity);
  const targetCalories = Math.max(1200, Math.round(tdee + stats.adjustment));

  const targetProtein = Math.round(stats.weight * stats.proteinRatio);
  const targetFat = Math.round((targetCalories * 0.25) / 9);
  const remainingCals = Math.max(0, targetCalories - (targetProtein * 4) - (targetFat * 9));
  const targetCarbs = Math.round(remainingCals / 4);

  return { tdee, targetCalories, targetProtein, targetCarbs, targetFat };
}

statsForm.addEventListener('submit', (event) => {
  event.preventDefault();

  userStats = {
    sex: document.getElementById('user-sex').value,
    age: Number(document.getElementById('user-age').value),
    weight: Number(document.getElementById('user-weight').value),
    height: Number(document.getElementById('user-height').value),
    activity: Number(document.getElementById('user-activity').value),
    adjustment: Number(document.getElementById('goal-adjustment').value) || 0,
    proteinRatio: Number(document.getElementById('protein-ratio').value) || 2.0
  };

  localStorage.setItem('userBodyStats', JSON.stringify(userStats));
  statsPanel.style.display = 'none';
  updateUI();
});

// 7. Meal-Tagged Food Directory & Recents
function updateMealTabLabel() {
  tabMealBtn.textContent = `For ${mealCategorySelect.value}`;
}

function setLibraryTab(tab) {
  libraryTab = tab;
  tabMealBtn.classList.toggle('active', tab === 'meal');
  tabRecentBtn.classList.toggle('active', tab === 'recent');
  tabAllBtn.classList.toggle('active', tab === 'all');
  renderSavedFoods(savedSearchInput.value);
}

tabMealBtn.addEventListener('click', () => setLibraryTab('meal'));
tabRecentBtn.addEventListener('click', () => setLibraryTab('recent'));
tabAllBtn.addEventListener('click', () => setLibraryTab('all'));

mealCategorySelect.addEventListener('change', () => {
  updateMealTabLabel();
  setLibraryTab('meal');
});

function saveFoodToLibrary(item, mealTag) {
  const cleanName = item.name.trim();
  if (!cleanName) return;

  const existingIndex = savedFoods.findIndex(
    f => f.name.toLowerCase() === cleanName.toLowerCase() && f.basis === item.basis
  );

  let updatedMeals = [];
  if (existingIndex !== -1 && Array.isArray(savedFoods[existingIndex].meals)) {
    updatedMeals = [...savedFoods[existingIndex].meals];
  }
  if (mealTag && !updatedMeals.includes(mealTag)) {
    updatedMeals.push(mealTag);
  }

  const libraryEntry = {
    id: existingIndex !== -1 ? savedFoods[existingIndex].id : Date.now(),
    name: cleanName,
    basis: item.basis,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    meals: updatedMeals,
    lastUsed: Date.now()
  };

  if (existingIndex !== -1) {
    savedFoods.splice(existingIndex, 1);
  }

  savedFoods.unshift(libraryEntry);

  if (savedFoods.length > 250) {
    savedFoods = savedFoods.slice(0, 250);
  }

  localStorage.setItem('savedFoodLibrary', JSON.stringify(savedFoods));
  renderSavedFoods(savedSearchInput.value);
}

function toggleMealTagOnSaved(id) {
  const item = savedFoods.find(f => f.id === id);
  if (!item) return;

  const activeMeal = mealCategorySelect.value;
  if (!Array.isArray(item.meals)) item.meals = [];

  if (item.meals.includes(activeMeal)) {
    item.meals = item.meals.filter(m => m !== activeMeal);
  } else {
    item.meals.push(activeMeal);
  }

  localStorage.setItem('savedFoodLibrary', JSON.stringify(savedFoods));
  renderSavedFoods(savedSearchInput.value);
}

function selectSavedFood(id) {
  const item = savedFoods.find(f => f.id === id);
  if (!item) return;

  setBasis(item.basis);
  foodNameInput.value = item.name;
  caloriesInput.value = item.calories;
  proteinInput.value = item.protein;
  carbsInput.value = item.carbs;
  fatInput.value = item.fat;

  portionAmountInput.value = '';
  portionAmountInput.focus();
  portionAmountInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  updateScaledPreview();
  showToast(`Loaded "${item.name}" — enter amount eaten below.`);
}

function deleteSavedFood(id) {
  savedFoods = savedFoods.filter(f => f.id !== id);
  localStorage.setItem('savedFoodLibrary', JSON.stringify(savedFoods));
  renderSavedFoods(savedSearchInput.value);
}

function renderSavedFoods(filterQuery = '') {
  directoryCountEl.textContent = `${savedFoods.length} ${savedFoods.length === 1 ? 'item' : 'items'}`;
  savedFoodsListEl.innerHTML = '';
  const query = filterQuery.trim().toLowerCase();
  const activeMeal = mealCategorySelect.value;

  let list = [...savedFoods];

  if (query) {
    list = list.filter(f => f.name.toLowerCase().includes(query));
  } else if (libraryTab === 'meal') {
    list = list.filter(f => Array.isArray(f.meals) && f.meals.includes(activeMeal));
  } else if (libraryTab === 'recent') {
    list.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
    list = list.slice(0, 10);
  } else if (libraryTab === 'all') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (list.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.style.cssText = 'font-size: 0.78rem; color: var(--text-muted); padding: 4px 0;';
    if (savedFoods.length === 0) {
      emptyMsg.textContent = 'No saved foods yet. Log an item or use "Save Food to Directory Only" below.';
    } else if (libraryTab === 'meal' && !query) {
      emptyMsg.textContent = `No foods tagged for ${activeMeal} yet. Tap Directory to tag existing items with +${activeMeal}.`;
    } else {
      emptyMsg.textContent = 'No matching foods found.';
    }
    savedFoodsListEl.appendChild(emptyMsg);
    return;
  }

  list.forEach(item => {
    const row = document.createElement('div');
    row.className = 'saved-item';
    const unitLabel = item.basis === '100g' ? 'per 100g' : 'per item';
    const tagsHtml = (item.meals || [])
      .map(m => `<span class="meal-tag-pill">${m}</span>`)
      .join('');
    const hasCurrentMealTag = (item.meals || []).includes(activeMeal);

    row.innerHTML = `
      <div class="saved-item-info" onclick="selectSavedFood(${item.id})">
        <div class="saved-item-title-row">
          <strong>${item.name}</strong>
          ${tagsHtml}
        </div>
        <small>${item.calories} kcal (${unitLabel}) • P: ${item.protein}g • C: ${item.carbs}g • F: ${item.fat}g</small>
      </div>
      <div class="saved-actions">
        <button type="button" class="tag-edit-btn ${hasCurrentMealTag ? 'tagged' : ''}" onclick="toggleMealTagOnSaved(${item.id})">
          ${hasCurrentMealTag ? `✓ ${activeMeal}` : `+ ${activeMeal}`}
        </button>
        <button type="button" class="saved-remove-btn" onclick="deleteSavedFood(${item.id})">Remove</button>
      </div>
    `;
    savedFoodsListEl.appendChild(row);
  });
}

savedSearchInput.addEventListener('input', (e) => {
  renderSavedFoods(e.target.value);
});

// Save to Directory Only button
saveOnlyBtn.addEventListener('click', () => {
  const name = foodNameInput.value.trim();
  const cals = Number(caloriesInput.value);

  if (!name || isNaN(cals) || caloriesInput.value === '') {
    alert('Enter at least a Food Name and Calories to save to your directory.');
    return;
  }

  const chosenMeal = mealCategorySelect.value;
  saveFoodToLibrary({
    name,
    basis: currentBasis,
    calories: cals,
    protein: Number(proteinInput.value) || 0,
    carbs: Number(carbsInput.value) || 0,
    fat: Number(fatInput.value) || 0
  }, chosenMeal);

  showToast(`Saved "${name}" to Directory under ${chosenMeal}.`);
});

// 8. Portion Basis Toggle & Live Scaling Calculation
function setBasis(basis) {
  currentBasis = basis;
  if (basis === '100g') {
    basis100gBtn.classList.add('active');
    basisItemBtn.classList.remove('active');
    baseMacroHeading.textContent = 'Base Nutritional Values (per 100g):';
    portionLabel.textContent = 'Amount Eaten (g)';
    portionAmountInput.value = '100';
  } else {
    basisItemBtn.classList.add('active');
    basis100gBtn.classList.remove('active');
    baseMacroHeading.textContent = 'Base Nutritional Values (per 1 item / serving):';
    portionLabel.textContent = 'Number of Items / Servings';
    portionAmountInput.value = '1';
  }
  updateScaledPreview();
}

basis100gBtn.addEventListener('click', () => setBasis('100g'));
basisItemBtn.addEventListener('click', () => setBasis('item'));

function getScaledMacros() {
  const baseCals = Number(caloriesInput.value) || 0;
  const basePro = Number(proteinInput.value) || 0;
  const baseCarbs = Number(carbsInput.value) || 0;
  const baseFat = Number(fatInput.value) || 0;
  const amount = Number(portionAmountInput.value) || 0;

  const multiplier = currentBasis === '100g' ? (amount / 100) : amount;

  return {
    calories: Math.round(baseCals * multiplier),
    protein: Number((basePro * multiplier).toFixed(1)),
    carbs: Number((baseCarbs * multiplier).toFixed(1)),
    fat: Number((baseFat * multiplier).toFixed(1)),
    portionText: currentBasis === '100g' ? `${amount}g` : `${amount} ${amount === 1 ? 'item' : 'items'}`
  };
}

function updateScaledPreview() {
  const scaled = getScaledMacros();
  scaledPreviewEl.textContent = `Logging: ${scaled.calories} kcal | P: ${scaled.protein}g | C: ${scaled.carbs}g | F: ${scaled.fat}g`;
}

[caloriesInput, proteinInput, carbsInput, fatInput, portionAmountInput].forEach(input => {
  input.addEventListener('input', updateScaledPreview);
});

// 9. Log Food Entry & Auto-Save to Directory with Meal Tag
foodForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const scaled = getScaledMacros();
  const chosenMeal = mealCategorySelect.value;

  const baseFoodData = {
    name: foodNameInput.value.trim(),
    basis: currentBasis,
    calories: Number(caloriesInput.value) || 0,
    protein: Number(proteinInput.value) || 0,
    carbs: Number(carbsInput.value) || 0,
    fat: Number(fatInput.value) || 0
  };

  saveFoodToLibrary(baseFoodData, chosenMeal);

  const newEntry = {
    id: Date.now(),
    date: selectedDate,
    meal: chosenMeal,
    name: baseFoodData.name,
    portionText: scaled.portionText,
    calories: scaled.calories,
    protein: scaled.protein,
    carbs: scaled.carbs,
    fat: scaled.fat
  };

  foodEntries.push(newEntry);
  saveAndRender();
  showToast(`Logged "${baseFoodData.name}" to ${chosenMeal} & saved to Directory.`);

  foodForm.reset();
  mealCategorySelect.value = chosenMeal;
  updateMealTabLabel();
  setBasis(currentBasis);
});

// 10. Open Food Facts Barcode Scanner
async function fetchProductByBarcode(barcode) {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 1 && data.product) {
      const product = data.product;
      const nutriments = product.nutriments || {};

      setBasis('100g');

      foodNameInput.value = product.product_name || 'Scanned Product';
      caloriesInput.value = Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0);
      proteinInput.value = (nutriments.proteins_100g || 0).toFixed(1);
      carbsInput.value = (nutriments.carbohydrates_100g || 0).toFixed(1);
      fatInput.value = (nutriments.fat_100g || 0).toFixed(1);

      portionAmountInput.value = '';
      portionAmountInput.focus();
      updateScaledPreview();
      showToast(`Scanned "${foodNameInput.value}" — enter grams eaten.`);
    } else {
      alert('Product not found in Open Food Facts. Please enter values manually.');
    }
  } catch (error) {
    console.error('Barcode fetch error:', error);
    alert('Unable to reach Open Food Facts service.');
  }
}

scanBtn.addEventListener('click', () => {
  if (readerDiv.style.display === 'block') {
    stopScanner();
    return;
  }

  readerDiv.style.display = 'block';
  scanBtn.textContent = 'Close Camera';

  html5QrcodeScanner = new Html5QrcodeScanner('reader', {
    fps: 10,
    qrbox: { width: 250, height: 150 }
  });

  html5QrcodeScanner.render(
    (decodedText) => {
      stopScanner();
      fetchProductByBarcode(decodedText);
    },
    () => {}
  );
});

function stopScanner() {
  if (html5QrcodeScanner) {
    html5QrcodeScanner.clear().catch(err => console.error(err));
  }
  readerDiv.style.display = 'none';
  scanBtn.textContent = 'Scan Barcode';
}

// 11. Delete & Render Filtered Day Meals + Deficit Status
function deleteEntry(id) {
  foodEntries = foodEntries.filter(entry => entry.id !== id);
  saveAndRender();
}

function saveAndRender() {
  localStorage.setItem('macroEntries', JSON.stringify(foodEntries));
  updateUI();
}

function updateUI() {
  const isToday = selectedDate === getLocalDateString();
  todayBtn.style.display = isToday ? 'none' : 'inline-block';
  mealsHeading.textContent = isToday ? "Today's Meals" : `Meals for ${selectedDate}`;

  const dayEntries = foodEntries.filter(entry => entry.date === selectedDate);

  let caloriesSum = 0;
  let proteinSum = 0;
  let carbsSum = 0;
  let fatSum = 0;

  dayEntries.forEach(entry => {
    caloriesSum += entry.calories;
    proteinSum += entry.protein;
    carbsSum += entry.carbs;
    fatSum += entry.fat;
  });

  document.getElementById('total-calories').textContent = Math.round(caloriesSum);
  document.getElementById('total-protein').textContent = `${proteinSum.toFixed(1)}g`;
  document.getElementById('total-carbs').textContent = `${carbsSum.toFixed(1)}g`;
  document.getElementById('total-fat').textContent = `${fatSum.toFixed(1)}g`;

  const deficitBanner = document.getElementById('deficit-banner');
  if (userStats) {
    const targets = calculateTargets(userStats);
    document.getElementById('target-calories-sub').textContent = `Goal: ${targets.targetCalories}`;
    document.getElementById('target-protein-sub').textContent = `Goal: ${targets.targetProtein}g`;
    document.getElementById('target-carbs-sub').textContent = `Goal: ${targets.targetCarbs}g`;
    document.getElementById('target-fat-sub').textContent = `Goal: ${targets.targetFat}g`;

    const currentDeficit = targets.tdee - Math.round(caloriesSum);
    const remainingToTarget = targets.targetCalories - Math.round(caloriesSum);

    if (currentDeficit >= 0) {
      deficitBanner.className = 'deficit-banner in-deficit';
      deficitBanner.textContent = `Deficit: ${currentDeficit} kcal below maintenance (${remainingToTarget >= 0 ? remainingToTarget + ' kcal left to goal' : Math.abs(remainingToTarget) + ' kcal over goal'})`;
    } else {
      deficitBanner.className = 'deficit-banner in-surplus';
      deficitBanner.textContent = `Surplus: ${Math.abs(currentDeficit)} kcal above maintenance (${targets.tdee} kcal TDEE)`;
    }
  }

  groupedMealsContainer.innerHTML = '';

  if (dayEntries.length === 0) {
    groupedMealsContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">No food logged for ${isToday ? 'today' : selectedDate}.</p>`;
    return;
  }

  MEAL_CATEGORIES.forEach(category => {
    const categoryItems = dayEntries.filter(item => (item.meal || 'Snack') === category);
    if (categoryItems.length === 0) return;

    const mealCals = categoryItems.reduce((sum, item) => sum + item.calories, 0);
    const mealProtein = categoryItems.reduce((sum, item) => sum + item.protein, 0);

    const section = document.createElement('div');
    section.className = 'meal-section';
    section.innerHTML = `
      <div class="meal-header">
        <h3>${category}</h3>
        <span>${Math.round(mealCals)} kcal | ${mealProtein.toFixed(1)}g P</span>
      </div>
      <ul class="log-list"></ul>
    `;

    const ul = section.querySelector('.log-list');
    categoryItems.forEach(entry => {
      const li = document.createElement('li');
      li.className = 'log-item';
      const portionBadge = entry.portionText ? ` (${entry.portionText})` : '';
      li.innerHTML = `
        <div class="food-info">
          <h4>${entry.name}${portionBadge}</h4>
          <p>${entry.calories} kcal | P: ${entry.protein}g | C: ${entry.carbs}g | F: ${entry.fat}g</p>
        </div>
        <button class="delete-btn" onclick="deleteEntry(${entry.id})">Delete</button>
      `;
      ul.appendChild(li);
    });

    groupedMealsContainer.appendChild(section);
  });
}

// 12. Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
  });
}

initApp();