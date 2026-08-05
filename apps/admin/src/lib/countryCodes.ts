export interface CountryCode {
  iso2: string;
  name: string;
  /** Codigo de pais, sin "+". */
  dialCode: string;
  flag: string;
}

// Bolivia primero (mercado principal de la tienda); resto en orden alfabetico.
export const COUNTRY_CODES: CountryCode[] = [
  { iso2: 'BO', name: 'Bolivia', dialCode: '591', flag: '🇧🇴' },
  { iso2: 'AR', name: 'Argentina', dialCode: '54', flag: '🇦🇷' },
  { iso2: 'BR', name: 'Brasil', dialCode: '55', flag: '🇧🇷' },
  { iso2: 'CL', name: 'Chile', dialCode: '56', flag: '🇨🇱' },
  { iso2: 'CO', name: 'Colombia', dialCode: '57', flag: '🇨🇴' },
  { iso2: 'EC', name: 'Ecuador', dialCode: '593', flag: '🇪🇨' },
  { iso2: 'ES', name: 'España', dialCode: '34', flag: '🇪🇸' },
  { iso2: 'US', name: 'Estados Unidos', dialCode: '1', flag: '🇺🇸' },
  { iso2: 'MX', name: 'México', dialCode: '52', flag: '🇲🇽' },
  { iso2: 'PY', name: 'Paraguay', dialCode: '595', flag: '🇵🇾' },
  { iso2: 'PE', name: 'Perú', dialCode: '51', flag: '🇵🇪' },
  { iso2: 'UY', name: 'Uruguay', dialCode: '598', flag: '🇺🇾' },
  { iso2: 'VE', name: 'Venezuela', dialCode: '58', flag: '🇻🇪' },
];

/** Separa un numero completo (ej. "59174162758") en codigo de pais + numero local,
 * eligiendo el codigo mas largo que calce (evita que "1" (US) le gane a "591" (Bolivia)). */
export function splitWhatsappNumber(full: string): { dialCode: string; local: string } {
  const digits = full.replace(/\D/g, '');
  const match = [...COUNTRY_CODES].sort((a, b) => b.dialCode.length - a.dialCode.length).find((c) => digits.startsWith(c.dialCode));
  if (!match) return { dialCode: COUNTRY_CODES[0].dialCode, local: digits };
  return { dialCode: match.dialCode, local: digits.slice(match.dialCode.length) };
}
