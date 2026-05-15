import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Core user profile
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  age: integer('age').notNull(),
  weightKg: real('weight_kg').notNull(),
  heightCm: real('height_cm').notNull(),
  region: text('region').default('INDIA'),
  createdAt: text('created_at').default('datetime("now")'),
});

// BMI & body composition snapshot
export const bioMetrics = sqliteTable('bio_metrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bmi: real('bmi').notNull(),
  bodyFatPct: real('body_fat_pct'),
  recordedAt: text('recorded_at').default('datetime("now")'),
});

// Daily calorie logs
export const calorieLogs = sqliteTable('calorie_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  foodName: text('food_name').notNull(),
  calories: real('calories').notNull(),
  mealType: text('meal_type'), // breakfast, lunch, dinner, snack
  isPackaged: integer('is_packaged', { mode: 'boolean' }).default(false),
  loggedAt: text('logged_at').default('datetime("now")'),
});

// Metabolism tracker readings
export const metabolismChecks = sqliteTable('metabolism_checks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  basalRateKcal: real('basal_rate_kcal').notNull(),
  activityLevel: text('activity_level'), // sedentary, light, moderate, active, very_active
  status: text('status'), // normal, low, high
  notes: text('notes'),
  checkedAt: text('checked_at').default('datetime("now")'),
});

// Microplastic body fluid readings
export const microplasticLogs = sqliteTable('microplastic_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fluidType: text('fluid_type').notNull(), // blood, urine, saliva
  levelPpb: real('level_ppb').notNull(), // parts per billion
  removalMethod: text('removal_method'), // food, exercise, both, none
  loggedAt: text('logged_at').default('datetime("now")'),
});

// Gut <-> Brain health log
export const gutBrainLogs = sqliteTable('gut_brain_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  moodScore: integer('mood_score'), // 1-10
  gutScore: integer('gut_score'), // 1-10
  abnormality: text('abnormality'),
  patternNote: text('pattern_note'),
  loggedAt: text('logged_at').default('datetime("now")'),
});

// Stool analysis
export const stoolLogs = sqliteTable('stool_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  colour: text('colour').notNull(),
  bristolType: integer('bristol_type'), // 1-7
  notes: text('notes'),
  loggedAt: text('logged_at').default('datetime("now")'),
});

// Pain heatmap logs
export const painLogs = sqliteTable('pain_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bodyRegion: text('body_region').notNull(), // upper_back, abdomen
  heatLevel: integer('heat_level'), // 1-10
  painType: text('pain_type'), // sharp, dull, burning, aching
  loggedAt: text('logged_at').default('datetime("now")'),
});

// Static remedies catalogue
export const remedies = sqliteTable('remedies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  tradition: text('tradition'), // ayurvedic, hadith, regional
  description: text('description').notNull(),
  forSymptom: text('for_symptom'),
  isFood: integer('is_food', { mode: 'boolean' }).default(true),
});

// remedy usage
export const remedyUsage = sqliteTable('remedy_usage', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  remedyId: integer('remedy_id').notNull().references(() => remedies.id),
  startedAt: text('started_at').default('datetime("now")'),
  outcome: text('outcome'),
});
