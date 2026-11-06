import type { Product } from '../types/pos';

// Curated high quality textile & boutique images
const IMAGE_MAP: Record<string, string> = {
  'egyptian cotton': 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&auto=format&fit=crop&q=80',
  'bedsheet': 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&auto=format&fit=crop&q=80',
  'percale': 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=500&auto=format&fit=crop&q=80',
  'dabu': 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500&auto=format&fit=crop&q=80',
  'bed cover': 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500&auto=format&fit=crop&q=80',
  'quilt': 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=500&auto=format&fit=crop&q=80',
  'dohar': 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=500&auto=format&fit=crop&q=80',
  'kurti': 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=500&auto=format&fit=crop&q=80',
  'kurta': 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&auto=format&fit=crop&q=80',
  'chanderi': 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&auto=format&fit=crop&q=80',
  'cushion': 'https://images.unsplash.com/photo-1579656381226-5fc0f0100c3b?w=500&auto=format&fit=crop&q=80',
  'throw': 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500&auto=format&fit=crop&q=80',
  'handmade': 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=500&auto=format&fit=crop&q=80',
  'block-print': 'https://images.unsplash.com/photo-1579656381226-5fc0f0100c3b?w=500&auto=format&fit=crop&q=80',
};

export function getProductImage(product: Product): string {
  if (product.imageUrl && product.imageUrl.trim() !== '') {
    return product.imageUrl;
  }
  const lowerName = product.name.toLowerCase();
  for (const [key, url] of Object.entries(IMAGE_MAP)) {
    if (lowerName.includes(key)) {
      return url;
    }
  }

  // Category based fallbacks
  const cat = (product.category?.name || '').toLowerCase();
  if (cat.includes('bedsheet') || cat.includes('sheet')) {
    return 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&auto=format&fit=crop&q=80';
  }
  if (cat.includes('bed cover') || cat.includes('quilt') || cat.includes('dohar')) {
    return 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500&auto=format&fit=crop&q=80';
  }
  if (cat.includes('kurti') || cat.includes('apparel') || cat.includes('kid')) {
    return 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=500&auto=format&fit=crop&q=80';
  }
  if (cat.includes('handmade') || cat.includes('cushion') || cat.includes('throw')) {
    return 'https://images.unsplash.com/photo-1579656381226-5fc0f0100c3b?w=500&auto=format&fit=crop&q=80';
  }

  return 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&auto=format&fit=crop&q=80';
}

export function getProductEmoji(product: Product): string {
  const lower = product.name.toLowerCase();
  if (lower.includes('bedsheet') || lower.includes('sheet') || lower.includes('cotton')) return '🛏️';
  if (lower.includes('bed cover') || lower.includes('quilt') || lower.includes('dohar')) return '🧵';
  if (lower.includes('kurti') || lower.includes('kurta') || lower.includes('kid') || lower.includes('apparel')) return '👘';
  if (lower.includes('cushion') || lower.includes('pillow')) return '🛋️';
  if (lower.includes('throw') || lower.includes('blanket')) return '🧶';
  if (lower.includes('handmade') || lower.includes('dabu') || lower.includes('craft')) return '✨';
  return '🛍️';
}

export interface ProductBadge {
  label: string;
  type: 'bestseller' | 'popular' | 'new';
}

export function getProductBadge(product: Product): ProductBadge | null {
  const lower = product.name.toLowerCase();
  if (lower.includes('egyptian') || lower.includes('dabu') || lower.includes('bestseller')) {
    return { label: 'Bestseller', type: 'bestseller' };
  }
  if (lower.includes('mulmul') || lower.includes('chanderi') || lower.includes('festive')) {
    return { label: 'Festive', type: 'popular' };
  }
  if (lower.includes('artisanal') || lower.includes('cushion') || lower.includes('new')) {
    return { label: 'Handcrafted', type: 'new' };
  }
  return null;
}

export function getCategoryEmoji(catName: string): string {
  const lower = catName.toLowerCase();
  if (lower === 'all' || lower.includes('all')) return '⊞';
  if (lower.includes('bedsheet') || lower.includes('sheet') || lower.includes('bed sheet')) return '🛏️';
  if (lower.includes('bed cover') || lower.includes('spread')) return '🛌';
  if (lower.includes('dupatta') || lower.includes('stole') || lower.includes('scarf')) return '🧣';
  if (lower.includes('kids quilt') || lower.includes('baby') || lower.includes('dohar')) return '🧸';
  if (lower.includes('kurti') || lower.includes('kurta') || lower.includes('apparel') || lower.includes('kid')) return '👘';
  if (lower.includes('handmade') || lower.includes('cushion') || lower.includes('throw') || lower.includes('artisanal')) return '🧵';
  return '🛍️';
}
