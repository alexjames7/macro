// 1. Date, Time & HTML Escape Helpers
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

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 2. State Variables
let foodEntries = [];
let savedFoods = [];
let weightEntries = [];
let userStats = null;
let cloudSyncUrl = '';
let selectedDate = getLocalDateString();
let currentBasis = '100g'; // '100g' or 'item'
let libraryTab = 'meal'; // 'meal', 'presets', 'recent', or 'all'
let dashboardMode = 'consumed'; // 'consumed' or 'remaining'
let insightsPeriod = '7'; // '7', '30', '90', or 'all'
let presetDraftIngredients = [];
let html5QrcodeScanner = null;

const MEAL_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// 3. DOM Elements
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const metaThemeColor = document.getElementById('meta-theme-color');

const toggleInsightsBtn = document.getElementById('toggle-insights-btn');
const insightsPanel = document.getElementById('insights-panel');
const insightsContent = document.getElementById('insights-content');

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

const datePicker = document.getElementById('date-picker');
const todayBtn = document.getElementById('today-btn');
const streakCountEl = document.getElementById('streak-count');
const weekStripEl = document.getElementById('week-strip');

const toggleDashModeBtn = document.getElementById('toggle-dash-mode-btn');
const calHeroMain = document.getElementById('cal-hero-main');
const calHeroSub = document.getElementById('cal-hero-sub');
const calProgressBar = document.getElementById('cal-progress-bar');
const proValText = document.getElementById('pro-val-text');
const proProgressBar = document.getElementById('pro-progress-bar');
const carbValText = document.getElementById('carb-val-text');
const carbProgressBar = document.getElementById('carb-progress-bar');
const fatValText = document.getElementById('fat-val-text');
const fatProgressBar = document.getElementById('fat-progress-bar');

const tabMealBtn = document.getElementById('tab-meal-btn');
const tabPresetsBtn = document.getElementById('tab-presets-btn');
const tabRecentBtn = document.getElementById('tab-recent-btn');
const tabAllBtn = document.getElementById('tab-all-btn');
const savedSearchInput = document.getElementById('saved-search');
const savedFoodsListEl = document.getElementById('saved-foods-list');
const directoryCountEl = document.getElementById('directory-count');
const statusToastEl = document.getElementById('status-toast');
const ocrStatusBoxEl = document.getElementById('ocr-status-box');

const openPresetBuilderBtn = document.getElementById('open-preset-builder-btn');
const presetBuilderBox = document.getElementById('preset-builder-box');
const presetNameInput = document.getElementById('preset-name-input');
const presetMealSelect = document.getElementById('preset-meal-select');
const presetIngSelect = document.getElementById('preset-ing-select');
const presetIngAmount = document.getElementById('preset-ing-amount');
const presetAddIngBtn = document.getElementById('preset-add-ing-btn');
const presetIngList = document.getElementById('preset-ing-list');
const presetTotalPreview = document.getElementById('preset-total-preview');
const savePresetBtn = document.getElementById('save-preset-btn');
const cancelPresetBtn = document.getElementById('cancel-preset-btn');

const logFoodCard = document.getElementById('log-food-card');
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
const scanLabelBtn = document.getElementById('scan-label-btn');
const ocrFileInput = document.getElementById('ocr-file-input');
const saveOnlyBtn = document.getElementById('save-only-btn');
const readerDiv = document.getElementById('reader');
const groupedMealsContainer = document.getElementById('grouped-meals-container');

function showToast(message) {
  statusToastEl.textContent = message;
  statusToastEl.style.display = 'block';
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    statusToastEl.style.display = 'none';
  }, 3200);
}

// 4. Dark Navy Theme Toggle
function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggleBtn.textContent = 'Light';
    metaThemeColor.setAttribute('content', '#0b1120');
  } else {
    document.documentElement.removeAttribute('data-theme');
    themeToggleBtn.textContent = 'Dark';
    metaThemeColor.setAttribute('content', '#2563eb');
  }
  localStorage.setItem('macroTheme', theme);
}

themeToggleBtn.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  applyTheme(isDark ? 'light' : 'dark');
});

// 5. Collapsible Top Panels
function togglePanel(targetPanel, triggerBtn) {
  const map = [
    { panel: insightsPanel, btn: toggleInsightsBtn },
    { panel: cloudPanel, btn: toggleCloudBtn },
    { panel: weightPanel, btn: toggleWeightBtn },
    { panel: statsPanel, btn: toggleStatsBtn }
  ];

  map.forEach(({ panel, btn }) => {
    if (panel === targetPanel) {
      const opening = panel.style.display === 'none';
      panel.style.display = opening ? 'block' : 'none';
      btn.classList.toggle('active-pill', opening);
      if (opening && panel === insightsPanel) {
        renderInsights();
      }
    } else {
      panel.style.display = 'none';
      btn.classList.remove('active-pill');
    }
  });
}

toggleInsightsBtn.addEventListener('click', () => togglePanel(insightsPanel, toggleInsightsBtn));
toggleCloudBtn.addEventListener('click', () => togglePanel(cloudPanel, toggleCloudBtn));
toggleWeightBtn.addEventListener('click', () => togglePanel(weightPanel, toggleWeightBtn));
toggleStatsBtn.addEventListener('click', () => togglePanel(statsPanel, toggleStatsBtn));

// 6. Initialise App
function initApp() {
  const savedTheme = localStorage.getItem('macroTheme') || 'light';
  applyTheme(savedTheme);

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
    savedFoods = JSON.parse(storedLibrary).map(unpackDirectoryItem);
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
    toggleStatsBtn.classList.add('active-pill');
  }

  updateMealTabLabel();
  renderSavedFoods();
  renderWeightHistory();
  updateUI();

  if (cloudSyncUrl) {
    syncFromCloud(true);
  }
}

// Helpers to pack/unpack Meal Presets cleanly inside existing Google Sheet schema
function packDirectoryItemForCloud(item) {
  return {
    ...item,
    basis: item.basis === 'preset'
      ? `preset::${item.ingredientsSummary || ''}`
      : item.basis
  };
}

function unpackDirectoryItem(raw) {
  let basis = raw.basis || '100g';
  let ingredientsSummary = raw.ingredientsSummary || '';
  if (typeof basis === 'string' && basis.startsWith('preset::')) {
    ingredientsSummary = basis.slice('preset::'.length);
    basis = 'preset';
  }
  return {
    ...raw,
    basis,
    ingredientsSummary,
    meals: Array.isArray(raw.meals) ? raw.meals : []
  };
}

// 7. Google Sheets Two-Way Sync Engine
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

      if (sheetIsEmpty && deviceHasData) {
        await pushAllToCloud();
        return;
      }

      foodEntries = data.entries;
      savedFoods = (data.directory || []).map(unpackDirectoryItem);
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
      if (insightsPanel.style.display !== 'none') renderInsights();

      setSyncIndicator('connected', `Synced with Google Sheets (${getLocalTimeString()})`);
      if (!silent) showToast('Synced latest entries, presets, and stats from Google Sheets.');
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
    directory: savedFoods.map(packDirectoryItemForCloud),
    stats: userStats,
    weights: weightEntries
  });

  showToast('Uploaded local logs, presets, and stats to Google Sheets.');
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

// 8. One-Click CSV Download
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

// 9. Native Mobile Insights View
document.querySelectorAll('.period-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    insightsPeriod = btn.dataset.days;
    renderInsights();
  });
});

function renderInsights() {
  const todayStr = getLocalDateString();
  let cutoffStr = '';

  if (insightsPeriod !== 'all') {
    const days = Number(insightsPeriod);
    const [y, m, d] = todayStr.split('-').map(Number);
    const cutoffDate = new Date(y, m - 1, d - (days - 1));
    cutoffStr = getLocalDateString(cutoffDate);
  }

  const filteredEntries = foodEntries.filter(e => !cutoffStr || e.date >= cutoffStr);
  const filteredWeights = weightEntries
    .filter(w => !cutoffStr || w.date >= cutoffStr)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

  if (filteredEntries.length === 0) {
    insightsContent.innerHTML = '<p style="font-size: 0.84rem; color: var(--text-muted);">No entries logged in this time period yet.</p>';
    return;
  }

  const uniqueDays = new Set(filteredEntries.map(e => e.date)).size;
  const totalCals = filteredEntries.reduce((s, e) => s + e.calories, 0);
  const totalPro = filteredEntries.reduce((s, e) => s + e.protein, 0);
  const avgCals = Math.round(totalCals / uniqueDays);
  const avgPro = (totalPro / uniqueDays).toFixed(1);

  let weightDeltaStr = '—';
  if (filteredWeights.length >= 2) {
    const diff = Number((filteredWeights[filteredWeights.length - 1].weight - filteredWeights[0].weight).toFixed(1));
    weightDeltaStr = `${diff > 0 ? '+' : ''}${diff} kg`;
  } else if (filteredWeights.length === 1) {
    weightDeltaStr = `${filteredWeights[0].weight.toFixed(1)} kg`;
  }

  // Category Breakdown
  let catBarsHtml = '<h3 style="font-size: 0.85rem; margin-bottom: 8px;">Calories by Meal Category</h3>';
  MEAL_CATEGORIES.forEach(cat => {
    const catItems = filteredEntries.filter(e => (e.meal || 'Snack') === cat);
    const catCals = catItems.reduce((s, e) => s + e.calories, 0);
    const catPro = catItems.reduce((s, e) => s + e.protein, 0);
    const pct = totalCals > 0 ? Math.round((catCals / totalCals) * 100) : 0;

    catBarsHtml += `
      <div class="insight-bar-row">
        <div class="insight-bar-labels">
          <span>${cat} (${pct}%)</span>
          <span style="color: var(--text-muted);">${Math.round(catCals)} kcal • ${catPro.toFixed(0)}g P</span>
        </div>
        <div class="progress-track slim">
          <div class="progress-fill" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  });

  // Top 5 Foods
  const foodMap = {};
  filteredEntries.forEach(e => {
    const key = e.name.trim();
    if (!foodMap[key]) foodMap[key] = { name: key, count: 0, cals: 0, pro: 0 };
    foodMap[key].count += 1;
    foodMap[key].cals += e.calories;
    foodMap[key].pro += e.protein;
  });
  const topFoods = Object.values(foodMap).sort((a, b) => b.cals - a.cals).slice(0, 5);

  let topFoodsHtml = '<h3 style="font-size: 0.85rem; margin: 14px 0 6px;">Top Calorie Contributors</h3>';
  topFoods.forEach(f => {
    topFoodsHtml += `
      <div class="weight-row">
        <div>
          <strong>${escapeHtml(f.name)}</strong>
          <span style="color: var(--text-muted); font-size: 0.75rem;"> (${f.count}x)</span>
        </div>
        <span style="font-weight: 700; font-size: 0.82rem;">${Math.round(f.cals)} kcal • ${Math.round(f.pro)}g P</span>
      </div>
    `;
  });

  insightsContent.innerHTML = `
    <div class="insights-kpis">
      <div class="kpi-box"><span>Avg Daily Calories</span><strong>${avgCals.toLocaleString()} kcal</strong></div>
      <div class="kpi-box"><span>Avg Daily Protein</span><strong>${avgPro} g</strong></div>
      <div class="kpi-box"><span>Days Logged</span><strong>${uniqueDays} ${uniqueDays === 1 ? 'day' : 'days'}</strong></div>
      <div class="kpi-box"><span>Weight Trend</span><strong>${weightDeltaStr}</strong></div>
    </div>
    ${catBarsHtml}
    ${topFoodsHtml}
  `;
}

// 10. Quick Body Weight Logger
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
          ${item.date}${item.notes ? ` • ${escapeHtml(item.notes)}` : ''}
        </span>
      </div>
      <button type="button" class="saved-remove-btn" onclick="deleteWeightEntry(${item.id})">Delete</button>
    `;
    weightHistoryList.appendChild(row);
  });
}

// 11. 7-Day Ring Strip, Streak Counter & Date Selection
function setSelectedDate(newDateStr) {
  if (!newDateStr) return;
  selectedDate = newDateStr;
  datePicker.value = selectedDate;
  updateUI();
}

datePicker.addEventListener('change', (e) => setSelectedDate(e.target.value));
todayBtn.addEventListener('click', () => setSelectedDate(getLocalDateString()));

function calculateStreak() {
  const loggedDates = new Set(foodEntries.map(e => e.date));
  if (loggedDates.size === 0) return 0;

  let streak = 0;
  const now = new Date();
  let checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // If nothing logged yet today, check if streak is alive from yesterday
  if (!loggedDates.has(getLocalDateString(checkDate))) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (loggedDates.has(getLocalDateString(checkDate))) {
    streak += 1;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

function renderWeekStrip(targetCalories) {
  const [y, m, d] = selectedDate.split('-').map(Number);
  const currentObj = new Date(y, m - 1, d);
  // Monday = 0, Sunday = 6
  const dayOfWeek = (currentObj.getDay() + 6) % 7;
  const mondayObj = new Date(y, m - 1, d - dayOfWeek);

  const circumference = 2 * Math.PI * 12; // r = 12 -> ~75.4
  const calGoal = targetCalories || 2000;

  weekStripEl.innerHTML = '';

  for (let i = 0; i < 7; i++) {
    const dayObj = new Date(mondayObj.getFullYear(), mondayObj.getMonth(), mondayObj.getDate() + i);
    const dateStr = getLocalDateString(dayObj);
    const dayCals = foodEntries
      .filter(e => e.date === dateStr)
      .reduce((sum, e) => sum + e.calories, 0);

    const ratio = Math.min(1, dayCals / calGoal);
    const offset = circumference * (1 - ratio);
    const isComplete = dayCals >= calGoal * 0.9 && dayCals <= calGoal * 1.1;
    const isSelected = dateStr === selectedDate;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `day-ring-btn ${isSelected ? 'selected' : ''}`;
    btn.onclick = () => setSelectedDate(dateStr);

    btn.innerHTML = `
      <span class="day-ring-letter">${DAY_LETTERS[i]}</span>
      <svg class="ring-svg" viewBox="0 0 30 30">
        <circle class="ring-track" cx="15" cy="15" r="12"></circle>
        <circle class="ring-fill ${isComplete ? 'complete' : ''}" cx="15" cy="15" r="12"
          stroke-dasharray="${circumference.toFixed(1)}"
          stroke-dashoffset="${offset.toFixed(1)}"></circle>
      </svg>
      <span class="day-ring-num">${dayObj.getDate()}</span>
    `;
    weekStripEl.appendChild(btn);
  }

  streakCountEl.textContent = `${calculateStreak()}d`;
}

// 12. Body Stats & Deficit Targets + Dashboard Mode Toggle
toggleDashModeBtn.addEventListener('click', () => {
  dashboardMode = dashboardMode === 'consumed' ? 'remaining' : 'consumed';
  toggleDashModeBtn.innerHTML = dashboardMode === 'consumed'
    ? '&#8644; Showing Consumed'
    : '&#8644; Showing Remaining';
  updateUI();
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
  postToCloud({ action: 'saveStats', stats: userStats });
  statsPanel.style.display = 'none';
  toggleStatsBtn.classList.remove('active-pill');
  updateUI();
  showToast('Body stats saved & synced.');
});

// 13. Directory, Meal Presets & Recents
function updateMealTabLabel() {
  tabMealBtn.textContent = `For ${mealCategorySelect.value}`;
}

function setLibraryTab(tab) {
  libraryTab = tab;
  tabMealBtn.classList.toggle('active', tab === 'meal');
  tabPresetsBtn.classList.toggle('active', tab === 'presets');
  tabRecentBtn.classList.toggle('active', tab === 'recent');
  tabAllBtn.classList.toggle('active', tab === 'all');
  renderSavedFoods(savedSearchInput.value);
}

tabMealBtn.addEventListener('click', () => setLibraryTab('meal'));
tabPresetsBtn.addEventListener('click', () => setLibraryTab('presets'));
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
    ingredientsSummary: item.ingredientsSummary || (existingIndex !== -1 ? savedFoods[existingIndex].ingredientsSummary : ''),
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
  postToCloud({ action: 'upsertFood', food: packDirectoryItemForCloud(libraryEntry) });
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
  postToCloud({ action: 'upsertFood', food: packDirectoryItemForCloud(item) });
  renderSavedFoods(savedSearchInput.value);
}

function selectSavedFood(id) {
  const item = savedFoods.find(f => f.id === id);
  if (!item) return;

  if (item.basis === 'preset') {
    setBasis('item');
    foodNameInput.value = item.name;
    caloriesInput.value = item.calories;
    proteinInput.value = item.protein;
    carbsInput.value = item.carbs;
    fatInput.value = item.fat;
    portionAmountInput.value = '1';
    updateScaledPreview();
    showToast(`Loaded preset "${item.name}" (1 serving) — adjust multiplier if needed.`);
    return;
  }

  setBasis(item.basis);
  foodNameInput.value = item.name;
  caloriesInput.value = item.calories;
  proteinInput.value = item.protein;
  carbsInput.value = item.carbs;
  fatInput.value = item.fat;

  portionAmountInput.value = '';
  portionAmountInput.focus();
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
  directoryCountEl.textContent = savedFoods.length;
  savedFoodsListEl.innerHTML = '';
  const query = filterQuery.trim().toLowerCase();
  const activeMeal = mealCategorySelect.value;

  let list = [...savedFoods];

  if (query) {
    list = list.filter(f => f.name.toLowerCase().includes(query));
  } else if (libraryTab === 'meal') {
    list = list.filter(f => Array.isArray(f.meals) && f.meals.includes(activeMeal));
  } else if (libraryTab === 'presets') {
    list = list.filter(f => f.basis === 'preset');
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
      emptyMsg.textContent = 'No saved foods yet. Log an item or tap "+ Create Meal Preset" above.';
    } else if (libraryTab === 'presets' && !query) {
      emptyMsg.textContent = 'No multi-ingredient presets yet. Tap "+ Create Meal Preset" above to build one.';
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
    const isPreset = item.basis === 'preset';
    const unitLabel = isPreset ? 'per preset' : (item.basis === '100g' ? 'per 100g' : 'per item');
    const presetBadge = isPreset ? '<span class="preset-badge-pill">Preset</span>' : '';
    const tagsHtml = (item.meals || [])
      .map(m => `<span class="meal-tag-pill">${escapeHtml(m)}</span>`)
      .join('');
    const hasCurrentMealTag = (item.meals || []).includes(activeMeal);
    const subDetail = isPreset && item.ingredientsSummary
      ? `${item.calories} kcal • P: ${item.protein}g • C: ${item.carbs}g • F: ${item.fat}g (${escapeHtml(item.ingredientsSummary)})`
      : `${item.calories} kcal (${unitLabel}) • P: ${item.protein}g • C: ${item.carbs}g • F: ${item.fat}g`;

    row.innerHTML = `
      <div class="saved-item-info" onclick="selectSavedFood(${item.id})">
        <div class="saved-item-title-row">
          <strong>${escapeHtml(item.name)}</strong>
          ${presetBadge}
          ${tagsHtml}
        </div>
        <small>${subDetail}</small>
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

savedSearchInput.addEventListener('input', (e) => renderSavedFoods(e.target.value));

// 14. Multi-Ingredient Meal Preset Builder
openPresetBuilderBtn.addEventListener('click', () => {
  const individualFoods = savedFoods.filter(f => f.basis !== 'preset');
  if (individualFoods.length === 0) {
    alert('Save at least one individual food to your Directory first before combining them into a Meal Preset.');
    return;
  }

  presetDraftIngredients = [];
  presetNameInput.value = '';
  presetMealSelect.value = mealCategorySelect.value;
  presetIngSelect.innerHTML = individualFoods
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(f => `<option value="${f.id}">${escapeHtml(f.name)} (${f.basis === '100g' ? 'per 100g' : 'per item'})</option>`)
    .join('');

  renderPresetDraft();
  presetBuilderBox.style.display = 'block';
});

cancelPresetBtn.addEventListener('click', () => {
  presetBuilderBox.style.display = 'none';
});

presetAddIngBtn.addEventListener('click', () => {
  const foodId = Number(presetIngSelect.value);
  const amount = Number(presetIngAmount.value);
  const food = savedFoods.find(f => f.id === foodId);
  if (!food || !amount || amount <= 0) return;

  const mult = food.basis === '100g' ? (amount / 100) : amount;
  presetDraftIngredients.push({
    name: food.name,
    portionLabel: food.basis === '100g' ? `${amount}g` : `${amount}x`,
    calories: Math.round(food.calories * mult),
    protein: Number((food.protein * mult).toFixed(1)),
    carbs: Number((food.carbs * mult).toFixed(1)),
    fat: Number((food.fat * mult).toFixed(1))
  });

  presetIngAmount.value = '';
  renderPresetDraft();
});

function removePresetDraftIng(index) {
  presetDraftIngredients.splice(index, 1);
  renderPresetDraft();
}

function renderPresetDraft() {
  presetIngList.innerHTML = '';
  let cals = 0, pro = 0, carbs = 0, fat = 0;

  presetDraftIngredients.forEach((ing, idx) => {
    cals += ing.calories;
    pro += ing.protein;
    carbs += ing.carbs;
    fat += ing.fat;

    const row = document.createElement('div');
    row.className = 'preset-ing-row';
    row.innerHTML = `
      <span>${escapeHtml(ing.name)} (${ing.portionLabel}) — ${ing.calories} kcal, ${ing.protein}g P</span>
      <button type="button" class="saved-remove-btn" onclick="removePresetDraftIng(${idx})">Remove</button>
    `;
    presetIngList.appendChild(row);
  });

  presetTotalPreview.textContent = `Preset Total: ${Math.round(cals)} kcal | P: ${pro.toFixed(1)}g | C: ${carbs.toFixed(1)}g | F: ${fat.toFixed(1)}g`;
}

savePresetBtn.addEventListener('click', () => {
  const presetName = presetNameInput.value.trim();
  if (!presetName || presetDraftIngredients.length === 0) {
    alert('Enter a Preset Name and add at least one ingredient.');
    return;
  }

  const totalCals = Math.round(presetDraftIngredients.reduce((s, i) => s + i.calories, 0));
  const totalPro = Number(presetDraftIngredients.reduce((s, i) => s + i.protein, 0).toFixed(1));
  const totalCarbs = Number(presetDraftIngredients.reduce((s, i) => s + i.carbs, 0).toFixed(1));
  const totalFat = Number(presetDraftIngredients.reduce((s, i) => s + i.fat, 0).toFixed(1));
  const summary = presetDraftIngredients.map(i => `${i.name} ${i.portionLabel}`).join(' + ');

  saveFoodToLibrary({
    name: presetName,
    basis: 'preset',
    ingredientsSummary: summary,
    calories: totalCals,
    protein: totalPro,
    carbs: totalCarbs,
    fat: totalFat
  }, presetMealSelect.value);

  presetBuilderBox.style.display = 'none';
  setLibraryTab('presets');
  showToast(`Saved Meal Preset "${presetName}".`);
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

// 15. Portion Basis Toggle & Live Scaling Calculation
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
    portionText: currentBasis === '100g' ? `${amount}g` : `${amount} ${amount === 1 ? 'serving' : 'servings'}`
  };
}

function updateScaledPreview() {
  const scaled = getScaledMacros();
  scaledPreviewEl.textContent = `Logging: ${scaled.calories} kcal | P: ${scaled.protein}g | C: ${scaled.carbs}g | F: ${scaled.fat}g`;
}

[caloriesInput, proteinInput, carbsInput, fatInput, portionAmountInput].forEach(input => {
  input.addEventListener('input', updateScaledPreview);
});

// 16. Log Food Entry, Save to Directory & Sync to Google Sheets
foodForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const scaled = getScaledMacros();
  const chosenMeal = mealCategorySelect.value;

  const existingPreset = savedFoods.find(
    f => f.name.toLowerCase() === foodNameInput.value.trim().toLowerCase() && f.basis === 'preset'
  );

  if (existingPreset) {
    saveFoodToLibrary(existingPreset, chosenMeal);
  } else {
    saveFoodToLibrary({
      name: foodNameInput.value.trim(),
      basis: currentBasis,
      calories: Number(caloriesInput.value) || 0,
      protein: Number(proteinInput.value) || 0,
      carbs: Number(carbsInput.value) || 0,
      fat: Number(fatInput.value) || 0
    }, chosenMeal);
  }

  const newEntry = {
    id: Date.now(),
    date: selectedDate,
    time: getLocalTimeString(),
    meal: chosenMeal,
    name: foodNameInput.value.trim(),
    portionText: scaled.portionText,
    calories: scaled.calories,
    protein: scaled.protein,
    carbs: scaled.carbs,
    fat: scaled.fat
  };

  foodEntries.push(newEntry);
  saveAndRender();
  postToCloud({ action: 'addEntry', entry: newEntry });
  showToast(`Logged "${newEntry.name}" to ${chosenMeal}.`);

  foodForm.reset();
  mealCategorySelect.value = chosenMeal;
  updateMealTabLabel();
  setBasis(currentBasis);
});

// 17. Open Food Facts Barcode Scanner
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
  scanBtn.textContent = 'Close';

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
  scanBtn.textContent = 'Barcode';
}

// 18. Nutrition Label Photo Scanner (Tesseract.js OCR)
scanLabelBtn.addEventListener('click', () => {
  if (typeof Tesseract === 'undefined') {
    alert('OCR library is still loading. Please check your connection and try again.');
    return;
  }
  ocrFileInput.value = '';
  ocrFileInput.click();
});

function parseNutritionText(rawText) {
  // Normalise commas used as decimal points (e.g. 4,3g -> 4.3g)
  const clean = rawText.replace(/(\d),(\d)/g, '$1.$2');

  const kcalMatch = clean.match(/(\d{1,4})\s*kcal/i);
  const proteinMatch = clean.match(/protein[^\d\n]{0,18}(\d+(?:\.\d+)?)\s*g?/i);
  const carbsMatch = clean.match(/carbohydrate[s]?[^\d\n]{0,18}(\d+(?:\.\d+)?)\s*g?/i);
  const fatMatch = clean.match(/\bfat[^\d\n]{0,18}(\d+(?:\.\d+)?)\s*g?/i);

  return {
    calories: kcalMatch ? Number(kcalMatch[1]) : null,
    protein: proteinMatch ? Number(proteinMatch[1]) : null,
    carbs: carbsMatch ? Number(carbsMatch[1]) : null,
    fat: fatMatch ? Number(fatMatch[1]) : null
  };
}

ocrFileInput.addEventListener('change', async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  ocrStatusBoxEl.style.display = 'block';
  ocrStatusBoxEl.textContent = 'Reading nutrition label... 0%';

  try {
    const result = await Tesseract.recognize(file, 'eng', {
      logger: (info) => {
        if (info.status === 'recognizing text') {
          const pct = Math.round((info.progress || 0) * 100);
          ocrStatusBoxEl.textContent = `Reading nutrition label... ${pct}%`;
        }
      }
    });

    const parsed = parseNutritionText(result.data.text || '');
    ocrStatusBoxEl.style.display = 'none';

    setBasis('100g');
    if (parsed.calories !== null) caloriesInput.value = parsed.calories;
    if (parsed.protein !== null) proteinInput.value = parsed.protein;
    if (parsed.carbs !== null) carbsInput.value = parsed.carbs;
    if (parsed.fat !== null) fatInput.value = parsed.fat;

    portionAmountInput.value = '';
    if (!foodNameInput.value.trim()) {
      foodNameInput.focus();
    } else {
      portionAmountInput.focus();
    }
    updateScaledPreview();

    const foundCount = [parsed.calories, parsed.protein, parsed.carbs, parsed.fat].filter(v => v !== null).length;
    if (foundCount > 0) {
      showToast(`Extracted ${foundCount}/4 values from label — verify numbers & enter portion.`);
    } else {
      alert('Could not clearly read numbers from that photo. Try taking a closer, well-lit shot of the nutrition table.');
    }
  } catch (err) {
    console.error('OCR Error:', err);
    ocrStatusBoxEl.style.display = 'none';
    alert('Unable to scan nutrition label. Please try again or enter values manually.');
  }
});

// 19. Interactive Meal Cards (+ Log & Copy Previous Meal)
function jumpToLogMeal(category) {
  mealCategorySelect.value = category;
  updateMealTabLabel();
  setLibraryTab('meal');
  logFoodCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => foodNameInput.focus(), 250);
}

function copyPreviousMeal(category) {
  // Find the most recent date before selectedDate that has entries for this meal
  const priorDates = [...new Set(
    foodEntries
      .filter(e => (e.meal || 'Snack') === category && e.date < selectedDate)
      .map(e => e.date)
  )].sort((a, b) => b.localeCompare(a));

  if (priorDates.length === 0) {
    showToast(`No previous ${category} found before ${selectedDate} to copy.`);
    return;
  }

  const sourceDate = priorDates[0];
  const itemsToCopy = foodEntries.filter(
    e => (e.meal || 'Snack') === category && e.date === sourceDate
  );

  itemsToCopy.forEach((item, idx) => {
    const cloned = {
      id: Date.now() + idx,
      date: selectedDate,
      time: getLocalTimeString(),
      meal: category,
      name: item.name,
      portionText: item.portionText,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat
    };
    foodEntries.push(cloned);
    postToCloud({ action: 'addEntry', entry: cloned });
  });

  saveAndRender();
  showToast(`Copied ${itemsToCopy.length} ${category} item(s) from ${sourceDate}.`);
}

function deleteEntry(id) {
  foodEntries = foodEntries.filter(entry => entry.id !== id);
  saveAndRender();
  postToCloud({ action: 'deleteEntry', id });
}

function saveAndRender() {
  localStorage.setItem('macroEntries', JSON.stringify(foodEntries));
  updateUI();
}

function setProgressBar(barEl, current, target) {
  if (!target || target <= 0) {
    barEl.style.width = '0%';
    barEl.className = 'progress-fill';
    return;
  }
  const pct = Math.min(100, Math.round((current / target) * 100));
  barEl.style.width = `${pct}%`;

  if (current > target * 1.05) {
    barEl.className = 'progress-fill over-goal';
  } else if (current >= target * 0.9) {
    barEl.className = 'progress-fill goal-hit';
  } else {
    barEl.className = 'progress-fill';
  }
}

function updateUI() {
  const isToday = selectedDate === getLocalDateString();
  todayBtn.style.display = isToday ? 'none' : 'inline-block';

  const dayEntries = foodEntries.filter(entry => entry.date === selectedDate);

  const caloriesSum = Math.round(dayEntries.reduce((s, e) => s + e.calories, 0));
  const proteinSum = Number(dayEntries.reduce((s, e) => s + e.protein, 0).toFixed(1));
  const carbsSum = Number(dayEntries.reduce((s, e) => s + e.carbs, 0).toFixed(1));
  const fatSum = Number(dayEntries.reduce((s, e) => s + e.fat, 0).toFixed(1));

  const targets = userStats ? calculateTargets(userStats) : null;
  renderWeekStrip(targets ? targets.targetCalories : 2000);

  const deficitBanner = document.getElementById('deficit-banner');

  if (targets) {
    const calLeft = targets.targetCalories - caloriesSum;
    const proLeft = Number((targets.targetProtein - proteinSum).toFixed(1));
    const carbLeft = Number((targets.targetCarbs - carbsSum).toFixed(1));
    const fatLeft = Number((targets.targetFat - fatSum).toFixed(1));

    if (dashboardMode === 'consumed') {
      calHeroMain.innerHTML = `${caloriesSum.toLocaleString()} <small>/ ${targets.targetCalories.toLocaleString()} kcal</small>`;
      calHeroSub.textContent = calLeft >= 0 ? `${calLeft.toLocaleString()} left` : `${Math.abs(calLeft).toLocaleString()} over`;
      proValText.innerHTML = `${proteinSum}g <small>/ ${targets.targetProtein}g</small>`;
      carbValText.innerHTML = `${carbsSum}g <small>/ ${targets.targetCarbs}g</small>`;
      fatValText.innerHTML = `${fatSum}g <small>/ ${targets.targetFat}g</small>`;
    } else {
      calHeroMain.innerHTML = calLeft >= 0
        ? `${calLeft.toLocaleString()} <small>kcal left</small>`
        : `${Math.abs(calLeft).toLocaleString()} <small>kcal over</small>`;
      calHeroSub.textContent = `${caloriesSum.toLocaleString()} / ${targets.targetCalories.toLocaleString()}`;
      proValText.innerHTML = proLeft >= 0 ? `${proLeft}g <small>left</small>` : `${Math.abs(proLeft)}g <small>over</small>`;
      carbValText.innerHTML = carbLeft >= 0 ? `${carbLeft}g <small>left</small>` : `${Math.abs(carbLeft)}g <small>over</small>`;
      fatValText.innerHTML = fatLeft >= 0 ? `${fatLeft}g <small>left</small>` : `${Math.abs(fatLeft)}g <small>over</small>`;
    }

    setProgressBar(calProgressBar, caloriesSum, targets.targetCalories);
    setProgressBar(proProgressBar, proteinSum, targets.targetProtein);
    setProgressBar(carbProgressBar, carbsSum, targets.targetCarbs);
    setProgressBar(fatProgressBar, fatSum, targets.targetFat);

    const currentDeficit = targets.tdee - caloriesSum;
    if (currentDeficit >= 0) {
      deficitBanner.className = 'deficit-banner in-deficit';
      deficitBanner.textContent = `Deficit: ${currentDeficit.toLocaleString()} kcal below maintenance (${targets.tdee.toLocaleString()} kcal TDEE)`;
    } else {
      deficitBanner.className = 'deficit-banner in-surplus';
      deficitBanner.textContent = `Surplus: ${Math.abs(currentDeficit).toLocaleString()} kcal above maintenance (${targets.tdee.toLocaleString()} kcal TDEE)`;
    }
  } else {
    calHeroMain.innerHTML = `${caloriesSum.toLocaleString()} <small>kcal</small>`;
    calHeroSub.textContent = 'Set Stats for Goal';
    proValText.innerHTML = `${proteinSum}g`;
    carbValText.innerHTML = `${carbsSum}g`;
    fatValText.innerHTML = `${fatSum}g`;
  }

  // Render All 5 Interactive Meal Cards
  groupedMealsContainer.innerHTML = '';

  MEAL_CATEGORIES.forEach(category => {
    const categoryItems = dayEntries.filter(item => (item.meal || 'Snack') === category);
    const mealCals = Math.round(categoryItems.reduce((sum, item) => sum + item.calories, 0));
    const mealProtein = categoryItems.reduce((sum, item) => sum + item.protein, 0);

    const card = document.createElement('div');
    card.className = 'meal-card';

    const subtitleText = categoryItems.length > 0
      ? `${mealCals} kcal • ${mealProtein.toFixed(1)}g P`
      : '0 kcal logged';

    card.innerHTML = `
      <div class="meal-card-header">
        <div class="meal-title-block">
          <h3>${category}</h3>
          <span>${subtitleText}</span>
        </div>
        <div class="meal-card-actions">
          <button type="button" class="copy-prev-btn" onclick="copyPreviousMeal('${category}')">Copy Prev</button>
          <button type="button" class="quick-log-meal-btn" onclick="jumpToLogMeal('${category}')">+ Log</button>
        </div>
      </div>
    `;

    if (categoryItems.length > 0) {
      const ul = document.createElement('ul');
      ul.className = 'log-list';

      categoryItems.forEach(entry => {
        const li = document.createElement('li');
        li.className = 'log-item';
        const portionBadge = entry.portionText ? ` (${escapeHtml(entry.portionText)})` : '';
        li.innerHTML = `
          <div class="food-info">
            <h4>${escapeHtml(entry.name)}${portionBadge}</h4>
            <p>${entry.calories} kcal | P: ${entry.protein}g | C: ${entry.carbs}g | F: ${entry.fat}g</p>
          </div>
          <button class="delete-btn" onclick="deleteEntry(${entry.id})">Delete</button>
        `;
        ul.appendChild(li);
      });

      card.appendChild(ul);
    }

    groupedMealsContainer.appendChild(card);
  });
}

// 20. Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
  });
}

initApp();