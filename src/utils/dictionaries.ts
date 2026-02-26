export type AppLanguage = 'es' | 'pt';

export const dictionaries = {
  es: {
    // Buttons
    next: 'Siguiente',
    prev: 'Anterior',
    save: 'Guardar',
    close: 'Cerrar',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    // Labels
    quantityNeeded: 'Cantidad Necesaria',
    phase: 'Fase',
    materials: 'Materiales',
    notes: 'Notas',
    description: 'Descripción',
    loading: 'Cargando...',
    error: 'Ocurrió un error',
    unauthorized: 'Acceso denegado',
    // Blueprint Specific
    blueprintViewer: 'Visor de Blueprint',
    step: 'Paso',
    of: 'de',
    noMaterials: 'No se requieren materiales adicionales para esta fase.',
    pinRequired: 'PIN Requerido',
    enterPin: 'Ingresa el PIN de acceso provisto',
    unlock: 'Desbloquear',
    invalidPin: 'PIN incorrecto',
    schematic: 'Esquemático',
    // Inventory Specific
    inventory: 'Inventario Físico',
    searchInventory: 'Buscar en inventario...',
    stock: 'Stock',
    saveChanges: 'Guardar Cambios',
    changesSaved: 'Cambios guardados',
    // Table Headers
    img: 'Img',
    name: 'Nombre',
    category: 'Categoría',
    location: 'Ubicación',
    // Modal
    newItem: 'Nuevo Ítem',
    itemName: 'Nombre del ítem',
    itemCategory: 'Categoría',
    select: 'Seleccionar...',
    quantityUnits: 'Cantidad (unidades)',
    technicalDescription: 'Descripción Técnica',
    imageRef: 'Imagen de Referencia',
    schematicRef: 'Esquema Eléctrico',
    uploadFile: 'Seleccionar archivo',
    createItem: 'Crear Ítem'
  },
  pt: {
    // Buttons
    next: 'Próximo',
    prev: 'Anterior',
    save: 'Guardar',
    close: 'Fechar',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    // Labels
    quantityNeeded: 'Quantidade Necessária',
    phase: 'Fase',
    materials: 'Materiais',
    notes: 'Notas',
    description: 'Descrição',
    loading: 'Carregando...',
    error: 'Ocorreu um erro',
    unauthorized: 'Acesso negado',
    // Blueprint Specific
    blueprintViewer: 'Visualizador de Blueprint',
    step: 'Passo',
    of: 'de',
    noMaterials: 'Nenhum material adicional necessário para esta fase.',
    pinRequired: 'PIN Necessário',
    enterPin: 'Insira o PIN de acesso fornecido',
    unlock: 'Desbloquear',
    invalidPin: 'PIN incorreto',
    schematic: 'Esquemático',
    // Inventory Specific
    inventory: 'Estoque Físico',
    searchInventory: 'Procurar no estoque...',
    stock: 'Estoque',
    saveChanges: 'Salvar Alterações',
    changesSaved: 'Alterações salvas',
    // Table Headers
    img: 'Img',
    name: 'Nome',
    category: 'Categoria',
    location: 'Localização',
    // Modal
    newItem: 'Novo Item',
    itemName: 'Nome do item',
    itemCategory: 'Categoria',
    select: 'Selecionar...',
    quantityUnits: 'Quantidade (unidades)',
    technicalDescription: 'Descrição Técnica',
    imageRef: 'Imagem de Referência',
    schematicRef: 'Esquema Elétrico',
    uploadFile: 'Selecionar arquivo',
    createItem: 'Criar Item'
  }
};

export function getDictionary(lang: string | null) {
  if (lang === 'pt') return dictionaries.pt;
  return dictionaries.es;
}
