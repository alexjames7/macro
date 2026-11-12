// 1. State Variables
let foodEntries = [];
let userStats = null;
let currentBasis = '100g'; // '100g' or 'item'
let html5QrcodeScanner = null;

const MEAL_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];

// 2. DOM Elements
const toggleStatsBtn = document.getElementById('toggle-stats-btn');
const statsPanel = document.getElementById('stats-panel');
const statsForm = document.getElementById('stats-form');

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
const readerDiv = document.getElementById('reader');
const groupedMealsContainer = document.getElementById('grouped-meals-container');

// 3. Load Saved Data on Startup
function initApp() {
  const savedEntries = localStorage.getItem('macroEntries');
  if (savedEntries) {
    foodEntries = JSON.parse(savedEntries);
  }

  const savedStats = localStorage.getItem('userBodyStats');
  if (savedStats) {
    userStats = JSON.parse(savedStats);
    populateStatsForm();
  } else {
    // Show body stats setup on first launch
    statsPanel.style.display = 'block';
  }

  updateUI();
}

// 4. Body Stats & Mifflin-St Jeor Deficit Calculator
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
  // Mifflin-St Jeor BMR formula
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

// 5. Portion Basis Toggle & Live Scaling Calculation
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

// Listen for live typing on macro and portion fields
[caloriesInput, proteinInput, carbsInput, fatInput, portionAmountInput].forEach(input => {
  input.addEventListener('input', updateScaledPreview);
});

// 6. Log Food Entry
foodForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const scaled = getScaledMacros();

  const newEntry = {
    id: Date.now(),
    meal: mealCategorySelect.value,
    name: foodNameInput.value.trim(),
    portionText: scaled.portionText,
    calories: scaled.calories,
    protein: scaled.protein,
    carbs: scaled.carbs,
    fat: scaled.fat
  };

  foodEntries.push(newEntry);
  saveAndRender();

  // Keep selected meal category, reset food fields
  const currentMeal = mealCategorySelect.value;
  foodForm.reset();
  mealCategorySelect.value = currentMeal;
  setBasis(currentBasis);
});

// 7. Open Food Facts Barcode Scanner
async function fetchProductByBarcode(barcode) {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 1 && data.product) {
      const product = data.product;
      const nutriments = product.nutriments || {};

      // Switch to per 100g mode automatically
      setBasis('100g');

      foodNameInput.value = product.product_name || 'Scanned Product';
      caloriesInput.value = Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0);
      proteinInput.value = (nutriments.proteins_100g || 0).toFixed(1);
      carbsInput.value = (nutriments.carbohydrates_100g || 0).toFixed(1);
      fatInput.value = (nutriments.fat_100g || 0).toFixed(1);

      // Prompt user to enter actual portion weight eaten
      portionAmountInput.value = '';
      portionAmountInput.focus();
      updateScaledPreview();
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

// 8. Delete & Render Grouped Meals + Deficit Status
function deleteEntry(id) {
  foodEntries = foodEntries.filter(entry => entry.id !== id);
  saveAndRender();
}

function saveAndRender() {
  localStorage.setItem('macroEntries', JSON.stringify(foodEntries));
  updateUI();
}

function updateUI() {
  let caloriesSum = 0;
  let proteinSum = 0;
  let carbsSum = 0;
  let fatSum = 0;

  foodEntries.forEach(entry => {
    caloriesSum += entry.calories;
    proteinSum += entry.protein;
    carbsSum += entry.carbs;
    fatSum += entry.fat;
  });

  // Update main dashboard figures
  document.getElementById('total-calories').textContent = Math.round(caloriesSum);
  document.getElementById('total-protein').textContent = `${proteinSum.toFixed(1)}g`;
  document.getElementById('total-carbs').textContent = `${carbsSum.toFixed(1)}g`;
  document.getElementById('total-fat').textContent = `${fatSum.toFixed(1)}g`;

  // Update targets and live deficit banner if body stats exist
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

  // Render meals grouped by category
  groupedMealsContainer.innerHTML = '';

  if (foodEntries.length === 0) {
    groupedMealsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No food logged today yet.</p>';
    return;
  }

  MEAL_CATEGORIES.forEach(category => {
    const categoryItems = foodEntries.filter(item => (item.meal || 'Snack') === category);
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

// 9. Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
  });
}

initApp();