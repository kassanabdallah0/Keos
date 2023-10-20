export default class SuggestionsHandler {
    constructor(hotInstance, ajaxRequestInstance, fetchSuggestionsURL) {
      this.hotInstance = hotInstance;
      this.ajaxrequest = ajaxRequestInstance;
      this.debounceTimer = null;
      this.fetchSuggestionsURL = fetchSuggestionsURL;
    }
  
    async fetchSuggestions(rowIndex, rowID, rowData) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(async () => {
          try {
              const requestData = {
                  rowID: rowID,
                  rowData: rowData
              };
              const response = await this.ajaxrequest.ajaxCall(this.fetchSuggestionsURL, requestData);
              if (response && response.status === 'success') {
                  if (response.hasSuggestion) {
                      let rowDataArray = Object.values(rowData);
                      await this.applySuggestions(rowDataArray, rowIndex, response.suggestions);
                  } else {
                      console.log("No suggestions available.");
                  }
              } else if (response) {
                  console.error("Error fetching suggestions:", response.message);
              } else {
                  console.error("Empty response from server.");
              }
              } catch (error) {
                console.error('An error occurred:', error);
                if (error.responseText) {
                    console.error('Server responded with:', error.responseText);
                }
              } finally {
                  return 
              }
      }, 2500);
    }
    async applySuggestions(rowData, row, suggestions) {
      try {
        if (!this.validateRowNumber(row)) {
          return;
        }
        
        const rowMeta = this.hotInstance.getCellMetaAtRow(row);
        await this.updateRowWithSuggestions(row, rowData, rowMeta, suggestions);
      } catch (error) {
        this.handleError(error, "An error occurred in applySuggestions");
      }
    }
  
    validateRowNumber(row) {
      if (row < 0 || row >= this.hotInstance.countRows()) {
        console.error("Invalid row number:", row);
        return false;
      }
      return true;
    }
  
    async updateRowWithSuggestions(row, rowData, rowMeta, suggestions) {
      Object.keys(suggestions).forEach(async (column) => {
        const columnIdx = this.hotInstance.propToCol(column);
        if (!this.validateColumnIndex(columnIdx)) {
          return;
        }
        const value = suggestions[column];
        await this.updateCell(row, columnIdx, value, 'grey-text');
      });
    }
  
    validateColumnIndex(columnIdx) {
      if (columnIdx < 0 || columnIdx >= this.hotInstance.countCols()) {
        console.error("Invalid column index:", columnIdx);
        return false;
      }
      return true;
    }
    
    async updateCell(row, col, value, className) {
      this.hotInstance.setDataAtRowProp(row, col, value);
      this.hotInstance.setCellMeta(row, col, 'className', className);
    }
  }
  