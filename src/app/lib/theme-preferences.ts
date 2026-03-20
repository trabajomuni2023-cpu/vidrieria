export type ThemePaletteId = 'oceano' | 'esmeralda' | 'terracota' | 'grafito';

export type ThemePalette = {
  id: ThemePaletteId;
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
};

export type ThemePreset = {
  id: string;
  name: string;
  description: string;
  preferences: ThemePreferences;
};

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

export function getThemePaletteById(id?: string | null) {
  return themePalettes.find((palette) => palette.id === id) || themePalettes[0];
}

export function getStoredThemePreferences(): ThemePreferences {
  if (typeof window === 'undefined') {
    return {
      contentPaletteId: 'oceano',
      sidebarPaletteId: 'grafito',
    };
  }

  const legacyPalette = window.localStorage.getItem(LEGACY_STORAGE_KEY) as ThemePaletteId | null;
  const contentPaletteId = (window.localStorage.getItem(CONTENT_STORAGE_KEY) as ThemePaletteId | null) || legacyPalette || 'oceano';
  const sidebarPaletteId = (window.localStorage.getItem(SIDEBAR_STORAGE_KEY) as ThemePaletteId | null) || legacyPalette || 'grafito';

  return {
    contentPaletteId: getThemePaletteById(contentPaletteId).id,
    sidebarPaletteId: getThemePaletteById(sidebarPaletteId).id,
  };
}

export function applyThemePreferences(preferences: ThemePreferences) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.setAttribute('data-content-palette', preferences.contentPaletteId);
  document.documentElement.setAttribute('data-sidebar-palette', preferences.sidebarPaletteId);
  window.localStorage.setItem(CONTENT_STORAGE_KEY, preferences.contentPaletteId);
  window.localStorage.setItem(SIDEBAR_STORAGE_KEY, preferences.sidebarPaletteId);
}

export function applyContentPalette(contentPaletteId: ThemePaletteId) {
  const current = getStoredThemePreferences();
  applyThemePreferences({
    ...current,
    contentPaletteId,
  });
}

export function applySidebarPalette(sidebarPaletteId: ThemePaletteId) {
  const current = getStoredThemePreferences();
  applyThemePreferences({
    ...current,
    sidebarPaletteId,
  });
}
