export const EXPENSE_CATEGORIES = [
  'Food & Drinks',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Travel',
  'Other',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export const CATEGORY_SYNONYMS: Record<string, ExpenseCategory> = {
  // Food & Drinks
  'food': 'Food & Drinks',
  'drinks': 'Food & Drinks',
  'coffee': 'Food & Drinks',
  'restaurant': 'Food & Drinks',
  'groceries': 'Food & Drinks',
  'lunch': 'Food & Drinks',
  'dinner': 'Food & Drinks',
  'breakfast': 'Food & Drinks',
  'snack': 'Food & Drinks',
  'meal': 'Food & Drinks',
  'eating': 'Food & Drinks',
  'drink': 'Food & Drinks',
  'bar': 'Food & Drinks',
  'pub': 'Food & Drinks',

  // Transportation
  'transport': 'Transportation',
  'uber': 'Transportation',
  'lyft': 'Transportation',
  'taxi': 'Transportation',
  'gas': 'Transportation',
  'fuel': 'Transportation',
  'parking': 'Transportation',
  'bus': 'Transportation',
  'train': 'Transportation',
  'subway': 'Transportation',
  'metro': 'Transportation',
  'car': 'Transportation',
  'rideshare': 'Transportation',

  // Shopping
  'shop': 'Shopping',
  'clothes': 'Shopping',
  'clothing': 'Shopping',
  'electronics': 'Shopping',
  'purchase': 'Shopping',
  'buy': 'Shopping',
  'bought': 'Shopping',
  'amazon': 'Shopping',
  'store': 'Shopping',
  'mall': 'Shopping',
  'shoes': 'Shopping',

  // Entertainment
  'movies': 'Entertainment',
  'movie': 'Entertainment',
  'cinema': 'Entertainment',
  'games': 'Entertainment',
  'gaming': 'Entertainment',
  'subscription': 'Entertainment',
  'netflix': 'Entertainment',
  'spotify': 'Entertainment',
  'concert': 'Entertainment',
  'show': 'Entertainment',
  'theater': 'Entertainment',
  'fun': 'Entertainment',

  // Bills & Utilities
  'bills': 'Bills & Utilities',
  'bill': 'Bills & Utilities',
  'utilities': 'Bills & Utilities',
  'rent': 'Bills & Utilities',
  'phone': 'Bills & Utilities',
  'electricity': 'Bills & Utilities',
  'water': 'Bills & Utilities',
  'internet': 'Bills & Utilities',
  'wifi': 'Bills & Utilities',
  'insurance': 'Bills & Utilities',

  // Healthcare
  'health': 'Healthcare',
  'doctor': 'Healthcare',
  'medical': 'Healthcare',
  'pharmacy': 'Healthcare',
  'medicine': 'Healthcare',
  'hospital': 'Healthcare',
  'dentist': 'Healthcare',
  'dental': 'Healthcare',

  // Travel
  'flight': 'Travel',
  'flights': 'Travel',
  'hotel': 'Travel',
  'vacation': 'Travel',
  'trip': 'Travel',
  'airbnb': 'Travel',
  'booking': 'Travel',
  'airline': 'Travel',
};
