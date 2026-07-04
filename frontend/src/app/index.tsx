import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { Client, Functions, Databases, ID } from 'react-native-appwrite';
import { DetailsModal } from '../components/details';

// Define structures
interface LoggedFood {
  $id?: string;
  name: string;
  brand: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  timestamp: string;
}

interface Product {
  food_code?: string;
  food_name?: string;
  primarysource?: string;
  servings_unit?: string;
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
  sodium_mg?: string;
  potassium_mg?: string;
  iron_mg?: string;
  zinc_mg?: string;
  vitc_mg?: string;
}

// Appwrite setup
const client = new Client();
client
  .setEndpoint('https://cloud.appwrite.io/v1') // Default Appwrite Cloud endpoint
  .setProject('zheal'); // Project ID

const appwriteFunctions = new Functions(client);
const appwriteDatabases = new Databases(client);

// Suggestions
const SUGGESTIONS = ['Greek Yogurt', 'Almonds', 'Oat Milk', 'Dark Chocolate', 'Banana'];

export default function HomeScreen() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [loggedFoods, setLoggedFoods] = useState<LoggedFood[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Targets
  const targetCalories = 2000;
  const targetProtein = 130; // grams
  const targetCarbs = 220; // grams
  const targetFat = 65; // grams

  // Calculations
  const totalCalories = loggedFoods.reduce((sum, item) => sum + item.calories, 0);
  const totalProtein = loggedFoods.reduce((sum, item) => sum + item.protein, 0);
  const totalCarbs = loggedFoods.reduce((sum, item) => sum + item.carbs, 0);
  const totalFat = loggedFoods.reduce((sum, item) => sum + item.fat, 0);

  const caloriePercentage = Math.min(totalCalories / targetCalories, 1);

  // Load logs on mount
  useEffect(() => {
    fetchLoggedFoods();
  }, []);

  const fetchLoggedFoods = async () => {
    try {
      // Attempt fetching from Appwrite Database
      // If collection doesn't exist yet, it will throw, and we will fallback to local state
      const response = await appwriteDatabases.listDocuments('zheal-db', 'logs');
      const docs = response.documents.map((doc: any) => ({
        $id: doc.$id,
        name: doc.name,
        brand: doc.brand,
        calories: Number(doc.calories),
        protein: Number(doc.protein),
        carbs: Number(doc.carbs),
        fat: Number(doc.fat),
        servingSize: Number(doc.servingSize),
        timestamp: doc.timestamp,
      }));
      setLoggedFoods(docs);
    } catch (e) {
      console.log('Appwrite DB logs fetching failed or collection not configured. Using local logs fallback.');
    }
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const execution = await appwriteFunctions.createExecution({
        functionId: 'search',
        body: JSON.stringify({ q: searchQuery.trim() }),
        async: false,
        xpath: '/',
        method: 'GET' as any,
      });
      
      if (execution.status === 'completed') {
        const data = JSON.parse(execution.responseBody);
        setResults(data);
      } else {
        throw new Error('Execution failed');
      }
    } catch (e) {
      console.log('Appwrite search execution failed, trying local server fallback:', e);
      try {
        const res = await fetch(`http://localhost:8080/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        } else {
          throw new Error('Local server error');
        }
      } catch (err) {
        console.error('All search options failed:', err);
        Alert.alert('Search Error', 'Failed to perform search. Make sure the local backend server is running on port 8080.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const handleLogFood = async (servingSize: number) => {
    if (!selectedProduct) return;

    // Nutrient mapping based on serving size (per 100g or per unit serving)
    // INDB returns nutrients per 100g.
    const p100g = (val?: string) => parseFloat(val || '0');
    const factor = servingSize / 100;

    const name = selectedProduct.food_name || 'Unknown Item';
    const brand = selectedProduct.primarysource || 'INDB';
    const calories = Math.round(p100g(selectedProduct.energy_kcal) * factor);
    const protein = Number((p100g(selectedProduct.protein_g) * factor).toFixed(1));
    const carbs = Number((p100g(selectedProduct.carb_g) * factor).toFixed(1));
    const fat = Number((p100g(selectedProduct.fat_g) * factor).toFixed(1));

    const newLog = {
      name,
      brand,
      calories,
      protein,
      carbs,
      fat,
      servingSize,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    try {
      // Try writing to Appwrite database
      const doc = await appwriteDatabases.createDocument('zheal-db', 'logs', ID.unique(), newLog);
      setLoggedFoods((prev) => [...prev, { ...newLog, $id: doc.$id }]);
    } catch (e) {
      // Local fallback
      setLoggedFoods((prev) => [...prev, { ...newLog, $id: String(Date.now()) }]);
    }

    setModalVisible(false);
    setSelectedProduct(null);
  };

  const handleReset = async () => {
    try {
      // Delete documents in Appwrite database
      for (const food of loggedFoods) {
        if (food.$id) {
          await appwriteDatabases.deleteDocument('zheal-db', 'logs', food.$id);
        }
      }
    } catch (e) {
      console.log('Appwrite delete operation failed or skipped.');
    }
    setLoggedFoods([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Title Header */}
        <View style={styles.header}>
          <Text style={styles.logoTitle}>zheal</Text>
          <Text style={styles.logoSubtitle}>nutrient & health databank</Text>
        </View>

        {/* Dashboard Cards Grid */}
        <View style={styles.dashboardGrid}>
          {/* Calorie Card */}
          <View style={styles.dashboardCard}>
            <Text style={styles.cardTitle}>Daily Energy</Text>
            <View style={styles.gaugeContainer}>
              {/* Circular Gauge outline representation */}
              <View style={styles.gaugeOuter}>
                <View style={[styles.gaugeProgressFill, { transform: [{ rotate: `${caloriePercentage * 360}deg` }] }]} />
                <View style={styles.gaugeInner}>
                  <Text style={styles.gaugeNumber}>{totalCalories}</Text>
                  <Text style={styles.gaugeLabel}>/ {targetCalories} kcal</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset Tracker</Text>
            </TouchableOpacity>
          </View>

          {/* Macros Card */}
          <View style={styles.dashboardCard}>
            <Text style={styles.cardTitle}>Macronutrients</Text>
            <View style={styles.macrosContainer}>
              {/* Protein Progress */}
              <View style={styles.macroRow}>
                <View style={styles.macroTextRow}>
                  <Text style={styles.macroLabel}>Protein</Text>
                  <Text style={styles.macroStats}>{totalProtein}g / {targetProtein}g</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(totalProtein / targetProtein, 1) * 100}%`, backgroundColor: '#6366F1' }]} />
                </View>
              </View>

              {/* Carbs Progress */}
              <View style={styles.macroRow}>
                <View style={styles.macroTextRow}>
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <Text style={styles.macroStats}>{totalCarbs}g / {targetCarbs}g</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(totalCarbs / targetCarbs, 1) * 100}%`, backgroundColor: '#EC4899' }]} />
                </View>
              </View>

              {/* Fat Progress */}
              <View style={styles.macroRow}>
                <View style={styles.macroTextRow}>
                  <Text style={styles.macroLabel}>Fat</Text>
                  <Text style={styles.macroStats}>{totalFat}g / {targetFat}g</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(totalFat / targetFat, 1) * 100}%`, backgroundColor: '#10B981' }]} />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Logged Items List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Logged Items</Text>
        </View>
        {loggedFoods.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No food logged today.</Text>
          </View>
        ) : (
          <View style={styles.logsList}>
            {loggedFoods.map((food, idx) => (
              <View key={food.$id || idx} style={styles.logItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logItemName}>{food.name}</Text>
                  <Text style={styles.logItemSub}>{food.servingSize}g • {food.brand}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.logItemCal}>{food.calories} kcal</Text>
                  <Text style={styles.logItemTime}>{food.timestamp}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Search Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Search Databank</Text>
        </View>

        {/* Search Inputs */}
        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search database (e.g. Yogurt, Oats)..."
            placeholderTextColor="#64748B"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch(query)}
          />
          <TouchableOpacity style={styles.searchButton} onPress={() => handleSearch(query)}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Suggestion Pills */}
        <View style={styles.suggestionsContainer}>
          {SUGGESTIONS.map((s) => (
            <TouchableOpacity key={s} style={styles.pill} onPress={() => handleSuggestionClick(s)}>
              <Text style={styles.pillText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Results / Suggestions Block */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        ) : results.length > 0 ? (
          <View style={styles.resultsList}>
            {results.map((product, index) => (
              <TouchableOpacity
                key={product.food_code || index}
                style={styles.resultItem}
                onPress={() => handleProductClick(product)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultName}>{product.food_name}</Text>
                  <Text style={styles.resultSub}>{product.primarysource || 'INDB Databank'}</Text>
                </View>
                <Text style={styles.resultCal}>{Math.round(parseFloat(product.energy_kcal || '0'))} kcal</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Use search to fetch items from INDB Databank.</Text>
          </View>
        )}
      </ScrollView>

      {/* Product Details Sheet Modal */}
      <DetailsModal
        visible={modalVisible}
        product={selectedProduct}
        database="indb"
        onClose={() => {
          setModalVisible(false);
          setSelectedProduct(null);
        }}
        onLog={handleLogFood}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Slate 900
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  logoTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  logoSubtitle: {
    color: '#6366F1', // Indigo
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 4,
  },
  dashboardGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  dashboardCard: {
    flex: 1,
    backgroundColor: '#1E293B', // Slate 800
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  gaugeOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gaugeProgressFill: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#6366F1',
  },
  gaugeInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  gaugeLabel: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  resetButton: {
    marginTop: 12,
    width: '100%',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: 'bold',
  },
  macrosContainer: {
    width: '100%',
    gap: 12,
  },
  macroRow: {
    width: '100%',
  },
  macroTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  macroLabel: {
    color: '#E2E8F0',
    fontSize: 12,
  },
  macroStats: {
    color: '#94A3B8',
    fontSize: 11,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionHeader: {
    marginBottom: 12,
    marginTop: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
  },
  logsList: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    marginBottom: 20,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  logItemName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  logItemSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  logItemCal: {
    color: '#EC4899', // Pink
    fontSize: 14,
    fontWeight: 'bold',
  },
  logItemTime: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 4,
  },
  searchBarContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  pill: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pillText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  loadingContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  resultsList: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  resultName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  resultCal: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
