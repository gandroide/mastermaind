// ═══════════════════════════════════════════════════════
// Local Datasheet Mapping
// Maps inventory item names to local PDF datasheets in /public/docs/
// ═══════════════════════════════════════════════════════

interface DatasheetEntry {
  /** Case-insensitive keywords to match against item_name */
  keywords: string[];
  /** Path to the PDF relative to /public */
  path: string;
  /** Human-readable label for the button */
  label: string;
}

const DATASHEET_ENTRIES: DatasheetEntry[] = [
  {
    // "Modulo cargador de baterias usb 5v 1a"
    keywords: ['tp4056', 'cargador de baterias'],
    path: '/docs/TP4056.pdf',
    label: 'Ver Datasheet',
  },
  {
    // "Módulo Conversor Boost MT3608 DC-DC"
    keywords: ['mt3608', 'conversor boost'],
    path: '/docs/MT3608.pdf',
    label: 'Ver Datasheet',
  },
  {
    // "Microfono INMP441"
    keywords: ['inmp441', 'inmp401', 'microfono inmp'],
    path: '/docs/INMP401.PDF',
    label: 'Ver Datasheet',
  },
  {
    // "ESP32-S3"
    keywords: ['esp32-s3', 'esp32s3'],
    path: '/docs/esp32-s3_datasheet_en.pdf',
    label: 'Ver Datasheet',
  },
  {
    // "Placa de expansión de almacenamiento SD"
    keywords: ['microsd', 'micro sd', 'sd module', 'almacenamiento sd', 'expansión de almacenamiento', 'expansion de almacenamiento'],
    path: '/docs/Datasheet-MicroSD-Module.pdf',
    label: 'Ver Datasheet',
  },
];

/**
 * Resolve a local datasheet PDF path for an inventory item.
 * Returns the match or null if no datasheet is available.
 */
export function getDatasheetForItem(
  itemName: string
): { path: string; label: string } | null {
  const normalised = itemName.toLowerCase();

  for (const entry of DATASHEET_ENTRIES) {
    if (entry.keywords.some((kw) => normalised.includes(kw))) {
      return { path: entry.path, label: entry.label };
    }
  }

  return null;
}
