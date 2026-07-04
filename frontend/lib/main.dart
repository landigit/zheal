import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:appwrite/appwrite.dart';
import 'package:appwrite/enums.dart' as enums;

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'zheal - Nutrient Intelligence',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF6366F1), // Indigo
          secondary: Color(0xFFEC4899), // Pink
          surface: Color(0xFF1E293B), // Slate 800
          
          error: Color(0xFFEF4444),
        ),
        cardColor: const Color(0xFF1E293B),
        textTheme: const TextTheme(
          titleLarge: TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.bold),
          bodyMedium: TextStyle(fontFamily: 'Inter'),
        ),
      ),
      home: const MainScreen(),
    );
  }
}

// Data Models
class Product {
  final String id;
  final String name;
  final String brand;
  final String imageSrc;
  final String nutriScore;
  final String ecoScore;
  final String novaGroup;
  final String servingsUnit;
  final Map<String, dynamic> rawData;

  Product({
    required this.id,
    required this.name,
    required this.brand,
    required this.imageSrc,
    required this.nutriScore,
    required this.ecoScore,
    required this.novaGroup,
    required this.servingsUnit,
    required this.rawData,
  });

  factory Product.fromOpenFoodFacts(Map<String, dynamic> json) {
    final n = json['nutriments'] ?? {};
    double kcal = 0.0;
    if (n['energy-kcal_100g'] != null) {
      kcal = (n['energy-kcal_100g'] as num).toDouble();
    } else if (n['energy-kcal'] != null) {
      kcal = (n['energy-kcal'] as num).toDouble();
    } else if (n['energy_100g'] != null) {
      kcal = (n['energy_100g'] as num).toDouble() / 4.184;
    }

    return Product(
      id: json['code']?.toString() ?? UniqueKey().toString(),
      name: json['product_name']?.toString() ?? json['product_name_en']?.toString() ?? 'Unknown Product',
      brand: json['brands']?.toString() ?? 'Unknown Brand',
      imageSrc: json['image_front_url']?.toString() ??
          json['image_front_small_url']?.toString() ??
          json['image_small_url']?.toString() ??
          json['image_url']?.toString() ??
          '',
      nutriScore: json['nutriscore_grade']?.toString().toUpperCase() ?? 'UNKNOWN',
      ecoScore: json['ecoscore_grade']?.toString().toUpperCase() ?? 'UNKNOWN',
      novaGroup: json['nova_group']?.toString() ?? json['nova_groups']?.toString() ?? 'UNKNOWN',
      servingsUnit: 'g',
      rawData: {
        'kcal': kcal,
        'protein': (n['proteins_100g'] ?? n['proteins'] ?? 0.0) as num,
        'carbs': (n['carbohydrates_100g'] ?? n['carbohydrates'] ?? 0.0) as num,
        'fat': (n['fat_100g'] ?? n['fat'] ?? 0.0) as num,
        'sugars': (n['sugars_100g'] ?? n['sugars'] ?? 0.0) as num,
        'saturated_fat': (n['saturated-fat_100g'] ?? n['saturated-fat'] ?? 0.0) as num,
        'salt': (n['salt_100g'] ?? n['salt'] ?? 0.0) as num,
        'fiber': (n['fiber_100g'] ?? n['fiber'] ?? 0.0) as num,
        'ingredients': json['ingredients_text']?.toString() ?? json['ingredients_text_en']?.toString() ?? '',
        'allergens': json['allergens']?.toString() ?? json['allergens_from_ingredients']?.toString() ?? '',
      },
    );
  }

  factory Product.fromIndb(Map<String, dynamic> json) {
    return Product(
      id: json['food_code']?.toString() ?? UniqueKey().toString(),
      name: json['food_name']?.toString() ?? 'Unknown Item',
      brand: json['primarysource']?.toString() ?? 'INDB',
      imageSrc: '',
      nutriScore: 'INDB',
      ecoScore: 'UNKNOWN',
      novaGroup: 'UNKNOWN',
      servingsUnit: json['servings_unit']?.toString() ?? 'g',
      rawData: Map<String, dynamic>.from(json),
    );
  }
}

class FoodLog {
  final String id;
  final String name;
  final String brand;
  final String serving;
  final int calories;
  final double protein;
  final double carbs;
  final double fat;
  final DateTime timestamp;

  FoodLog({
    required this.id,
    required this.name,
    required this.brand,
    required this.serving,
    required this.calories,
    required this.protein,
    required this.carbs,
    required this.fat,
    required this.timestamp,
  });
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  // Appwrite configuration
  late Client appwriteClient;
  late Functions appwriteFunctions;
  bool appwriteConfigured = false;

  // App State
  String currentDatabase = 'off'; // 'off' (Global/OFF) or 'indb' (Indian Databank)
  List<Product> searchResults = [];
  Product? selectedProduct;
  List<FoodLog> loggedFoods = [];
  bool loading = false;
  bool hasSearched = false;
  final TextEditingController searchController = TextEditingController();
  final TextEditingController servingController = TextEditingController(text: '100');

  // Constants
  final int dailyCalorieTarget = 2000;
  final double targetProtein = 140.0;
  final double targetCarbs = 275.0;
  final double targetFat = 75.0;

  @override
  void initState() {
    super.initState();
    initAppwrite();
  }

  void initAppwrite() {
    try {
      appwriteClient = Client()
          .setEndpoint('https://cloud.appwrite.io/v1') // Replace with your endpoint
          .setProject('zheal'); // Replace with your project ID
      appwriteFunctions = Functions(appwriteClient);
      appwriteConfigured = true;
    } catch (e) {
      debugPrint('Appwrite initialization failed: $e');
    }
  }

  // Daily Totals calculation
  int get totalCalories => loggedFoods.fold(0, (sum, item) => sum + item.calories);
  double get totalProtein => loggedFoods.fold(0.0, (sum, item) => sum + item.protein);
  double get totalCarbs => loggedFoods.fold(0.0, (sum, item) => sum + item.carbs);
  double get totalFat => loggedFoods.fold(0.0, (sum, item) => sum + item.fat);

  // Search Logic
  Future<void> performSearch() async {
    final query = searchController.text.trim();
    if (query.isEmpty) {
      setState(() {
        searchResults = [];
        hasSearched = false;
      });
      return;
    }

    setState(() {
      loading = true;
      hasSearched = true;
    });

    try {
      if (currentDatabase == 'off') {
        // Search Open Food Facts
        final url = Uri.parse(
            'https://world.openfoodfacts.org/cgi/search.pl?search_terms=${Uri.encodeComponent(query)}&search_simple=1&action=process&json=1');
        final response = await http.get(url);
        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          final productsJson = data['products'] as List? ?? [];
          setState(() {
            searchResults = productsJson.map((item) => Product.fromOpenFoodFacts(item)).toList();
          });
        }
      } else {
        // Search Indian Nutrient Databank (via Appwrite Search Function)
        if (appwriteConfigured) {
          final execution = await appwriteFunctions.createExecution(
            functionId: 'search',
            body: jsonEncode({'q': query}),
            method: enums.ExecutionMethod.gET,
          );
          if (execution.status == enums.ExecutionStatus.completed) {
            final List data = jsonDecode(execution.responseBody);
            setState(() {
              searchResults = data.map((item) => Product.fromIndb(item)).toList();
            });
          } else {
            throw Exception('Appwrite execution status: ${execution.status}');
          }
        } else {
          throw Exception('Appwrite not configured');
        }
      }
    } catch (e) {
      debugPrint('Search error: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Search failed: ${e.toString()}')),
      );
      setState(() {
        searchResults = [];
      });
    } finally {
      setState(() {
        loading = false;
      });
    }
  }

  void handlePillClick(String term) {
    searchController.text = term;
    performSearch();
  }

  void openProductDetails(Product product) {
    setState(() {
      selectedProduct = product;
      if (currentDatabase == 'off') {
        servingController.text = '100';
      } else {
        final unit = product.servingsUnit;
        servingController.text = unit == 'g' ? '100' : '1';
      }
    });
    showDetailsDialog();
  }

  void addToTracker() {
    if (selectedProduct == null) return;
    final logServing = double.tryParse(servingController.text) ?? 0.0;
    if (logServing <= 0) return;

    double calories = 0;
    double protein = 0;
    double carbs = 0;
    double fat = 0;
    String servingDescription = '';

    if (currentDatabase == 'off') {
      final double kcal = (selectedProduct!.rawData['kcal'] as num? ?? 0.0).toDouble();
      final double factor = logServing / 100.0;
      calories = kcal * factor;
      protein = ((selectedProduct!.rawData['protein'] as num? ?? 0.0).toDouble()) * factor;
      carbs = ((selectedProduct!.rawData['carbs'] as num? ?? 0.0).toDouble()) * factor;
      fat = ((selectedProduct!.rawData['fat'] as num? ?? 0.0).toDouble()) * factor;
      servingDescription = '${logServing.round()}g';
    } else {
      final unit = selectedProduct!.servingsUnit;
      if (unit == 'g') {
        final double factor = logServing / 100.0;
        calories = (double.tryParse(selectedProduct!.rawData['energy_kcal']?.toString() ?? '0') ?? 0.0) * factor;
        protein = (double.tryParse(selectedProduct!.rawData['protein_g']?.toString() ?? '0') ?? 0.0) * factor;
        carbs = (double.tryParse(selectedProduct!.rawData['carb_g']?.toString() ?? '0') ?? 0.0) * factor;
        fat = (double.tryParse(selectedProduct!.rawData['fat_g']?.toString() ?? '0') ?? 0.0) * factor;
        servingDescription = '${logServing.round()}g';
      } else {
        calories = (double.tryParse(selectedProduct!.rawData['unit_serving_energy_kcal']?.toString() ?? '0') ?? 0.0) * logServing;
        protein = (double.tryParse(selectedProduct!.rawData['unit_serving_protein_g']?.toString() ?? '0') ?? 0.0) * logServing;
        carbs = (double.tryParse(selectedProduct!.rawData['unit_serving_carb_g']?.toString() ?? '0') ?? 0.0) * logServing;
        fat = (double.tryParse(selectedProduct!.rawData['unit_serving_fat_g']?.toString() ?? '0') ?? 0.0) * logServing;
        servingDescription = '${logServing.round()} $unit${logServing > 1 ? 's' : ''}';
      }
    }

    final newLog = FoodLog(
      id: UniqueKey().toString(),
      name: selectedProduct!.name,
      brand: selectedProduct!.brand,
      serving: servingDescription,
      calories: calories.round(),
      protein: protein,
      carbs: carbs,
      fat: fat,
      timestamp: DateTime.now(),
    );

    setState(() {
      loggedFoods.add(newLog);
      selectedProduct = null;
    });

    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Logged ${newLog.name} successfully!'),
        backgroundColor: const Color(0xFF10B981),
      ),
    );
  }

  void resetTracker() {
    setState(() {
      loggedFoods.clear();
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Tracker cleared!')),
    );
  }

  // Details Modal UI
  void showDetailsDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final name = selectedProduct!.name;
            final brand = selectedProduct!.brand;
            final hasImage = selectedProduct!.imageSrc.isNotEmpty;

            return Dialog(
              backgroundColor: const Color(0xFF1E293B),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
              child: Container(
                width: min(MediaQuery.of(context).size.width * 0.9, 650),
                padding: const EdgeInsets.all(20),
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 4),
                                Text(brand, style: const TextStyle(color: Colors.grey, fontSize: 14)),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: () => Navigator.of(context).pop(),
                          )
                        ],
                      ),
                      const Divider(height: 24, color: Color(0xFF64748B)),
                      if (currentDatabase == 'off') ...[
                        // Open Food Facts Info
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (hasImage)
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.network(selectedProduct!.imageSrc, width: 100, height: 100, fit: BoxFit.cover),
                              ),
                            if (hasImage) const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  _buildBadgeRow('Nutri-Score', selectedProduct!.nutriScore),
                                  const SizedBox(height: 6),
                                  _buildBadgeRow('Eco-Score', selectedProduct!.ecoScore),
                                  const SizedBox(height: 6),
                                  _buildBadgeRow('NOVA Group', selectedProduct!.novaGroup),
                                ],
                              ),
                            )
                          ],
                        ),
                        const SizedBox(height: 16),
                        const Text('Nutritional Details (per 100g)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 10),
                        _buildNutrientGrid(),
                        if (selectedProduct!.rawData['ingredients']?.isNotEmpty == true) ...[
                          const SizedBox(height: 16),
                          const Text('Ingredients', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 6),
                          Text(selectedProduct!.rawData['ingredients'], style: const TextStyle(color: Colors.grey, fontSize: 13)),
                        ],
                        if (selectedProduct!.rawData['allergens']?.isNotEmpty == true) ...[
                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.warning_amber_rounded, color: Color(0xFFEF4444), size: 18),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Allergens: ${selectedProduct!.rawData['allergens']}',
                                    style: const TextStyle(color: Color(0xFFEF4444), fontSize: 12),
                                  ),
                                )
                              ],
                            ),
                          )
                        ]
                      ] else ...[
                        // INDB Table View
                        const Text('Complete Nutrition Analysis (per 100g)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 10),
                        _buildIndbTable(),
                      ],
                      const Divider(height: 32, color: Color(0xFF64748B)),
                      // Log Form
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Serving Size (${selectedProduct!.servingsUnit})', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                const SizedBox(height: 6),
                                TextField(
                                  controller: servingController,
                                  keyboardType: TextInputType.number,
                                  decoration: InputDecoration(
                                    filled: true,
                                    fillColor: const Color(0xFF0F172A),
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            flex: 2,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF6366F1),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                              ),
                              onPressed: addToTracker,
                              child: const Text('Add to Tracker', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                            ),
                          )
                        ],
                      )
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildBadgeRow(String label, String value) {
    Color bg = const Color(0xFF334155);
    Color text = Colors.white;
    if (value == 'A' || value == 'B' || value == '1' || value == '2') {
      bg = const Color(0xFF10B981).withValues(alpha: 0.2);
      text = const Color(0xFF10B981);
    } else if (value == 'C' || value == '3') {
      bg = const Color(0xFFF59E0B).withValues(alpha: 0.2);
      text = const Color(0xFFF59E0B);
    } else if (value == 'D' || value == 'E' || value == '4') {
      bg = const Color(0xFFEF4444).withValues(alpha: 0.2);
      text = const Color(0xFFEF4444);
    }

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: Colors.grey)),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(4)),
          child: Text(value, style: TextStyle(color: text, fontWeight: FontWeight.bold)),
        )
      ],
    );
  }

  Widget _buildNutrientGrid() {
    final raw = selectedProduct!.rawData;
    final List<Map<String, String>> stats = [
      {'name': 'Energy', 'val': '${(raw['kcal'] as double).round()} kcal'},
      {'name': 'Protein', 'val': '${_formatVal(raw['protein'])}g'},
      {'name': 'Carbohydrates', 'val': '${_formatVal(raw['carbs'])}g'},
      {'name': 'Sugar', 'val': '${_formatVal(raw['sugars'])}g'},
      {'name': 'Fat', 'val': '${_formatVal(raw['fat'])}g'},
      {'name': 'Saturated Fat', 'val': '${_formatVal(raw['saturated_fat'])}g'},
      {'name': 'Salt', 'val': '${_formatVal(raw['salt'])}g'},
      {'name': 'Fiber', 'val': '${_formatVal(raw['fiber'])}g'},
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 3.5,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
      ),
      itemCount: stats.length,
      itemBuilder: (context, index) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: const Color(0xFF1E293B)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(stats[index]['name']!, style: const TextStyle(color: Colors.grey, fontSize: 12)),
              Text(stats[index]['val']!, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            ],
          ),
        );
      },
    );
  }

  Widget _buildIndbTable() {
    final raw = selectedProduct!.rawData;
    final nutrientLabels = {
      'energy_kcal': 'Energy (kcal)',
      'energy_kj': 'Energy (kJ)',
      'carb_g': 'Carbohydrates (g)',
      'protein_g': 'Protein (g)',
      'fat_g': 'Total Fat (g)',
      'freesugar_g': 'Free Sugars (g)',
      'fibre_g': 'Dietary Fibre (g)',
      'sfa_mg': 'Saturated Fat (mg)',
      'mufa_mg': 'Monounsaturated Fat (mg)',
      'pufa_mg': 'Polyunsaturated Fat (mg)',
      'cholesterol_mg': 'Cholesterol (mg)',
      'calcium_mg': 'Calcium (mg)',
      'sodium_mg': 'Sodium (mg)',
      'potassium_mg': 'Potassium (mg)',
      'iron_mg': 'Iron (mg)',
      'zinc_mg': 'Zinc (mg)',
      'vitc_mg': 'Vitamin C (mg)',
    };

    final List<TableRow> rows = [
      const TableRow(
        decoration: BoxDecoration(color: Color(0xFF0F172A)),
        children: [
          Padding(padding: EdgeInsets.all(8.0), child: Text('Nutrient', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
          Padding(padding: EdgeInsets.all(8.0), child: Text('per 100g', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
          Padding(padding: EdgeInsets.all(8.0), child: Text('per Serving', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
        ],
      )
    ];

    nutrientLabels.forEach((key, label) {
      final val100g = raw[key]?.toString() ?? '';
      final valServing = raw['unit_serving_$key']?.toString() ?? '';
      final p100g = double.tryParse(val100g) ?? 0.0;
      final pServing = double.tryParse(valServing) ?? 0.0;

      if (p100g > 0 || pServing > 0) {
        rows.add(TableRow(
          children: [
            Padding(padding: const EdgeInsets.all(8.0), child: Text(label, style: const TextStyle(fontSize: 12))),
            Padding(padding: const EdgeInsets.all(8.0), child: Text(_formatVal(val100g), style: const TextStyle(fontSize: 12))),
            Padding(padding: const EdgeInsets.all(8.0), child: Text(_formatVal(valServing), style: const TextStyle(fontSize: 12))),
          ],
        ));
      }
    });

    return Container(
      constraints: const BoxConstraints(maxHeight: 250),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFF1E293B)),
        borderRadius: BorderRadius.circular(6),
      ),
      child: SingleChildScrollView(
        child: Table(
          border: TableBorder.symmetric(inside: BorderSide(color: const Color(0xFF0F172A))),
          children: rows,
        ),
      ),
    );
  }

  String _formatVal(dynamic val) {
    if (val == null) return '-';
    final parsed = double.tryParse(val.toString());
    if (parsed == null) return val.toString();
    if (parsed == 0) return '0';
    return parsed % 1 == 0 ? parsed.toInt().toString() : parsed.toStringAsFixed(1);
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isWide = size.width > 900;

    final Widget sidebar = _buildSidebar();
    final Widget mainContent = _buildMainContent();

    return Scaffold(
      body: SafeArea(
        child: isWide
            ? Row(
                children: [
                  SizedBox(width: 320, child: sidebar),
                  const VerticalDivider(width: 1, color: Color(0xFF64748B)),
                  Expanded(child: mainContent),
                ],
              )
            : Column(
                children: [
                  Expanded(child: mainContent),
                  Container(
                    height: 60,
                    decoration: const BoxDecoration(
                      color: Color(0xFF1E293B),
                      border: Border(top: BorderSide(color: Color(0xFF64748B), width: 0.5)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        TextButton.icon(
                          onPressed: () {
                            showModalBottomSheet(
                              context: context,
                              backgroundColor: const Color(0xFF0F172A),
                              builder: (context) => Container(
                                padding: const EdgeInsets.all(16),
                                child: sidebar,
                              ),
                            );
                          },
                          icon: const Icon(Icons.analytics_outlined),
                          label: const Text("View Daily Summary"),
                        ),
                      ],
                    ),
                  )
                ],
              ),
      ),
    );
  }

  Widget _buildSidebar() {
    return Container(
      color: const Color(0xFF0B1220),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 8,
                height: 24,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFFEC4899)]),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(width: 8),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('zheal', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
                  Text('Nutrient Intelligence', style: TextStyle(fontSize: 10, color: Colors.grey)),
                ],
              )
            ],
          ),
          const SizedBox(height: 20),
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Calorie widget
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF1E293B)),
                    ),
                    child: Column(
                      children: [
                        const Text("Today's Summary", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: 110,
                          height: 110,
                          child: Stack(
                            children: [
                              Positioned.fill(
                                child: CustomPaint(
                                  painter: RadialProgressPainter(
                                    progress: totalCalories / dailyCalorieTarget,
                                    color: const Color(0xFF6366F1),
                                  ),
                                ),
                              ),
                              Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text('$totalCalories', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                                    const Text('kcal', style: TextStyle(color: Colors.grey, fontSize: 11)),
                                  ],
                                ),
                              )
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                        _buildMacroProgress("Protein", totalProtein, targetProtein, const Color(0xFF6366F1)),
                        const SizedBox(height: 10),
                        _buildMacroProgress("Carbs", totalCarbs, targetCarbs, const Color(0xFFEC4899)),
                        const SizedBox(height: 10),
                        _buildMacroProgress("Fat", totalFat, targetFat, const Color(0xFF10B981)),
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Color(0xFF64748B)),
                            ),
                            onPressed: resetTracker,
                            child: const Text('Reset Tracker', style: TextStyle(fontSize: 12)),
                          ),
                        )
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text('Logged Items', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 8),
                  if (loggedFoods.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Center(
                        child: Text(
                          'No items logged today yet.',
                          style: TextStyle(color: Colors.grey, fontSize: 12),
                        ),
                      ),
                    )
                  else
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: loggedFoods.length,
                      separatorBuilder: (context, index) => const Divider(height: 8, color: Color(0xFF64748B)),
                      itemBuilder: (context, index) {
                        final log = loggedFoods[index];
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(log.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                    Text('${log.brand} • ${log.serving}', style: const TextStyle(color: Colors.grey, fontSize: 10)),
                                  ],
                                ),
                              ),
                              Text('${log.calories} kcal', style: const TextStyle(fontSize: 12, color: Color(0xFFEC4899), fontWeight: FontWeight.bold)),
                            ],
                          ),
                        );
                      },
                    )
                ],
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildMacroProgress(String label, double current, double target, Color progressColor) {
    final pct = min(current / target, 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
            Text('${_formatVal(current)}g / ${target.toInt()}g', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: pct,
            backgroundColor: const Color(0xFF0F172A),
            valueColor: AlwaysStoppedAnimation<Color>(progressColor),
            minHeight: 5,
          ),
        ),
      ],
    );
  }

  Widget _buildMainContent() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // DB Toggles
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        currentDatabase = 'off';
                        searchResults.clear();
                        hasSearched = false;
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: currentDatabase == 'off' ? const Color(0xFF6366F1) : Colors.transparent,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Center(
                        child: Text(
                          'Global (Open Food Facts)',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        currentDatabase = 'indb';
                        searchResults.clear();
                        hasSearched = false;
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: currentDatabase == 'indb' ? const Color(0xFF6366F1) : Colors.transparent,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Center(
                        child: Text(
                          'Indian Databank (INDB)',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Search box
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: searchController,
                  onSubmitted: (_) => performSearch(),
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.search, color: Colors.grey),
                    hintText: 'Search foods, snacks, brands...',
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366F1),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                ),
                onPressed: performSearch,
                child: const Text('Search', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              )
            ],
          ),
          const SizedBox(height: 20),
          // Content Area (Welcome / Search results / Loader)
          Expanded(
            child: _buildBodyState(),
          )
        ],
      ),
    );
  }

  Widget _buildBodyState() {
    if (loading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF6366F1))),
            SizedBox(height: 16),
            Text('Analyzing food database...', style: TextStyle(color: Colors.grey)),
          ],
        ),
      );
    }

    if (!hasSearched) {
      return Center(
        child: SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(color: const Color(0xFF6366F1).withValues(alpha: 0.2), blurRadius: 20, spreadRadius: 4),
                  ],
                ),
                child: const Text('🍎', style: TextStyle(fontSize: 48)),
              ),
              const SizedBox(height: 20),
              const Text('Discover What You Eat', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const SizedBox(
                width: 320,
                child: Text(
                  'Search over millions of products to analyze ingredients, scores, and track your daily nutrients instantly.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey, fontSize: 13),
                ),
              ),
              const SizedBox(height: 24),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                children: [
                  _buildPillButton('Greek Yogurt'),
                  _buildPillButton('Oat Milk'),
                  _buildPillButton('Dark Chocolate'),
                  _buildPillButton('Almonds'),
                ],
              )
            ],
          ),
        ),
      );
    }

    if (searchResults.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('🔍', style: TextStyle(fontSize: 40)),
            SizedBox(height: 16),
            Text('No products found', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            SizedBox(height: 8),
            Text("We couldn't find anything matching. Try a different term.", style: TextStyle(color: Colors.grey, fontSize: 13)),
          ],
        ),
      );
    }

    // Grid View
    final crossCount = MediaQuery.of(context).size.width > 1200 ? 3 : (MediaQuery.of(context).size.width > 700 ? 2 : 1);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Search Results', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        Expanded(
          child: GridView.builder(
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: crossCount,
              childAspectRatio: 2.8,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemCount: searchResults.length,
            itemBuilder: (context, index) {
              final product = searchResults[index];
              final hasImage = product.imageSrc.isNotEmpty;
              final score = product.nutriScore;

              Color badgeBg = const Color(0xFF334155);
              Color badgeText = Colors.white;
              if (score == 'A' || score == 'B') {
                badgeBg = const Color(0xFF10B981).withValues(alpha: 0.15);
                badgeText = const Color(0xFF10B981);
              } else if (score == 'C') {
                badgeBg = const Color(0xFFF59E0B).withValues(alpha: 0.15);
                badgeText = const Color(0xFFF59E0B);
              } else if (score == 'D' || score == 'E') {
                badgeBg = const Color(0xFFEF4444).withValues(alpha: 0.15);
                badgeText = const Color(0xFFEF4444);
              }

              return InkWell(
                onTap: () => openProductDetails(product),
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF1E293B)),
                  ),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: hasImage
                            ? Image.network(product.imageSrc, width: 60, height: 60, fit: BoxFit.cover)
                            : Container(
                                width: 60,
                                height: 60,
                                color: const Color(0xFF0F172A),
                                child: const Center(child: Text('🥗', style: TextStyle(fontSize: 24))),
                              ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(product.brand, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.grey, fontSize: 11)),
                            Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(color: badgeBg, borderRadius: BorderRadius.circular(4)),
                              child: Text(
                                currentDatabase == 'off' ? 'Nutri-Score $score' : 'INDB',
                                style: TextStyle(color: badgeText, fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            )
                          ],
                        ),
                      )
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildPillButton(String term) {
    return ActionChip(
      backgroundColor: const Color(0xFF1E293B),
      label: Text(term, style: const TextStyle(fontSize: 12)),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: const Color(0xFF1E293B))),
      onPressed: () => handlePillClick(term),
    );
  }
}

// Custom Painter for circular calorie gauge
class RadialProgressPainter extends CustomPainter {
  final double progress;
  final Color color;

  RadialProgressPainter({required this.progress, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final double strokeWidth = 8.0;
    final Offset center = Offset(size.width / 2, size.height / 2);
    final double radius = (min(size.width, size.height) - strokeWidth) / 2;

    final Paint backgroundPaint = Paint()
      ..color = const Color(0xFF1E293B)
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;

    final Paint progressPaint = Paint()
      ..shader = const SweepGradient(
        colors: [Color(0xFF6366F1), Color(0xFFEC4899), Color(0xFF6366F1)],
      ).createShader(Rect.fromCircle(center: center, radius: radius))
      ..strokeCap = StrokeCap.round
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;

    canvas.drawCircle(center, radius, backgroundPaint);

    final double sweepAngle = 2 * pi * min(progress, 1.0);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -pi / 2,
      sweepAngle,
      false,
      progressPaint,
    );
  }



  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
