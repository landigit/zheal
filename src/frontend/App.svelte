<script lang="ts">
  import { onMount } from 'svelte';

  // Type Definitions
  interface Product {
    food_code?: string;
    food_name?: string;
    primarysource?: string;
    servings_unit?: string;

    // INDB nutrient keys
    energy_kcal?: string;
    energy_kj?: string;
    carb_g?: string;
    protein_g?: string;
    fat_g?: string;
    freesugar_g?: string;
    fibre_g?: string;
    sfa_mg?: string;
    mufa_mg?: string;
    pufa_mg?: string;
    cholesterol_mg?: string;
    calcium_mg?: string;
    phosphorus_mg?: string;
    magnesium_mg?: string;
    sodium_mg?: string;
    potassium_mg?: string;
    iron_mg?: string;
    copper_mg?: string;
    selenium_ug?: string;
    chromium_mg?: string;
    manganese_mg?: string;
    molybdenum_mg?: string;
    zinc_mg?: string;
    vita_ug?: string;
    vite_mg?: string;
    vitd2_ug?: string;
    vitd3_ug?: string;
    vitk1_ug?: string;
    vitk2_ug?: string;
    folate_ug?: string;
    vitb1_mg?: string;
    vitb2_mg?: string;
    vitb3_mg?: string;
    vitb5_mg?: string;
    vitb6_mg?: string;
    vitb7_ug?: string;
    vitb9_ug?: string;
    vitc_mg?: string;
    carotenoids_ug?: string;

    // Unit serving keys
    unit_serving_energy_kcal?: string;
    unit_serving_energy_kj?: string;
    unit_serving_carb_g?: string;
    unit_serving_protein_g?: string;
    unit_serving_fat_g?: string;
    unit_serving_freesugar_g?: string;
    unit_serving_fibre_g?: string;
    unit_serving_sfa_mg?: string;
    unit_serving_mufa_mg?: string;
    unit_serving_pufa_mg?: string;
    unit_serving_cholesterol_mg?: string;
    unit_serving_calcium_mg?: string;
    unit_serving_phosphorus_mg?: string;
    unit_serving_magnesium_mg?: string;
    unit_serving_sodium_mg?: string;
    unit_serving_potassium_mg?: string;
    unit_serving_iron_mg?: string;
    unit_serving_copper_mg?: string;
    unit_serving_selenium_ug?: string;
    unit_serving_chromium_mg?: string;
    unit_serving_manganese_mg?: string;
    unit_serving_molybdenum_mg?: string;
    unit_serving_zinc_mg?: string;
    unit_serving_vita_ug?: string;
    unit_serving_vite_mg?: string;
    unit_serving_vitd2_ug?: string;
    unit_serving_vitd3_ug?: string;
    unit_serving_vitk1_ug?: string;
    unit_serving_vitk2_ug?: string;
    unit_serving_folate_ug?: string;
    unit_serving_vitb1_mg?: string;
    unit_serving_vitb2_mg?: string;
    unit_serving_vitb3_mg?: string;
    unit_serving_vitb5_mg?: string;
    unit_serving_vitb6_mg?: string;
    unit_serving_vitb7_ug?: string;
    unit_serving_vitb9_ug?: string;
    unit_serving_vitc_mg?: string;
    unit_serving_carotenoids_ug?: string;

    // Open Food Facts keys
    product_name?: string;
    product_name_en?: string;
    brands?: string;
    image_front_url?: string;
    image_front_small_url?: string;
    image_small_url?: string;
    image_url?: string;
    nutriscore_grade?: string;
    ecoscore_grade?: string;
    nova_group?: string | number;
    nova_groups?: string | number;
    ingredients_text?: string;
    ingredients_text_en?: string;
    allergens?: string;
    allergens_from_ingredients?: string;
    nutriments?: {
      'energy-kcal_100g'?: number;
      'energy-kcal'?: number;
      energy_100g?: number;
      proteins_100g?: number;
      proteins?: number;
      carbohydrates_100g?: number;
      carbohydrates?: number;
      sugars_100g?: number;
      sugars?: number;
      fat_100g?: number;
      fat?: number;
      'saturated-fat_100g'?: number;
      'saturated-fat'?: number;
      salt_100g?: number;
      salt?: number;
      fiber_100g?: number;
      fiber?: number;
      [key: string]: number | undefined;
    };
    [key: string]: any;
  }

  interface FoodLog {
    id?: string;
    name: string;
    brand: string;
    serving: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    timestamp?: string;
  }

  // State Management (Svelte 5 Runes)
  let currentDatabase = $state<'off' | 'indb'>('off');
  let searchResults = $state<Product[]>([]);
  let selectedProduct = $state<Product | null>(null);
  let loggedFoods = $state<FoodLog[]>([]);
  let loading = $state<boolean>(false);
  let hasSearched = $state<boolean>(false);
  let searchTerm = $state<string>('');
  let logServing = $state<number>(100);

  const dailyTargets = {
    protein: 140, // grams
    carbs: 275,   // grams
    fat: 75       // grams
  };

  // Derived state
  const dailyTotals = $derived.by(() => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    for (const food of loggedFoods) {
      calories += food.calories;
      protein += food.protein;
      carbs += food.carbs;
      fat += food.fat;
    }
    return { calories, protein, carbs, fat };
  });

  const proteinPct = $derived(Math.min((dailyTotals.protein / dailyTargets.protein) * 100, 100));
  const carbsPct = $derived(Math.min((dailyTotals.carbs / dailyTargets.carbs) * 100, 100));
  const fatPct = $derived(Math.min((dailyTotals.fat / dailyTargets.fat) * 100, 100));

  // Nutrient labels mapping for INDB complete view
  const nutrientLabels: Record<string, string> = {
    energy_kcal: 'Energy (kcal)',
    energy_kj: 'Energy (kJ)',
    carb_g: 'Carbohydrates (g)',
    protein_g: 'Protein (g)',
    fat_g: 'Total Fat (g)',
    freesugar_g: 'Free Sugars (g)',
    fibre_g: 'Dietary Fibre (g)',
    sfa_mg: 'Saturated Fatty Acids (mg)',
    mufa_mg: 'Monounsaturated Fatty Acids (mg)',
    pufa_mg: 'Polyunsaturated Fatty Acids (mg)',
    cholesterol_mg: 'Cholesterol (mg)',
    calcium_mg: 'Calcium (mg)',
    phosphorus_mg: 'Phosphorus (mg)',
    magnesium_mg: 'Magnesium (mg)',
    sodium_mg: 'Sodium (mg)',
    potassium_mg: 'Potassium (mg)',
    iron_mg: 'Iron (mg)',
    copper_mg: 'Copper (mg)',
    selenium_ug: 'Selenium (µg)',
    chromium_mg: 'Chromium (mg)',
    manganese_mg: 'Manganese (mg)',
    molybdenum_mg: 'Molybdenum (mg)',
    zinc_mg: 'Zinc (mg)',
    vita_ug: 'Vitamin A (µg)',
    vite_mg: 'Vitamin E (mg)',
    vitd2_ug: 'Vitamin D2 (µg)',
    vitd3_ug: 'Vitamin D3 (µg)',
    vitk1_ug: 'Vitamin K1 (µg)',
    vitk2_ug: 'Vitamin K2 (µg)',
    folate_ug: 'Folate (µg)',
    vitb1_mg: 'Vitamin B1 (Thiamine) (mg)',
    vitb2_mg: 'Vitamin B2 (Riboflavin) (mg)',
    vitb3_mg: 'Vitamin B3 (Niacin) (mg)',
    vitb5_mg: 'Vitamin B5 (Pantothenic acid) (mg)',
    vitb6_mg: 'Vitamin B6 (mg)',
    vitb7_ug: 'Vitamin B7 (Biotin) (µg)',
    vitb9_ug: 'Vitamin B9 (µg)',
    vitc_mg: 'Vitamin C (mg)',
    carotenoids_ug: 'Carotenoids (µg)',
  };

  // Helper functions
  function getProductImage(product: Product): string {
    if (product.image_front_url) return product.image_front_url;
    if (product.image_front_small_url) return product.image_front_small_url;
    if (product.image_small_url) return product.image_small_url;
    if (product.image_url) return product.image_url;
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23131b2e" rx="12"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="40">🥗</text></svg>';
  }

  function getBadgeColorClass(score: string): string {
    const s = score.toLowerCase();
    if (s === 'a' || s === 'b') return 'score-good';
    if (s === 'c') return 'score-moderate';
    if (s === 'd' || s === 'e') return 'score-bad';
    return 'score-neutral';
  }

  function getNovaBadgeColorClass(nova: string | number): string {
    const n = String(nova);
    if (n === '1' || n === '2') return 'score-good';
    if (n === '3') return 'score-moderate';
    if (n === '4') return 'score-bad';
    return 'score-neutral';
  }

  function formatValue(val: any): string {
    if (val === undefined || val === null || val === '') return '-';
    const num = parseFloat(val);
    if (isNaN(num)) return String(val);
    if (num === 0) return '0';
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  }

  // APIs
  async function loadLogs() {
    try {
      const response = await fetch('/api/logs');
      if (!response.ok) throw new Error('Failed to load logs');
      loggedFoods = await response.json();
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  }

  async function performSearch() {
    const query = searchTerm.trim();
    if (!query) {
      searchResults = [];
      hasSearched = false;
      return;
    }
    loading = true;
    hasSearched = true;

    try {
      if (currentDatabase === 'off') {
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        searchResults = data.products || [];
      } else {
        const url = `/api/search?q=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Search failed');
        searchResults = await response.json();
      }
    } catch (error) {
      console.error('Search error:', error);
      searchResults = [];
    } finally {
      loading = false;
    }
  }

  // Auto-reset UI when search term is cleared
  $effect(() => {
    if (!searchTerm.trim()) {
      searchResults = [];
      hasSearched = false;
      loading = false;
    }
  });
  function handlePillClick(term: string) {
    searchTerm = term;
    performSearch();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      performSearch();
    }
  }

  function openProductDetails(product: Product) {
    selectedProduct = product;
    if (currentDatabase === 'off') {
      logServing = 100;
    } else {
      const unit = product.servings_unit || 'g';
      logServing = unit === 'g' ? 100 : 1;
    }
  }

  function closeProductDetails() {
    selectedProduct = null;
  }

  async function addToTracker() {
    if (!selectedProduct) return;
    if (logServing <= 0) return;

    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let servingDescription = '';

    if (currentDatabase === 'off') {
      const n = selectedProduct.nutriments || {};
      let kcal = n['energy-kcal_100g'] || n['energy-kcal'] || 0;
      if (!kcal && n['energy_100g']) {
        kcal = n['energy_100g'] / 4.184;
      }
      const factor = logServing / 100;

      calories = (parseFloat(kcal.toString()) || 0) * factor;
      protein = (parseFloat((n.proteins_100g || n.proteins || 0).toString()) || 0) * factor;
      carbs = (parseFloat((n.carbohydrates_100g || n.carbohydrates || 0).toString()) || 0) * factor;
      fat = (parseFloat((n.fat_100g || n.fat || 0).toString()) || 0) * factor;
      servingDescription = `${logServing}g`;
    } else {
      const unit = selectedProduct.servings_unit || 'g';
      if (unit === 'g') {
        const factor = logServing / 100;
        calories = (parseFloat(selectedProduct.energy_kcal || '0') || 0) * factor;
        protein = (parseFloat(selectedProduct.protein_g || '0') || 0) * factor;
        carbs = (parseFloat(selectedProduct.carb_g || '0') || 0) * factor;
        fat = (parseFloat(selectedProduct.fat_g || '0') || 0) * factor;
        servingDescription = `${logServing}g`;
      } else {
        calories = (parseFloat(selectedProduct.unit_serving_energy_kcal || '0') || 0) * logServing;
        protein = (parseFloat(selectedProduct.unit_serving_protein_g || '0') || 0) * logServing;
        carbs = (parseFloat(selectedProduct.unit_serving_carb_g || '0') || 0) * logServing;
        fat = (parseFloat(selectedProduct.unit_serving_fat_g || '0') || 0) * logServing;
        servingDescription = `${logServing} ${unit}${logServing > 1 ? 's' : ''}`;
      }
    }

    const name =
      currentDatabase === 'off'
        ? selectedProduct.product_name || selectedProduct.product_name_en || 'Unknown Product'
        : selectedProduct.food_name || 'Unknown Item';
    const brand =
      currentDatabase === 'off'
        ? selectedProduct.brands || 'Unknown Brand'
        : selectedProduct.primarysource || 'INDB';

    const newLog: FoodLog = {
      name,
      brand,
      serving: servingDescription,
      calories: Math.round(calories),
      protein,
      carbs,
      fat,
    };

    try {
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog),
      });

      if (!response.ok) throw new Error('Failed to log food');
      const savedLog = await response.json();
      loggedFoods = [...loggedFoods, savedLog];
      closeProductDetails();
    } catch (error) {
      console.error('Error logging food:', error);
      alert('Failed to log food to database.');
    }
  }

  async function resetTracker() {
    try {
      const response = await fetch('/api/logs', { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to reset tracker');
      loggedFoods = [];
    } catch (error) {
      console.error('Failed to reset tracker:', error);
      alert('Failed to reset tracker.');
    }
  }

  onMount(() => {
    loadLogs();
  });
</script>

<div class="app-container">
  <!-- Sidebar / Stats Panel -->
  <aside class="sidebar">
    <div class="brand">
      <span class="brand-glow"></span>
      <h1 class="brand-title">zheal</h1>
      <p class="brand-subtitle">Nutrient Intelligence</p>
    </div>

    <!-- Daily Tracker Summary Card -->
    <div class="tracker-card">
      <h2 class="section-title">Today's Summary</h2>
      <div class="calories-gauge">
        <div class="gauge-circle">
          <span id="tracked-calories">{Math.round(dailyTotals.calories)}</span>
          <span class="unit">kcal</span>
        </div>
      </div>

      <div class="macros-list">
        <div class="macro-item">
          <div class="macro-info">
            <span>Protein</span>
            <span class="macro-value">{formatValue(dailyTotals.protein)}g</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar protein" style="width: {proteinPct}%"></div>
          </div>
        </div>

        <div class="macro-item">
          <div class="macro-info">
            <span>Carbs</span>
            <span class="macro-value">{formatValue(dailyTotals.carbs)}g</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar carbs" style="width: {carbsPct}%"></div>
          </div>
        </div>

        <div class="macro-item">
          <div class="macro-info">
            <span>Fat</span>
            <span class="macro-value">{formatValue(dailyTotals.fat)}g</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar fat" style="width: {fatPct}%"></div>
          </div>
        </div>
      </div>

      <button onclick={resetTracker} class="btn btn-secondary">Reset Tracker</button>
    </div>

    <!-- Logged Foods List -->
    <div class="logged-foods-section">
      <h3 class="subsection-title">Logged Items</h3>
      <ul class="logged-foods-list">
        {#if loggedFoods.length === 0}
          <li class="empty-log-msg">No items logged today yet.</li>
        {:else}
          {#each loggedFoods as item}
            <li class="logged-food-item">
              <div class="logged-food-info">
                <span class="logged-food-name">{item.name}</span>
                <span class="logged-food-meta">{item.brand} • {item.serving}</span>
              </div>
              <span class="logged-food-cal">{item.calories} kcal</span>
            </li>
          {/each}
        {/if}
      </ul>
    </div>
  </aside>

  <!-- Main Content Area -->
  <main class="main-content">
    <!-- Search Section -->
    <header class="search-header">
      <div class="db-toggle-container">
        <button
          onclick={() => { currentDatabase = 'off'; performSearch(); }}
          class="db-toggle-btn {currentDatabase === 'off' ? 'active' : ''}"
        >
          Global (Open Food Facts)
        </button>
        <button
          onclick={() => { currentDatabase = 'indb'; performSearch(); }}
          class="db-toggle-btn {currentDatabase === 'indb' ? 'active' : ''}"
        >
          Indian Databank (INDB)
        </button>
      </div>
      <div class="search-box-container">
        <svg
          class="search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          id="search-input"
          bind:value={searchTerm}
          onkeydown={handleKeydown}
          placeholder="Search foods, snacks, brands..."
          autocomplete="off"
        />
        <button onclick={performSearch} class="btn btn-primary">Search</button>
      </div>
    </header>

    <!-- Welcome State -->
    {#if !hasSearched && !loading}
      <div class="center-state">
        <div class="pulse-icon">🍎</div>
        <h2>Discover What You Eat</h2>
        <p>
          Search over millions of products to analyze ingredients, scores, and track your daily
          nutrients instantly.
        </p>
        <div class="suggested-pills">
          <button onclick={() => handlePillClick('Greek Yogurt')} class="pill-btn">Greek Yogurt</button>
          <button onclick={() => handlePillClick('Oat Milk')} class="pill-btn">Oat Milk</button>
          <button onclick={() => handlePillClick('Dark Chocolate')} class="pill-btn">Dark Chocolate</button>
          <button onclick={() => handlePillClick('Almonds')} class="pill-btn">Almonds</button>
        </div>
      </div>
    {/if}

    <!-- Loading State -->
    {#if loading}
      <div class="center-state">
        <div class="spinner"></div>
        <p>Analyzing food database...</p>
      </div>
    {/if}

    <!-- Empty State -->
    {#if hasSearched && !loading && searchResults.length === 0}
      <div class="center-state">
        <div class="sad-icon">🔍</div>
        <h2>No products found</h2>
        <p>
          We couldn't find anything matching your search. Please check spelling or try a different
          term.
        </p>
      </div>
    {/if}

    <!-- Search Results Grid -->
    {#if hasSearched && !loading && searchResults.length > 0}
      <section class="results-section">
        <h2 class="results-heading">Search Results</h2>
        <div class="results-grid">
          {#each searchResults as product}
            {@const name = currentDatabase === 'off' ? (product.product_name || product.product_name_en || 'Unknown Product') : (product.food_name || 'Unknown Item')}
            {@const brand = currentDatabase === 'off' ? (product.brands || 'Unknown Brand') : (product.primarysource || 'INDB')}
            {@const imageSrc = getProductImage(product)}
            {@const score = (product.nutriscore_grade || 'unknown').toLowerCase()}
            {@const badgeClass = ['a', 'b', 'c', 'd', 'e'].includes(score) ? `badge-${score}` : 'badge-unknown'}

            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div onclick={() => openProductDetails(product)} class="product-card">
              <div class="card-img-wrapper">
                <img src={imageSrc} alt={name} loading="lazy" />
              </div>
              <div class="card-info">
                <div class="card-brand">{brand}</div>
                <h3 class="card-title">{name}</h3>
                <div class="card-badges">
                  <span class="card-badge {badgeClass}">
                    {currentDatabase === 'off' ? `Nutri-Score ${score.toUpperCase()}` : 'INDB'}
                  </span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}
  </main>
</div>

<!-- Detail Modal -->
{#if selectedProduct}
  {@const name = currentDatabase === 'off' ? (selectedProduct.product_name || selectedProduct.product_name_en || 'Unknown Product') : (selectedProduct.food_name || 'Unknown Item')}
  {@const brand = currentDatabase === 'off' ? (selectedProduct.brands || 'Unknown Brand') : (selectedProduct.primarysource || 'INDB')}
  {@const imageSrc = getProductImage(selectedProduct)}

  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div onclick={closeProductDetails} class="modal-backdrop">
    <div onclick={(e) => e.stopPropagation()} class="modal-container">
      <button onclick={closeProductDetails} class="modal-close-btn">&times;</button>

      <div class="modal-content-grid">
        <!-- Left Side: Image & Key Badges -->
        <div class="modal-left">
          <div class="modal-image-wrapper">
            <img src={imageSrc} alt={name} />
          </div>
          {#if currentDatabase === 'off'}
            {@const nutri = (selectedProduct.nutriscore_grade || 'unknown').toLowerCase()}
            {@const eco = (selectedProduct.ecoscore_grade || 'unknown').toLowerCase()}
            {@const nova = (selectedProduct.nova_group || selectedProduct.nova_groups || 'unknown').toString()}

            <div class="health-badges">
              <div class="badge-item">
                <span class="badge-label">Nutri-Score</span>
                <span class="badge-val {getBadgeColorClass(nutri)}">{nutri.toUpperCase()}</span>
              </div>
              <div class="badge-item">
                <span class="badge-label">Eco-Score</span>
                <span class="badge-val {getBadgeColorClass(eco)}">{eco.toUpperCase()}</span>
              </div>
              <div class="badge-item">
                <span class="badge-label">NOVA Group</span>
                <span class="badge-val {getNovaBadgeColorClass(nova)}">{nova === 'unknown' ? '-' : nova}</span>
              </div>
            </div>
          {/if}
        </div>

        <!-- Right Side: Detailed Nutrients & Info -->
        <div class="modal-right">
          <h2 class="modal-title">{name}</h2>
          <p class="modal-subtitle">{brand}</p>

          <div class="nutrition-tabs">
            <!-- Standard Nutrients Card (OFF Style) -->
            {#if currentDatabase === 'off'}
              {@const n = selectedProduct.nutriments || {}}
              {@const kcalRaw = n['energy-kcal_100g'] || n['energy-kcal'] || (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0)}
              {@const kcal = Math.round(kcalRaw)}

              <div class="nutrition-card">
                <h3>Nutritional Details <span class="per-100">(per 100g)</span></h3>
                <div class="nutrients-grid">
                  <div class="nutrient-stat">
                    <span class="stat-name">Energy</span>
                    <span class="stat-val">{kcal} kcal</span>
                  </div>
                  <div class="nutrient-stat">
                    <span class="stat-name">Proteins</span>
                    <span class="stat-val">{formatValue(n.proteins_100g || n.proteins)}g</span>
                  </div>
                  <div class="nutrient-stat">
                    <span class="stat-name">Carbohydrates</span>
                    <span class="stat-val">{formatValue(n.carbohydrates_100g || n.carbohydrates)}g</span>
                  </div>
                  <div class="nutrient-stat">
                    <span class="stat-name">Sugars</span>
                    <span class="stat-val">{formatValue(n.sugars_100g || n.sugars)}g</span>
                  </div>
                  <div class="nutrient-stat">
                    <span class="stat-name">Fats</span>
                    <span class="stat-val">{formatValue(n.fat_100g || n.fat)}g</span>
                  </div>
                  <div class="nutrient-stat">
                    <span class="stat-name">Saturated Fats</span>
                    <span class="stat-val">{formatValue(n['saturated-fat_100g'] || n['saturated-fat'])}g</span>
                  </div>
                  <div class="nutrient-stat">
                    <span class="stat-name">Salt</span>
                    <span class="stat-val">{formatValue(n.salt_100g || n.salt)}g</span>
                  </div>
                  <div class="nutrient-stat">
                    <span class="stat-name">Fibers</span>
                    <span class="stat-val">{formatValue(n.fiber_100g || n.fiber)}g</span>
                  </div>
                </div>
              </div>

              <!-- Ingredients & Allergens -->
              <div class="ingredients-card">
                <h3>Ingredients</h3>
                <p class="ingredients-text">
                  {selectedProduct.ingredients_text || selectedProduct.ingredients_text_en || 'No ingredient information available.'}
                </p>
                {#if selectedProduct.allergens || selectedProduct.allergens_from_ingredients}
                  <div class="allergens-box">
                    <strong>Allergens detected:</strong> <span>{selectedProduct.allergens || selectedProduct.allergens_from_ingredients}</span>
                  </div>
                {/if}
              </div>
            {:else}
              <!-- Complete Table Card (INDB Style) -->
              <div class="nutrition-card">
                <h3>Complete Nutrition Analysis <span class="per-100">(per 100g)</span></h3>
                <div class="table-container">
                  <table class="nutrients-table">
                    <thead>
                      <tr>
                        <th>Nutrient Component</th>
                        <th>Quantity (per 100g)</th>
                        <th>Quantity (per serving)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each Object.keys(nutrientLabels) as key}
                        {@const val100g = selectedProduct[key]}
                        {@const valServing = selectedProduct[`unit_serving_${key}`]}
                        {@const parsed100g = parseFloat(val100g || '0')}
                        {@const parsedServing = parseFloat(valServing || '0')}
                        {#if (val100g && !isNaN(parsed100g) && parsed100g > 0) || (valServing && !isNaN(parsedServing) && parsedServing > 0)}
                          <tr>
                            <td>{nutrientLabels[key]}</td>
                            <td>{formatValue(val100g)}</td>
                            <td>{formatValue(valServing)}</td>
                          </tr>
                        {/if}
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="ingredients-card">
                <h3>Ingredients</h3>
                <p class="ingredients-text">
                  Detailed ingredient breakdown from recipes. See complete nutrition analysis table below.
                </p>
              </div>
            {/if}

            <!-- Add to Daily Tracker Form -->
            <div class="log-food-container">
              <div class="input-group">
                <label for="log-serving">
                  Serving Size ({selectedProduct.servings_unit || 'g'}):
                </label>
                <input type="number" id="log-serving" bind:value={logServing} min="1" />
              </div>
              <button onclick={addToTracker} class="btn btn-primary btn-full">
                Add to Daily Tracker
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
