const COLUMN_INDEX = 45;

// ChangeColorHandler.js
export default class ChangeColorHandler {
  constructor(hotInstance) {
    if (!hotInstance) {
      throw new Error('Handsontable instance is required');
    }

    this.hotInstance = hotInstance;
    this.colorMap = {
      'Succès': '#99FF99',
      'Echec': '#FF9999',
      'Annulé': '#FFF2CC'
    };
  }

  static rowRenderer(instance, TD, row, col, prop, value, cellProperties) {
    // Call the text renderer as default
    Handsontable.renderers.TextRenderer.apply(this, arguments);
    
    // Customizations
    ChangeColorHandler.applySpecialRowColor(TD, cellProperties);
    ChangeColorHandler.applyDropdownRenderer(TD,cellProperties);
  }

  static applySpecialRowColor(TD, cellProperties) {
    if (cellProperties.specialRow) {
      TD.style.backgroundColor = cellProperties.specialRowColor;
    }
  }

  static applyDropdownRenderer(cellProperties) {
    if (!cellProperties) {
      console.error("cellProperties is undefined");
      return;
    }
  
    if (cellProperties.type !== 'dropdown') {
      return;
    }
    if (cellProperties.specialRow) {
      TD.style.backgroundColor = cellProperties.specialRowColor;
    }
}  

  populateSpecialRows(columnData) {
    const specialRows = new Map();

    columnData.forEach((value, row) => {
      if (this.colorMap[value]) {
        if (!specialRows.has(value)) {
          specialRows.set(value, new Set());
        }
        specialRows.get(value).add(row);
      }
    });

    return specialRows;
  }

  
  applyColor() {
    try {
      const columnData = this.hotInstance.getDataAtCol(COLUMN_INDEX);
      const specialRows = this.populateSpecialRows(columnData);
      const colCount = this.hotInstance.countCols();
  
      for (const [specialValue, rows] of specialRows.entries()) {
        const color = this.colorMap[specialValue];
        rows.forEach(row => {
          for (let col = 0; col < colCount; col++) {
            const meta = this.hotInstance.getCellMeta(row, col);
            if (!meta) {
              console.error('Meta is undefined for row:', row, 'col:', col);
              continue;
            }
            if (meta.type === 'checkbox') {
              continue; // Skip checkboxes
            }
            meta.specialRow = true;
            meta.specialRowColor = color;
            meta.renderer = ChangeColorHandler.rowRenderer;
          }
        });
      }
      this.hotInstance.render();
    } catch (error) {
      console.error("Failed to apply color: ", error);
    }

  } 
}