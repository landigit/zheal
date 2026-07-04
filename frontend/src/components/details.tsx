import * as React from 'react';
import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
} from 'react-native';

// Product type definitions...
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
  };
}

interface DetailsProps {
  visible: boolean;
  product: Product | null;
  database: 'off' | 'indb';
  onClose: () => void;
  onLog: (servingSize: number) => void;
}

const nutrientLabels: Record<string, string> = {
  energy_kcal: 'Energy (kcal)',
  energy_kj: 'Energy (kJ)',
  carb_g: 'Carbohydrates (g)',
  protein_g: 'Protein (g)',
  fat_g: 'Total Fat (g)',
  freesugar_g: 'Free Sugars (g)',
  fibre_g: 'Dietary Fibre (g)',
  sfa_mg: 'Saturated Fat (mg)',
  mufa_mg: 'Monounsaturated Fat (mg)',
  pufa_mg: 'Polyunsaturated Fat (mg)',
  cholesterol_mg: 'Cholesterol (mg)',
  calcium_mg: 'Calcium (mg)',
  sodium_mg: 'Sodium (mg)',
  potassium_mg: 'Potassium (mg)',
  iron_mg: 'Iron (mg)',
  zinc_mg: 'Zinc (mg)',
  vitc_mg: 'Vitamin C (mg)',
};

export const DetailsModal = ({
  visible,
  product,
  database,
  onClose,
  onLog,
}: DetailsProps) => {
  if (!product) return null;

  const name =
    database === 'off'
      ? product.product_name || product.product_name_en || 'Unknown Product'
      : product.food_name || 'Unknown Item';
  const brand =
    database === 'off'
      ? product.brands || 'Unknown Brand'
      : product.primarysource || 'INDB';
  const imageSrc =
    product.image_front_url ||
    product.image_front_small_url ||
    product.image_small_url ||
    product.image_url;

  const defaultServing = product.servings_unit === 'g' || !product.servings_unit ? 100 : 1;
  const [servingSize, setServingSize] = useState<string>(String(defaultServing));

  const formatValue = (val: any) => {
    if (val === undefined || val === null || val === '') return '-';
    const num = parseFloat(val);
    if (isNaN(num)) return String(val);
    if (num === 0) return '0';
    return num % 1 === 0 ? num.toString() : num.toFixed(1);
  };

  const getScoreColor = (score: string) => {
    const s = score.toLowerCase();
    if (s === 'a' || s === 'b' || s === '1' || s === '2') return '#10B981'; // Green
    if (s === 'c' || s === '3') return '#F59E0B'; // Amber
    if (s === 'd' || s === 'e' || s === '4') return '#EF4444'; // Red
    return '#64748B'; // Grey
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>{name}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{brand}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Left Side (Global database details / Image) */}
            {database === 'off' ? (
              <View>
                <View style={styles.topInfoRow}>
                  {imageSrc ? (
                    <Image source={{ uri: imageSrc }} style={styles.productImage} />
                  ) : (
                    <View style={[styles.productImage, styles.imagePlaceholder]}>
                      <Text style={{ fontSize: 32 }}>🥗</Text>
                    </View>
                  )}

                  <View style={styles.scoreList}>
                    <View style={styles.scoreRow}>
                      <Text style={styles.scoreLabel}>Nutri-Score</Text>
                      <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(product.nutriscore_grade || '') + '22' }]}>
                        <Text style={[styles.scoreBadgeText, { color: getScoreColor(product.nutriscore_grade || '') }]}>
                          {(product.nutriscore_grade || '-').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.scoreRow}>
                      <Text style={styles.scoreLabel}>Eco-Score</Text>
                      <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(product.ecoscore_grade || '') + '22' }]}>
                        <Text style={[styles.scoreBadgeText, { color: getScoreColor(product.ecoscore_grade || '') }]}>
                          {(product.ecoscore_grade || '-').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.scoreRow}>
                      <Text style={styles.scoreLabel}>NOVA Group</Text>
                      <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(String(product.nova_group || '')) + '22' }]}>
                        <Text style={[styles.scoreBadgeText, { color: getScoreColor(String(product.nova_group || '')) }]}>
                          {product.nova_group || '-'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Nutritional Stats (Open Food Facts style) */}
                <Text style={styles.sectionTitle}>Nutrition (per 100g)</Text>
                <View style={styles.statsGrid}>
                  {(() => {
                    const n = product.nutriments || {};
                    const kcal = Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || (n.energy_100g ? n.energy_100g / 4.184 : 0));
                    return (
                      <>
                        <View style={styles.statCard}><Text style={styles.statLabel}>Energy</Text><Text style={styles.statValue}>{kcal} kcal</Text></View>
                        <View style={styles.statCard}><Text style={styles.statLabel}>Proteins</Text><Text style={styles.statValue}>{formatValue(n.proteins_100g || n.proteins)}g</Text></View>
                        <View style={styles.statCard}><Text style={styles.statLabel}>Carbs</Text><Text style={styles.statValue}>{formatValue(n.carbohydrates_100g || n.carbohydrates)}g</Text></View>
                        <View style={styles.statCard}><Text style={styles.statLabel}>Sugars</Text><Text style={styles.statValue}>{formatValue(n.sugars_100g || n.sugars)}g</Text></View>
                        <View style={styles.statCard}><Text style={styles.statLabel}>Fats</Text><Text style={styles.statValue}>{formatValue(n.fat_100g || n.fat)}g</Text></View>
                        <View style={styles.statCard}><Text style={styles.statLabel}>Saturated Fats</Text><Text style={styles.statValue}>{formatValue(n['saturated-fat_100g'] || n['saturated-fat'])}g</Text></View>
                        <View style={styles.statCard}><Text style={styles.statLabel}>Salt</Text><Text style={styles.statValue}>{formatValue(n.salt_100g || n.salt)}g</Text></View>
                        <View style={styles.statCard}><Text style={styles.statLabel}>Fibers</Text><Text style={styles.statValue}>{formatValue(n.fiber_100g || n.fiber)}g</Text></View>
                      </>
                    );
                  })()}
                </View>

                {/* Ingredients */}
                <Text style={styles.sectionTitle}>Ingredients</Text>
                <Text style={styles.bodyText}>
                  {product.ingredients_text || product.ingredients_text_en || 'No ingredient list available.'}
                </Text>

                {/* Allergens */}
                {(product.allergens || product.allergens_from_ingredients) && (
                  <View style={styles.allergensContainer}>
                    <Text style={styles.allergensTitle}>🚨 Detected Allergens</Text>
                    <Text style={styles.allergensText}>{product.allergens || product.allergens_from_ingredients}</Text>
                  </View>
                )}
              </View>
            ) : (
              // INDB Complete Table View
              <View>
                <Text style={styles.sectionTitle}>Complete Nutrition Analysis</Text>
                <View style={styles.tableBorder}>
                  {/* Table Header */}
                  <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.tableCell, styles.headerCell, { flex: 2 }]}>Component</Text>
                    <Text style={[styles.tableCell, styles.headerCell, { textAlign: 'right' }]}>per 100g</Text>
                    <Text style={[styles.tableCell, styles.headerCell, { textAlign: 'right' }]}>Serving</Text>
                  </View>
                  {/* Table Body */}
                  {Object.keys(nutrientLabels).map((key) => {
                    const val100g = product[key as keyof Product];
                    const valServing = product[`unit_serving_${key}` as keyof Product];
                    const p100g = parseFloat(String(val100g || '0'));
                    const pServing = parseFloat(String(valServing || '0'));

                    if ((val100g && !isNaN(p100g) && p100g > 0) || (valServing && !isNaN(pServing) && pServing > 0)) {
                      return (
                        <View key={key} style={styles.tableRow}>
                          <Text style={[styles.tableCell, { flex: 2 }]}>{nutrientLabels[key]}</Text>
                          <Text style={[styles.tableCell, { textAlign: 'right', fontWeight: 'bold' }]}>{formatValue(val100g)}</Text>
                          <Text style={[styles.tableCell, { textAlign: 'right', color: '#EC4899', fontWeight: 'bold' }]}>{formatValue(valServing)}</Text>
                        </View>
                      );
                    }
                    return null;
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Log Form */}
          <View style={styles.logForm}>
            <View style={styles.logInputContainer}>
              <Text style={styles.logInputLabel}>Serving Size ({product.servings_unit || 'g'}):</Text>
              <TextInput
                style={styles.servingInput}
                keyboardType="numeric"
                value={servingSize}
                onChangeText={setServingSize}
              />
            </View>
            <TouchableOpacity
              style={styles.logButton}
              onPress={() => {
                const parsed = parseFloat(servingSize);
                if (parsed > 0) {
                  onLog(parsed);
                }
              }}
            >
              <Text style={styles.logButtonText}>Add to Tracker</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: Dimensions.get('window').width > 600 ? 550 : '90%',
    maxHeight: '85%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#94A3B8',
    fontSize: 22,
    fontWeight: 'bold',
  },
  scrollContent: {
    flexShrink: 1,
  },
  topInfoRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreList: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLabel: {
    color: '#94A3B8',
    fontSize: 13,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scoreBadgeText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  statValue: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  bodyText: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
  allergensContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginTop: 16,
  },
  allergensTitle: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 4,
  },
  allergensText: {
    color: '#EF4444',
    fontSize: 12,
  },
  tableBorder: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tableHeader: {
    backgroundColor: '#0F172A',
  },
  tableCell: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
  },
  headerCell: {
    fontWeight: 'bold',
    color: '#94A3B8',
  },
  logForm: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 12,
  },
  logInputContainer: {
    flex: 1,
  },
  logInputLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 6,
  },
  servingInput: {
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logButton: {
    flex: 2,
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
