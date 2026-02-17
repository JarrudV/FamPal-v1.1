export function formatPriceLevel(level?: string | number | null): string {
  if (level == null) return '—';
  if (typeof level === 'string') {
    if (level.startsWith('$') || level === 'Free') return level;
    switch (level) {
      case 'PRICE_LEVEL_FREE': return 'Free';
      case 'PRICE_LEVEL_INEXPENSIVE': return '$';
      case 'PRICE_LEVEL_MODERATE': return '$$';
      case 'PRICE_LEVEL_EXPENSIVE': return '$$$';
      case 'PRICE_LEVEL_VERY_EXPENSIVE': return '$$$$';
      default: return '—';
    }
  }
  switch (level) {
    case 0: return 'Free';
    case 1: return '$';
    case 2: return '$$';
    case 3: return '$$$';
    case 4: return '$$$$';
    default: return '—';
  }
}
