// 1. Array to hold logged food objects
let foodEntries = [];
let html5QrcodeScanner = null;

// 2. Select HTML elements
const foodForm = document.getElementById('food-form');
const foodNameInput = document.getElementById('food-name');
const caloriesInput = document.getElementById('calories');
const proteinInput = document.getElementById('protein');
const carbsInput = document.getElementById('carbs');
const fatInput = document.getElementById('fat');
const scanBtn = document.getElementById('scan-btn');
const readerDiv = document.getElementById('reader');

const totalCaloriesEl = document.getElementById('total-calories');
const totalProteinEl = document.getElementById('total-protein');
const totalCarbsEl = document.getElementById('total-carbs');
const totalFatEl = document.getElementById('total-fat');
const logListEl = document.getElementById('log-list');

// 3. Load stored items from browser memory on startup
function loadSavedEntries() {
  const savedData = localStorage.getItem('macroEntries');
  if (savedData) {
    foodEntries = JSON.parse(savedData);
    updateUI();
  }
}

// 4. Form submission handler
foodForm.addEventListener('submit', function (event) {
  event.preventDefault();

  const newEntry = {
    id: Date.now(),
    name: foodNameInput.value.trim(),
    calories: Number(caloriesInput.value) || 0,
    protein: Number(proteinInput.value) || 0,
    carbs: Number(carbsInput.value) || 0,
    fat: Number(fatInput.value) || 0
  };

  foodEntries.push(newEntry);
  saveAndRender();
  foodForm.reset();
});

// 5. Open Food Facts API Fetch Function
async function fetchProductByBarcode(barcode) {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 1 && data.product) {
      const product = data.product;
      const nutriments = product.nutriments || {};

      // Fill form with retrieved nutritional values (per 100g standard)
      foodNameInput.value = product.product_name || 'Unknown Product';
      caloriesInput.value = Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0);
      proteinInput.value = (nutriments.proteins_100g || 0).toFixed(1);
      carbsInput.value = (nutriments.carbohydrates_100g || 0).toFixed(1);
      fatInput.value = (nutriments.fat_100g || 0).toFixed(1);
    } else {
      alert('Product not found in Open Food Facts database. Please log manually.');
    }
  } catch (error) {
    console.error('Error fetching barcode data:', error);
    alert('Failed to reach Open Food Facts service.');
  }
}

// 6. Barcode Scanner Toggle & Initialization
scanBtn.addEventListener('click', function () {
  if (readerDiv.style.display === 'block') {
    stopScanner();
    return;
  }

  readerDiv.style.display = 'block';
  scanBtn.textContent = 'Close Camera';

  html5QrcodeScanner = new Html5QrcodeScanner("reader", {
    fps: 10,
    qrbox: { width: 250, height: 150 }
  });

  html5QrcodeScanner.render(
    function onScanSuccess(decodedText) {
      // Stop scanner upon successful detection
      stopScanner();
      // Query Open Food Facts with decoded barcode digits
      fetchProductByBarcode(decodedText);
    },
    function onScanError(error) {
      // Ignore background camera frame errors
    }
  );
});

function stopScanner() {
  if (html5QrcodeScanner) {
    html5QrcodeScanner.clear().catch(err => console.error(err));
  }
  readerDiv.style.display = 'none';
  scanBtn.textContent = 'Scan Barcode';
}

// 7. Delete entry by ID
function deleteEntry(id) {
  foodEntries = foodEntries.filter(entry => entry.id !== id);
  saveAndRender();
}

// 8. Storage & UI update handlers
function saveAndRender() {
  localStorage.setItem('macroEntries', JSON.stringify(foodEntries));
  updateUI();
}

function updateUI() {
  let caloriesSum = 0;
  let proteinSum = 0;
  let carbsSum = 0;
  let fatSum = 0;

  logListEl.innerHTML = '';

  foodEntries.forEach(entry => {
    caloriesSum += entry.calories;
    proteinSum += entry.protein;
    carbsSum += entry.carbs;
    fatSum += entry.fat;

    const li = document.createElement('li');
    li.className = 'log-item';
    li.innerHTML = `
      <div class="food-info">
        <h4>${entry.name}</h4>
        <p>${entry.calories} kcal | P: ${entry.protein}g | C: ${entry.carbs}g | F: ${entry.fat}g</p>
      </div>
      <button onclick="deleteEntry(${entry.id})" style="padding: 4px 8px; background: #ef4444; color: white; border-radius: 4px; border: none; cursor: pointer; font-size: 0.8rem;">Delete</button>
    `;
    logListEl.appendChild(li);
  });

  totalCaloriesEl.textContent = Math.round(caloriesSum);
  totalProteinEl.textContent = `${proteinSum.toFixed(1)}g`;
  totalCarbsEl.textContent = `${carbsSum.toFixed(1)}g`;
  totalFatEl.textContent = `${fatSum.toFixed(1)}g`;
}

loadSavedEntries();