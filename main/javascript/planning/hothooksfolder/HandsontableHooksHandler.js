
import ajaxrequest from './ajaxrequest.js';
import SuggestionsHandler from './SuggestionsHandler.js';
import UIManager from './UIManager.js';
import CellManager from './CellManager.js';

// Constants for special columns
const SPECIAL_COLUMNS = [0, 1, 2];

const urls = ['http://planningfix.keos-telecom.com/PHPPlanning/loadDatainit.php','http://planningfix.keos-telecom.com/PHPPlanning/updateRow.php','http://planningfix.keos-telecom.com/PHPPlanning/addRow.php','http://planningfix.keos-telecom.com/PHPPlanning/removeRow.php','http://planningfix.keos-telecom.com/PHPPlanning/suggestion.php'];

const actions = ['loadInitialData','updateRow','addNewRow','removeRow','fetchSuggestions'];

export default class HandsontableHooksHandler {
  constructor(hotInstance, headers) {
    this.actions = actions;
    this.hotInstance = hotInstance;
    this.isAddRow = false;
    this.preventconflict = true;
    this.debounceTimer = null;
    this.columnNames = headers;
    this.URLS = urls;
    this.ajaxrequest = new ajaxrequest();
    this.suggestionsHandler = new SuggestionsHandler(this.hotInstance, this.ajaxrequest, this.URLS[4]);
    this.cellManager = new CellManager(this.hotInstance, this.actions, this.URLS, this.columnNames, this.ajaxrequest, this.suggestionsHandler);
    this.uiManager = new UIManager(this.hotInstance, this.suggestionsHandler, this.cellManager);
  }
  
  // Helper method to check if a value is empty
  isEmpty(value) {
    return value === null || value === "" || value === undefined;
  }
  async fetchSuggestions(rowIndex, rowID, rowData) {
    await this.suggestionsHandler.fetchSuggestions(rowIndex, rowID, rowData);
  }

  async afterLoadDataHandler() {
    try {
        const response = await this.makeAjaxCallForLoadData();
        return this.processResponse(response);
    } catch (error) {
        this.logError("Error in afterLoadDataHandler", error);
        return null;
    }
}

  async makeAjaxCallForLoadData() {
      const data = { 
        action: this.actions[0]
      };
      return await this.ajaxrequest.ajaxCall(this.URLS[0], data);
  }

  processResponse(response) {
      if (!response) {
          this.logError("Null response from the server.", null);
          return null;
      }

      if (response.status === 'success') {
          return this.transformData(response.data);
      }

      this.logError(`Invalid response status from the server: ${response.status}`, response.message);
      return null;
  }

  transformData(data) {
      if (Array.isArray(data)) {
          return data;
      }
      return data.map(obj => Object.values(obj));
  }

  logError(message, error) {
      console.error(message, error);
      if (error && error.responseText) {
          console.error("Server Response Text:", error.responseText);
      }
  }
  
  async beforeKeyDownHandler(event) {
    try {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
  
      this.debounceTimer = setTimeout(async () => {
  
        const selected = this.hotInstance.getSelected();
        
        if (selected && Array.isArray(selected) && selected.length > 0) {
          const [row, col] = selected[0];
          
          const isTabKey = this.isTabKey(event);
  
          // Handle Tab key regardless of the column
          if (isTabKey) {
            this.handleTabKey(row, col);
          }
  
          // If the selected column is not 3 and it's not a Tab key, we're done here.
          if (col !== 3) {
            return;
          }
  
          const isAlphanumeric = this.isAlphanumericKey(event);
  
          // If the key is neither alphanumeric nor Tab, return early
          if (!isAlphanumeric && !isTabKey) return;
  
          const activeEditor = this.hotInstance.getActiveEditor();
          if (activeEditor && activeEditor.isOpened()) {
            const value = activeEditor.TEXTAREA?.value || "";  // Safeguard for TEXTAREA.value
  
            if (isAlphanumeric) {
              this.handleAlphanumericKeys(row, col, value);
            }
          }
  
        } else {
          console.log("No cell selected.");
        }
  
      }, 300);
    } catch (error) {
      this.handleError(error, "An error occurred in beforeKeyDownHandler");
    }
  }
  isAlphanumericKey(event) {
      return event.keyCode >= 48 && event.keyCode <= 90;
    }
    
  isTabKey(event) {
      return event.keyCode === 9;
    }
    
  async handleAlphanumericKeys(row, col, value) {
    await this.cellManager.handleAlphanumericKeys(row, col, value);
    }
    
  handleTabKey(row, col) {
      if (Number.isInteger(row) && Number.isInteger(col)) {
        this.confirmSuggestions(row);
      }
    }
    
  handleError(error, message) {
      console.error(`${message}:`, error);
    }

  async handleNewRowAndValue(row, col, value) {
    await this.cellManager.handleNewRowAndValue(row, col, value);
  }

  prepareRowData(row, rowDataArray) {
    return this.cellManager.prepareRowData(row, rowDataArray);
  }
  // Function to handle individual cell edits
  async handleCellEdit(row, col, newValue) {
    await this.cellManager.handleCellEdit(row, col, newValue);
  }

  // Handler for 'afterChange' hook
  async afterChangeHandler(changes, source) {
    if (source === 'edit') {
      for (const [row, col, oldValue, newValue] of changes) {
        if (oldValue !== newValue && !this.isEmpty(newValue) && !SPECIAL_COLUMNS.includes(col)) {
          await this.handleCellEdit(row, col, newValue);
        }
        
      }
    }
  }

  // Handler for 'afterCreateRow' hook
  async afterCreateRowHandler(index, amount, source) {
    this.preventconflict = false;
    await this.addNewRowBackend(index, 1);
  }
  // Handler for 'afterRemoveRow' hook
  beforeRemoveRowHandler(index, amount) {

    // Check if the row was added programmatically
    this.removeRowBackend(index, 1);

  }

  // Function to update backend
  async updateBackend(row, column, value) {
    let cellData;  // Declare cellData here
    let response;  // Declare response here
    try {

      const columnName = this.hotInstance.getColHeader(column);
      const rowID = this.hotInstance.getDataAtCell(row, 2);
        cellData = {
          action: this.actions[1],
          row: rowID,
          column: columnName,
          value: value
      };
      try {
        response = await this.ajaxrequest.ajaxCall(this.URLS[1], cellData);
        
        if (response.status === 'success') {
        } else {
          console.error('Operation failed:', response.message);
        }
      } catch (error) {
        console.error("Error in AJAX call:", error, error.responseText);
        return;
      }
    } catch (error) {
      console.error('An error occurred:', error);
      console.error("Error details:", error.message, error.stack);
    } finally {
      this.preventconflict = true;
    }
  }
  
  // Function to add new row
  async addNewRowBackend(index, amount) {
    await this.cellManager.addNewRowBackend(index, amount);
  }
    
  // Function to remove row
  async removeRowBackend(index, amount) {
    try {
      if (!this.isValidIndexAndAmount(index, amount)) {
        return;
      }

      const { rowID, planningID, userID } = this.extractCriticalData(index);

      if (!this.isValidCriticalData(rowID, planningID, userID)) {
        return;
      }

      const data = {
        action: this.actions[3],
        row: rowID,
        planningID: planningID,
        userID: userID
      };

      const response = await this.ajaxrequest.ajaxCall(this.URLS[3], data);

      this.handleResponse(response);
      
    } catch (error) {
      console.error('An unexpected error occurred:', error);
    }
  }

  isValidIndexAndAmount(index, amount) {
    if (typeof index !== 'number' || index < 0 || typeof amount !== 'number' || amount <= 0) {
      console.error("Invalid index or amount value");
      return false;
    }
    return true;
  }

  extractCriticalData(index) {
    const rowID = this.hotInstance.getDataAtCell(index, 2);
    const planningID = this.hotInstance.getDataAtCell(index, 0);
    const userID = this.hotInstance.getDataAtCell(index, 1);
    return { rowID, planningID, userID };
  }
  isValidCriticalData(rowID, planningID, userID) {
    if (rowID === null || planningID === null || userID === null) {
      console.error("Critical data is missing. Cannot proceed.");
      return false;
    }
    return true;
  }
  handleResponse(response) {
    if (response && response.status === 'success') {
      return 
    } else {
      console.error("Error:", response ? response.message : "No response from server");
    }
  }
  // Function to confirm suggestions
  confirmSuggestions(row) {
    this.uiManager.confirmSuggestions(row);
  }
}
