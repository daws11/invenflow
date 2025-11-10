function toAlnum(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, '');
}

function take(input: string, len: number): string {
  return input.substring(0, len);
}

function slugify(input: string): string {
  const slug = input
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-') // non-alnum to dash
    .replace(/^-+|-+$/g, ''); // trim dashes
  return take(slug, 8);
}

function djb2Hash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i); // hash * 33 + c
    hash |= 0; // force 32-bit
  }
  // convert to unsigned and hex
  const unsigned = hash >>> 0;
  return unsigned.toString(16).toUpperCase();
}

export interface GenerateSkuParams {
  name: string;
  supplier: string;
  category: string;
  dimensions?: string | null;
}

/**
 * Generate a deterministic, human-friendly SKU.
 * Format: SUP3-CAT3-SLUG8-HHHH
 */
export function generateStableSku(params: GenerateSkuParams): string {
  const sup3 = take(toAlnum(params.supplier.toUpperCase()), 3).padEnd(3, 'X');
  const cat3 = take(toAlnum(params.category.toUpperCase()), 3).padEnd(3, 'X');
  const slug8 = slugify(params.name);
  const hashBase = `${params.name}|${params.supplier}|${params.category}|${params.dimensions ?? ''}`.toUpperCase();
  const h4 = take(djb2Hash(hashBase), 4).padStart(4, '0');
  return `${sup3}-${cat3}-${slug8}-${h4}`;
}

export interface FingerprintParams {
  name: string;
  supplier: string;
  category: string;
  dimensions?: string | null;
}

/**
 * Build a normalized fingerprint string to match legacy products deterministically.
 */
export function buildProductFingerprint(params: FingerprintParams): string {
  const norm = (v: string) => v.trim().toUpperCase().replace(/\s+/g, ' ');
  const parts = [
    norm(params.name),
    norm(params.supplier),
    norm(params.category),
    params.dimensions ? norm(params.dimensions) : '',
  ];
  return parts.filter(Boolean).join('|');
}


