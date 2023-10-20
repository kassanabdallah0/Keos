
export default class UIManager {
    constructor(hotInstance, suggestionsHandler, CellManager) {
      this.hotInstance = hotInstance;
      this.suggestionsHandler = suggestionsHandler;
      this.CellManager = CellManager;
    }
  
    // Function to confirm suggestions
    async confirmSuggestions(row) {
      try {
        if (!this.suggestionsHandler.validateRowNumber(row)) {
          return;
        }
        const rowMeta = this.hotInstance.getCellMetaAtRow(row);
        this.updateCellClass(row, rowMeta, 'grey-text', 'black-text');
      } catch (error) {
        this.handleError(error, "An error occurred in confirmSuggestions");
      }
    }
  
    // Function to update cell class
    async updateCellClass(row, rowMeta, oldClassName, newClassName) {
      for (let columnIdx = 0; columnIdx < rowMeta.length; columnIdx++) {
        if (rowMeta[columnIdx].className === oldClassName) {
          this.hotInstance.setCellMeta(row, columnIdx, 'className', newClassName);
          await this.CellManager.handleCellEdit(row, columnIdx, this.hotInstance.getDataAtCell(row, columnIdx));
        }
      }
    }
  
    // Helper method for handling errors
    handleError(error, message) {
      console.error(`${message}:`, error);
    }
  }
  
  