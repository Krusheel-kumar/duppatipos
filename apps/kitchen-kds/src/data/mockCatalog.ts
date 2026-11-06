import type { Product, ProductCategory } from '../types/pos';

export const MOCK_CATEGORIES: ProductCategory[] = [
  { id: 'cat-all', name: 'All Items' },
  { id: 'cat-boba', name: 'Boba Tea', description: 'Freshly brewed milk and fruit teas' },
  { id: 'cat-coffee', name: 'Coffee & Espresso', description: 'Artisan espresso and cold brews' },
  { id: 'cat-shakes', name: 'Milkshakes', description: 'Rich blended shakes and smoothies' },
  { id: 'cat-snacks', name: 'Bakery & Snacks', description: 'Pastries and savory bites' },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Brown Sugar Boba Milk',
    description: 'Signature tiger stripe brown sugar syrup with fresh organic whole milk and warm chewy tapioca pearls.',
    sku: 'BOBA-BS-01',
    basePrice: 5.25,
    isActive: true,
    category: MOCK_CATEGORIES[1],
    variants: [
      { id: 'var-1a', name: 'Regular 360ml', sizeLabel: '360 ml', price: 5.25, isActive: true },
      { id: 'var-1b', name: 'Large 500ml', sizeLabel: '500 ml', price: 6.25, isActive: true },
    ],
    addOns: [
      { id: 'addon-1', name: 'Extra Tapioca Pearls', price: 0.75, isActive: true },
      { id: 'addon-2', name: 'Cheese Foam Cap', price: 1.00, isActive: true },
      { id: 'addon-3', name: 'Egg Pudding', price: 0.85, isActive: true },
    ],
  },
  {
    id: 'prod-2',
    name: 'Taro Milk Tea',
    description: 'Creamy sweet taro blended with rich black tea.',
    sku: 'BOBA-TARO-02',
    basePrice: 4.95,
    isActive: true,
    category: MOCK_CATEGORIES[1],
    variants: [
      { id: 'var-2a', name: 'Regular 360ml', sizeLabel: '360 ml', price: 4.95, isActive: true },
      { id: 'var-2b', name: 'Large 500ml', sizeLabel: '500 ml', price: 5.95, isActive: true },
    ],
    addOns: [
      { id: 'addon-1', name: 'Extra Tapioca Pearls', price: 0.75, isActive: true },
      { id: 'addon-4', name: 'Coconut Jelly', price: 0.75, isActive: true },
    ],
  },
  {
    id: 'prod-3',
    name: 'Matcha Latte',
    description: 'Uji ceremonial grade green tea matcha with steamed milk.',
    sku: 'BOBA-MAT-03',
    basePrice: 5.50,
    isActive: true,
    category: MOCK_CATEGORIES[1],
    variants: [
      { id: 'var-3a', name: 'Regular 360ml', sizeLabel: '360 ml', price: 5.50, isActive: true },
      { id: 'var-3b', name: 'Large 500ml', sizeLabel: '500 ml', price: 6.50, isActive: true },
    ],
    addOns: [
      { id: 'addon-2', name: 'Cheese Foam Cap', price: 1.00, isActive: true },
      { id: 'addon-5', name: 'Red Bean', price: 0.75, isActive: true },
    ],
  },
  {
    id: 'prod-4',
    name: 'Iced Caramel Macchiato',
    description: 'Fresh espresso poured over vanilla syrup, chilled milk and caramel drizzle.',
    sku: 'COF-CAR-01',
    basePrice: 4.75,
    isActive: true,
    category: MOCK_CATEGORIES[2],
    variants: [
      { id: 'var-4a', name: 'Single Shot 300ml', sizeLabel: '300 ml', price: 4.75, isActive: true },
      { id: 'var-4b', name: 'Double Shot 450ml', sizeLabel: '450 ml', price: 5.75, isActive: true },
    ],
    addOns: [
      { id: 'addon-6', name: 'Oat Milk Sub', price: 0.80, isActive: true },
      { id: 'addon-7', name: 'Extra Espresso Shot', price: 1.25, isActive: true },
    ],
  },
  {
    id: 'prod-5',
    name: 'Cold Brew Reserve',
    description: 'Steeped for 18 hours in cold filtered water for ultra-smooth low acidity coffee.',
    sku: 'COF-CB-02',
    basePrice: 4.50,
    isActive: true,
    category: MOCK_CATEGORIES[2],
    variants: [
      { id: 'var-5a', name: 'Regular 360ml', sizeLabel: '360 ml', price: 4.50, isActive: true },
      { id: 'var-5b', name: 'Large 500ml', sizeLabel: '500 ml', price: 5.50, isActive: true },
    ],
    addOns: [
      { id: 'addon-8', name: 'Vanilla Sweet Cream', price: 0.75, isActive: true },
    ],
  },
  {
    id: 'prod-6',
    name: 'Belgian Chocolate Shake',
    description: 'Decadent dark chocolate gelato blended with creamy whole milk and whipped cream.',
    sku: 'SHK-CHOC-01',
    basePrice: 5.95,
    isActive: true,
    category: MOCK_CATEGORIES[3],
    variants: [
      { id: 'var-6a', name: 'Standard 450ml', sizeLabel: '450 ml', price: 5.95, isActive: true },
    ],
    addOns: [
      { id: 'addon-9', name: 'Chocolate Chips', price: 0.50, isActive: true },
      { id: 'addon-10', name: 'Crushed Oreos', price: 0.75, isActive: true },
    ],
  },
  {
    id: 'prod-7',
    name: 'Butter Croissant',
    description: 'Golden flaky French butter pastry.',
    sku: 'SNK-CR-01',
    basePrice: 3.50,
    isActive: true,
    category: MOCK_CATEGORIES[4],
    variants: [],
    addOns: [],
  },
  {
    id: 'prod-8',
    name: 'Seasonal Strawberry Smoothie',
    description: 'Fresh ripe strawberries with greek yogurt and wild honey (Currently Sold Out).',
    sku: 'SHK-STR-02',
    basePrice: 6.25,
    isActive: false, // inactive / sold out
    category: MOCK_CATEGORIES[3],
    variants: [],
    addOns: [],
  },
];
