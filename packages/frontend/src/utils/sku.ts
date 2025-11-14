export function generateStableSku(params: {
  name: string;
  supplier?: string;
  category?: string;
  dimensions?: string | null;
}): string {
  const toAlnum = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '');
  const take = (s: string, n: number) => s.substring(0, n);
  const slugify = (s: string) =>
    take(
      s
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
      8
    );
  const djb2Hash = (s: string) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) + h) + s.charCodeAt(i);
      h |= 0;
    }
    const unsigned = h >>> 0;
    return unsigned.toString(16).toUpperCase();
  };

  const sup3 = take(toAlnum((params.supplier || '').toUpperCase()), 3).padEnd(3, 'X');
  const cat3 = take(toAlnum((params.category || '').toUpperCase()), 3).padEnd(3, 'X');
  const slug8 = slugify(params.name);
  const hashBase = `${params.name}|${params.supplier || ''}|${params.category || ''}|${params.dimensions || ''}`.toUpperCase();
  const h4 = take(djb2Hash(hashBase), 4).padStart(4, '0');
  return `${sup3}-${cat3}-${slug8}-${h4}`;
}


