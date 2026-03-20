export type ThemePaletteId = 'oceano' | 'esmeralda' | 'terracota' | 'grafito' | 'personalizado';

export type ThemePalette = {
  id: Exclude<ThemePaletteId, 'personalizado'>;
  name: string;
  description: string;
  accent: string;
  accentSoft: string;
  accentStrong: string;
  accentContrast: string;
  surfaceTint: string;
  heroFrom: string;
  heroVia: string;
  heroTo: string;
};

export type ThemePreferences = {
  contentPaletteId: ThemePaletteId;
  sidebarPaletteId: ThemePaletteId;
  contentCustomColor?: string | null;
  sidebarCustomColor?: string | null;
};

export type ThemePreset = {
  id: string;
  name: string;
  description: string;
  preferences: ThemePreferences;
};

type DerivedPalette = {
  accent: string;
  accentSoft: string;
  accentStrong: string;
  accentContrast: string;
  surfaceTint: string;
  heroFrom: string;
  heroVia: string;
  heroTo: string;
};

const DEFAULT_CONTENT_CUSTOM = '#2563eb';
const DEFAULT_SIDEBAR_CUSTOM = '#1e293b';

export const themePalettes: ThemePalette[] = [
  {
    id: 'oceano',
    name: 'Oceano',
    description: 'Azules sobrios para una vista limpia y moderna.',
    accent: '#2563eb',
    accentSoft: '#dbeafe',
    accentStrong: '#1d4ed8',
    accentContrast: '#ffffff',
    surfaceTint: '#eff6ff',
    heroFrom: '#0f172a',
    heroVia: '#172554',
    heroTo: '#0c4a6e',
  },
  {
    id: 'esmeralda',
    name: 'Esmeralda',
    description: 'Verdes suaves para una sensacion fresca y comercial.',
    accent: '#059669',
    accentSoft: '#d1fae5',
    accentStrong: '#047857',
    accentContrast: '#ffffff',
    surfaceTint: '#ecfdf5',
    heroFrom: '#052e2b',
    heroVia: '#065f46',
    heroTo: '#0f766e',
  },
  {
    id: 'terracota',
    name: 'Terracota',
    description: 'Tonos calidos con mucha presencia visual.',
    accent: '#c2410c',
    accentSoft: '#ffedd5',
    accentStrong: '#9a3412',
    accentContrast: '#ffffff',
    surfaceTint: '#fff7ed',
    heroFrom: '#431407',
    heroVia: '#9a3412',
    heroTo: '#b45309',
  },
  {
    id: 'grafito',
    name: 'Grafito',
    description: 'Neutro elegante para zonas que deben cansar menos la vista.',
    accent: '#334155',
    accentSoft: '#e2e8f0',
    accentStrong: '#1e293b',
    accentContrast: '#ffffff',
    surfaceTint: '#f8fafc',
    heroFrom: '#0f172a',
    heroVia: '#1e293b',
    heroTo: '#334155',
  },
];

export const themePresets: ThemePreset[] = [
  {
    id: 'suave',
    name: 'Suave',
    description: 'Menu sobrio y vista principal fresca para descansar la vista.',
    preferences: {
      sidebarPaletteId: 'grafito',
      contentPaletteId: 'esmeralda',
    },
  },
  {
    id: 'elegante',
    name: 'Elegante',
    description: 'Una combinacion seria y limpia para presentacion formal.',
    preferences: {
      sidebarPaletteId: 'grafito',
      contentPaletteId: 'oceano',
    },
  },
  {
    id: 'comercial',
    name: 'Comercial',
    description: 'Mas calida y llamativa para mostrar energia de marca.',
    preferences: {
      sidebarPaletteId: 'terracota',
      contentPaletteId: 'oceano',
    },
  },
];

const LEGACY_STORAGE_KEY = 'vidrieria-theme-palette';
const CONTENT_STORAGE_KEY = 'vidrieria-theme-content-palette';
const SIDEBAR_STORAGE_KEY = 'vidrieria-theme-sidebar-palette';
const CONTENT_CUSTOM_STORAGE_KEY = 'vidrieria-theme-content-custom';
const SIDEBAR_CUSTOM_STORAGE_KEY = 'vidrieria-theme-sidebar-custom';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeHex(value?: string | null, fallback = DEFAULT_CONTENT_CUSTOM) {
  const candidate = String(value || '').trim();

  if (/^#[0-9a-fA-F]{6}$/.test(candidate)) {
    return candidate.toLowerCase();
  }

  return fallback;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

function mixColors(baseHex: string, mixHex: string, weight: number) {
  const base = hexToRgb(baseHex);
  const mix = hexToRgb(mixHex);
  return rgbToHex(
    base.r * (1 - weight) + mix.r * weight,
    base.g * (1 - weight) + mix.g * weight,
    base.b * (1 - weight) + mix.b * weight,
  );
}

function getContrastColor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.6 ? '#0f172a' : '#ffffff';
}

function derivePalette(baseColor: string): DerivedPalette {
  const accent = normalizeHex(baseColor);
  return {
    accent,
    accentSoft: mixColors(accent, '#ffffff', 0.82),
    accentStrong: mixColors(accent, '#000000', 0.2),
    accentContrast: getContrastColor(accent),
    surfaceTint: mixColors(accent, '#ffffff', 0.9),
    heroFrom: mixColors(accent, '#020617', 0.78),
    heroVia: mixColors(accent, '#020617', 0.45),
    heroTo: mixColors(accent, '#ffffff', 0.08),
  };
}

export function getThemePaletteById(id?: string | null) {
  return themePalettes.find((palette) => palette.id === id) || themePalettes[0];
}

export function getStoredThemePreferences(): ThemePreferences {
  if (typeof window === 'undefined') {
    return {
      contentPaletteId: 'oceano',
      sidebarPaletteId: 'grafito',
      contentCustomColor: DEFAULT_CONTENT_CUSTOM,
      sidebarCustomColor: DEFAULT_SIDEBAR_CUSTOM,
    };
  }

  const legacyPalette = window.localStorage.getItem(LEGACY_STORAGE_KEY) as ThemePaletteId | null;
  const contentPaletteId = (window.localStorage.getItem(CONTENT_STORAGE_KEY) as ThemePaletteId | null) || legacyPalette || 'oceano';
  const sidebarPaletteId = (window.localStorage.getItem(SIDEBAR_STORAGE_KEY) as ThemePaletteId | null) || legacyPalette || 'grafito';
  const contentCustomColor = window.localStorage.getItem(CONTENT_CUSTOM_STORAGE_KEY) || DEFAULT_CONTENT_CUSTOM;
  const sidebarCustomColor = window.localStorage.getItem(SIDEBAR_CUSTOM_STORAGE_KEY) || DEFAULT_SIDEBAR_CUSTOM;

  return {
    contentPaletteId: contentPaletteId === 'personalizado' ? 'personalizado' : getThemePaletteById(contentPaletteId).id,
    sidebarPaletteId: sidebarPaletteId === 'personalizado' ? 'personalizado' : getThemePaletteById(sidebarPaletteId).id,
    contentCustomColor: normalizeHex(contentCustomColor, DEFAULT_CONTENT_CUSTOM),
    sidebarCustomColor: normalizeHex(sidebarCustomColor, DEFAULT_SIDEBAR_CUSTOM),
  };
}

function applyCustomVariables(preferences: ThemePreferences) {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;

  if (preferences.contentPaletteId === 'personalizado') {
    const derived = derivePalette(preferences.contentCustomColor || DEFAULT_CONTENT_CUSTOM);
    root.style.setProperty('--brand-600', derived.accent);
    root.style.setProperty('--brand-700', derived.accentStrong);
    root.style.setProperty('--brand-100', derived.accentSoft);
    root.style.setProperty('--brand-50', derived.surfaceTint);
    root.style.setProperty('--brand-contrast', derived.accentContrast);
    root.style.setProperty('--hero-from', derived.heroFrom);
    root.style.setProperty('--hero-via', derived.heroVia);
    root.style.setProperty('--hero-to', derived.heroTo);
  } else {
    root.style.removeProperty('--brand-600');
    root.style.removeProperty('--brand-700');
    root.style.removeProperty('--brand-100');
    root.style.removeProperty('--brand-50');
    root.style.removeProperty('--brand-contrast');
    root.style.removeProperty('--hero-from');
    root.style.removeProperty('--hero-via');
    root.style.removeProperty('--hero-to');
  }

  if (preferences.sidebarPaletteId === 'personalizado') {
    const derived = derivePalette(preferences.sidebarCustomColor || DEFAULT_SIDEBAR_CUSTOM);
    root.style.setProperty('--sidebar-from', derived.heroFrom);
    root.style.setProperty('--sidebar-to', derived.heroVia);
    root.style.setProperty('--sidebar-hover', 'rgba(255, 255, 255, 0.08)');
    root.style.setProperty('--sidebar-border-strong', 'rgba(255, 255, 255, 0.08)');
  } else {
    root.style.removeProperty('--sidebar-from');
    root.style.removeProperty('--sidebar-to');
    root.style.removeProperty('--sidebar-hover');
    root.style.removeProperty('--sidebar-border-strong');
  }
}

export function applyThemePreferences(preferences: ThemePreferences) {
  if (typeof document === 'undefined') {
    return;
  }

  const normalized = {
    ...preferences,
    contentCustomColor: normalizeHex(preferences.contentCustomColor, DEFAULT_CONTENT_CUSTOM),
    sidebarCustomColor: normalizeHex(preferences.sidebarCustomColor, DEFAULT_SIDEBAR_CUSTOM),
  };

  document.documentElement.setAttribute('data-content-palette', normalized.contentPaletteId);
  document.documentElement.setAttribute('data-sidebar-palette', normalized.sidebarPaletteId);
  window.localStorage.setItem(CONTENT_STORAGE_KEY, normalized.contentPaletteId);
  window.localStorage.setItem(SIDEBAR_STORAGE_KEY, normalized.sidebarPaletteId);
  window.localStorage.setItem(CONTENT_CUSTOM_STORAGE_KEY, normalized.contentCustomColor);
  window.localStorage.setItem(SIDEBAR_CUSTOM_STORAGE_KEY, normalized.sidebarCustomColor);

  applyCustomVariables(normalized);
}

export function applyContentPalette(contentPaletteId: ThemePaletteId, contentCustomColor?: string | null) {
  const current = getStoredThemePreferences();
  applyThemePreferences({
    ...current,
    contentPaletteId,
    contentCustomColor: contentCustomColor ?? current.contentCustomColor,
  });
}

export function applySidebarPalette(sidebarPaletteId: ThemePaletteId, sidebarCustomColor?: string | null) {
  const current = getStoredThemePreferences();
  applyThemePreferences({
    ...current,
    sidebarPaletteId,
    sidebarCustomColor: sidebarCustomColor ?? current.sidebarCustomColor,
  });
}
