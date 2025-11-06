export const PRODUCT_CATEGORIES = [
  'Electronics',
  'Furniture',
  'Office Supplies',
  'Raw Materials',
  'Tools & Equipment',
  'Packaging',
  'Safety Equipment',
  'Cleaning Supplies',
  'Software',
  'Services',
  'Other',
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

