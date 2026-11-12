// 1. Date & Time Helpers
function getLocalDateString(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLocalTimeString(dateObj = new Date()) {
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const mins = String(dateObj.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

// 2. State Variables
let foodEntries = [];
let savedFoods = [];
let weightEntries = [];
let userStats = null;
let cloudSyncUrl = '';
let selectedDate = getLocalDateString();
let currentBasis = '100g';
let libraryTab = 'meal';
let html5QrcodeScanner = null;

const MEAL_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];

// 3. DOM Elements
const toggleCloudBtn = document.getElementById('toggle-cloud-btn');
const cloudPanel = document.getElementById('cloud-panel');
const syncDot = document.getElementById('sync-dot');
const syncStatusText = document.getElementById('sync-status-text');
const cloudUrlInput = document.getElementById('cloud-url-input');
const saveCloudUrlBtn = document.getElementById('save-cloud-url-btn');
const syncNowBtn = document.getElementById('sync-now-btn');
const pushAllBtn = document.getElementById('push-all-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');

const toggleWeightBtn = document.getElementById('toggle-weight-btn');
const weightPanel = document.getElementById('weight-panel');
const weightForm = document.getElementById('weight-form');
const weighInValueInput = document.getElementById('weigh-in-value');
const weighInNoteInput = document.getElementById('weigh-in-note');
const weightHistoryList = document.getElementById('weight-history-list');

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

function showToast(message) {
  statusToastEl.textContent = message;
  statusToastEl.style.display = 'block';
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    statusToastEl.style.display = 'none';
  }, 3200);
}

// 4. Collapsible Top Panels (Mutually Exclusive for Clean Mobile UX)
function togglePanel(targetPanel) {
  const panels = [cloudPanel, weightPanel, statsPanel];
  panels.forEach(panel => {
    if (panel === targetPanel) {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    } else {
      panel.style.display = 'none';
    }
  });
}

toggleCloudBtn.addEventListener('click', () => togglePanel(cloudPanel));
toggleWeightBtn.addEventListener('click', () => togglePanel(weightPanel));
toggleStatsBtn.addEventListener('click', () => togglePanel(statsPanel));

// 5. Initialise App
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
    if (migrated) localStorage.setItem('macroEntries', JSON.stringify(foodEntries));
  }

  const storedLibrary = localStorage.getItem('savedFoodLibrary');
  if (storedLibrary) {
    savedFoods = JSON.parse(storedLibrary).map(item => ({
      ...item,
      meals: Array.isArray(item.meals) ? item.meals : []
    }));
  }

  const storedWeights = localStorage.getItem('weightLogHistory');
  if (storedWeights) {
    weightEntries = JSON.parse(storedWeights);
  }

  const savedStats = localStorage.getItem('userBodyStats');
  if (savedStats) {
    userStats = JSON.parse(savedStats);
    populateStatsForm();
  }

  const savedCloudUrl = localStorage.getItem('googleSheetsSyncUrl');
  if (savedCloudUrl) {
    cloudSyncUrl = savedCloudUrl;
    cloudUrlInput.value = cloudSyncUrl;
  } else if (!userStats) {
    statsPanel.style.display = 'block';
  }

  updateMealTabLabel();
  renderSavedFoods();
  renderWeightHistory();
  updateUI();

  if (cloudSyncUrl) {
    syncFromCloud(true);
  }
}

// 6. Google Sheets Two-Way Sync Engine
function setSyncIndicator(state, message) {
  syncDot.className = `sync-dot ${state}`;
  if (message) {
    syncStatusText.textContent = message;
  }
}

async function postToCloud(payload) {
  if (!cloudSyncUrl) return;
  setSyncIndicator('syncing', 'Syncing with Google Sheets...');

  try {
    const response = await fetch(cloudSyncUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.status === 'ok') {
      setSyncIndicator('connected', `Synced with Google Sheets (${getLocalTimeString()})`);
    } else {
      setSyncIndicator('error', `Sync warning: ${result.message}`);
    }
  } catch (err) {
    console.error('Cloud POST error:', err);
    setSyncIndicator('error', 'Offline or unreachable — saved locally on device.');
  }
}

async function syncFromCloud(silent = false) {
  if (!cloudSyncUrl) {
    if (!silent) alert('Paste your Google Apps Script Web App URL first.');
    return;
  }

  setSyncIndicator('syncing', 'Pulling latest data from Google Sheets...');

  try {
    const response = await fetch(cloudSyncUrl, {
      redirect: 'follow',
      cache: 'no-store'
    });
    const data = await response.json();

    if (data.status === 'ok') {
      const sheetIsEmpty =
        data.entries.length === 0 &&
        data.directory.length === 0 &&
        !data.stats &&
        data.weights.length === 0;

      const deviceHasData =
        foodEntries.length > 0 ||
        savedFoods.length > 0 ||
        userStats !== null ||
        weightEntries.length > 0;

      // On first connect to a blank sheet, upload existing device data instead of wiping it
      if (sheetIsEmpty && deviceHasData) {
        await pushAllToCloud();
        return;
      }

      foodEntries = data.entries;
      savedFoods = data.directory;
      weightEntries = data.weights;
      if (data.stats) {
        userStats = data.stats;
        localStorage.setItem('userBodyStats', JSON.stringify(userStats));
        populateStatsForm();
      }

      localStorage.setItem('macroEntries', JSON.stringify(foodEntries));
      localStorage.setItem('savedFoodLibrary', JSON.stringify(savedFoods));
      localStorage.setItem('weightLogHistory', JSON.stringify(weightEntries));

      renderSavedFoods(savedSearchInput.value);
      renderWeightHistory();
      updateUI();

      setSyncIndicator('connected', `Synced with Google Sheets (${getLocalTimeString()})`);
      if (!silent) showToast('Synced latest entries, directory, and stats from Google Sheets.');
    } else {
      setSyncIndicator('error', `Sync error: ${data.message}`);
    }
  } catch (err) {
    console.error('Cloud GET error:', err);
    setSyncIndicator('error', 'Unable to reach Google Sheets — working offline.');
  }
}

async function pushAllToCloud() {
  if (!cloudSyncUrl) {
    alert('Paste your Google Apps Script Web App URL first.');
    return;
  }

  await postToCloud({
    action: 'pushAll',
    entries: foodEntries,
    directory: savedFoods,
    stats: userStats,
    weights: weightEntries
  });

  showToast('Uploaded local logs, directory, and stats to Google Sheets.');
}

saveCloudUrlBtn.addEventListener('click', () => {
  const url = cloudUrlInput.value.trim();
  if (!url) {
    localStorage.removeItem('googleSheetsSyncUrl');
    cloudSyncUrl = '';
    setSyncIndicator('', 'Cloud sync disconnected.');
    return;
  }
  cloudSyncUrl = url;
  localStorage.setItem('googleSheetsSyncUrl', cloudSyncUrl);
  syncFromCloud(false);
});

syncNowBtn.addEventListener('click', () => syncFromCloud(false));
pushAllBtn.addEventListener('click', () => pushAllToCloud());

// 7. One-Click CSV Download (Opens in Excel / Numbers)
exportCsvBtn.addEventListener('click', () => {
  if (foodEntries.length === 0) {
    alert('No food entries logged yet to export.');
    return;
  }

  const headers = ['Date', 'Time', 'Meal', 'Food Name', 'Portion', 'Calories (kcal)', 'Protein (g)', 'Carbs (g)', 'Fat (g)'];
  const sorted = [...foodEntries].sort((a, b) => a.date.localeCompare(b.date));

  const rows = sorted.map(e => [
    e.date,
    e.time || '',
    e.meal,
    `"${String(e.name).replace(/"/g, '""')}"`,
    `"${String(e.portionText || '').replace(/"/g, '""')}"`,
    e.calories,
    e.protein,
    e.carbs,
    e.fat
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `macro-tracker-log-${getLocalDateString()}.csv`;
  link.click();
});

// 8. Quick Body Weight Logger
weightForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const weightVal = Number(weighInValueInput.value);
  if (!weightVal || weightVal <= 0) return;

  const entry = {
    id: Date.now(),
    date: selectedDate,
    time: getLocalTimeString(),
    weight: weightVal,
    notes: weighInNoteInput.value.trim()
  };

  weightEntries.unshift(entry);
  localStorage.setItem('weightLogHistory', JSON.stringify(weightEntries));
  postToCloud({ action: 'logWeight', weightEntry: entry });

  // Automatically update Body Stats weight & recalculate targets if stats exist
  if (userStats) {
    userStats.weight = weightVal;
    localStorage.setItem('userBodyStats', JSON.stringify(userStats));
    populateStatsForm();
    postToCloud({ action: 'saveStats', stats: userStats });
  }

  weighInValueInput.value = '';
  weighInNoteInput.value = '';
  renderWeightHistory();
  updateUI();
  showToast(`Logged ${weightVal} kg${userStats ? ' & updated daily targets' : ''}.`);
});

function deleteWeightEntry(id) {
  weightEntries = weightEntries.filter(w => w.id !== id);
  localStorage.setItem('weightLogHistory', JSON.stringify(weightEntries));
  postToCloud({ action: 'deleteWeight', id });
  renderWeightHistory();
}

function renderWeightHistory() {
  weightHistoryList.innerHTML = '';
  if (weightEntries.length === 0) {
    weightHistoryList.innerHTML = '<p style="font-size: 0.78rem; color: var(--text-muted);">No weigh-ins recorded yet.</p>';
    return;
  }

  const sorted = [...weightEntries].sort((a, b) => b.id - a.id);

  sorted.forEach((item, idx) => {
    let deltaHtml = '';
    if (idx < sorted.length - 1) {
      const diff = Number((item.weight - sorted[idx + 1].weight).toFixed(1));
      if (diff !== 0) {
        const cls = diff < 0 ? 'down' : 'up';
        const sign = diff > 0 ? '+' : '';
        deltaHtml = `<span class="weight-delta ${cls}">${sign}${diff} kg</span>`;
      }
    }

    const row = document.createElement('div');
    row.className = 'weight-row';
    row.innerHTML = `
      <div>
        <strong>${item.weight.toFixed(1)} kg</strong>${deltaHtml}
        <span style="color: var(--text-muted); font-size: 0.76rem; display: block;">
          ${item.date}${item.notes ? ` • ${item.notes}` : ''}
        </span>
      </div>
      <button type="button" class="saved-remove-btn" onclick="deleteWeightEntry(${item.id})">Delete</button>
    `;
    weightHistoryList.appendChild(row);
  });
}

// 9. Date Navigation & Daily Reset Logic
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

// 10. Body Stats & Mifflin-St Jeor Deficit Calculator
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
  postToCloud({ action: 'saveStats', stats: userStats });
  statsPanel.style.display = 'none';
  updateUI();
  showToast('Body stats saved & synced.');
});

// 11. Meal-Tagged Food Directory & Recents
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
  postToCloud({ action: 'upsertFood', food: libraryEntry });
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
  postToCloud({ action: 'upsertFood', food: item });
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
  postToCloud({ action: 'deleteFood', id });
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

// 12. Portion Basis Toggle & Live Scaling Calculation
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

// 13. Log Food Entry, Save to Directory & Sync to Google Sheets
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
    time: getLocalTimeString(),
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
  postToCloud({ action: 'addEntry', entry: newEntry });
  showToast(`Logged "${baseFoodData.name}" to ${chosenMeal}.`);

  foodForm.reset();
  mealCategorySelect.value = chosenMeal;
  updateMealTabLabel();
  setBasis(currentBasis);
});

// 14. Open Food Facts Barcode Scanner
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

// 15. Delete & Render Filtered Day Meals + Deficit Status
function deleteEntry(id) {
  foodEntries = foodEntries.filter(entry => entry.id !== id);
  saveAndRender();
  postToCloud({ action: 'deleteEntry', id });
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

// 16. Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
  });
}

initApp();