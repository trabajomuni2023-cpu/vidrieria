-- Add theme palette settings to business configuration
ALTER TABLE "ConfiguracionNegocio"
ADD COLUMN "contentPalette" TEXT NOT NULL DEFAULT 'oceano',
ADD COLUMN "sidebarPalette" TEXT NOT NULL DEFAULT 'grafito';
