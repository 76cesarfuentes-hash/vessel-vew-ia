export const NO_DATA = 'Dato no disponible';

/**
 * Normalizes any port string (e.g. UN/LOCODE like MXVER, USHOU, CNSHA, MXZLO)
 * into a standard 3-letter port code (VER, HOU, SHA, ZLO, LZC).
 * If the string is missing, invalid or empty, returns "Dato no disponible".
 */
export function normalizePortCode(rawPort: string | undefined | null): string {
  if (!rawPort) return NO_DATA;
  const clean = String(rawPort).trim().toUpperCase();
  if (!clean || clean === 'ND' || clean === 'NO DATA AVAILABLE IN BAPLIE' || clean === 'DATO NO DISPONIBLE') {
    return NO_DATA;
  }

  // Known direct overrides
  if (clean === 'CLSAI' || clean === 'SAI' || clean === 'SAN ANTONIO' || clean === 'STI') return 'CLSAI';
  if (clean === 'CLVAP' || clean === 'VAP' || clean === 'VALPARAISO') return 'CLVAP';
  if (clean === 'PECLL' || clean === 'CLL' || clean === 'CALLAO') return 'PECLL';
  if (clean === 'ECMEC' || clean === 'MEC' || clean === 'GUAYAQUIL') return 'ECMEC';
  if (clean === 'MXVER' || clean === 'VERACRUZ' || clean === 'ICAVE' || clean === 'VER') return 'VER';
  if (clean === 'MXLZC' || clean === 'LAZARO CARDENAS' || clean === 'LAZARO' || clean === 'LCT' || clean === 'LZC') return 'LZC';
  if (clean === 'MXZLO' || clean === 'MANZANILLO' || clean === 'TIMSA' || clean === 'CONTECON' || clean === 'ZLO') return 'ZLO';
  if (clean === 'MXESE' || clean === 'ENSENADA' || clean === 'ETI' || clean === 'ESE') return 'ETI';
  if (clean === 'USHOU' || clean === 'HOUSTON') return 'HOU';
  if (clean === 'CNSHA' || clean === 'SHANGHAI') return 'SHA';
  if (clean === 'HKHKG' || clean === 'HONG KONG') return 'HKG';
  if (clean === 'BUSAN' || clean === 'KRPUS') return 'PUS';

  // 5-letter UN/LOCODEs (e.g., MXVER -> VER, USLAX -> LAX)
  if (clean.length === 5 && /^[A-Z]{5}$/.test(clean)) {
    return clean.substring(2);
  }

  // If already 3 letters or less
  if (clean.length <= 3) {
    return clean;
  }

  // Fallback: take last 3 letters or first 3 letters
  return clean.substring(clean.length - 3);
}
