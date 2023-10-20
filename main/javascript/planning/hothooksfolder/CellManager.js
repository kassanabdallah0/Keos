
export default class CellManager {
    constructor(hotInstance, actions, URLs, columnNames, ajaxrequest, suggestionsHandler) {
      this.hotInstance = hotInstance;
      this.ajaxrequest = ajaxrequest;
      this.suggestionsHandler = suggestionsHandler;
      this.actions = actions;
      this.URLs = URLs;
      this.columnNames = columnNames;
    }
  
    async handleAlphanumericKeys(row, col, value) {
      if (value && Number.isInteger(row) && Number.isInteger(col)) {
        await this.handleNewRowAndValue(row, col, value);
      }
    }
  
    async handleNewRowAndValue(row, col, value) {
      let rowID = this.hotInstance.getDataAtCell(row, 2); // Assuming ID is in column 2
      if (!rowID) {
        await this.addNewRowBackend(row, 1);
        rowID = this.hotInstance.getDataAtCell(row, 2);
      }
      
      let rowDataArray = [...this.hotInstance.getDataAtRow(row)];
      rowDataArray[col] = value;
      let rowData = this.prepareRowData(row, rowDataArray);
      await this.suggestionsHandler.fetchSuggestions(row,rowID, rowData);
      
    }
  
    prepareRowData(row, rowDataArray) {
      const rowData = {};
      for (let i = 0; i < this.columnNames.length; i++) {
        const meta = this.hotInstance.getCellMeta(row, i);
        if (meta.className !== 'grey-text') {
          rowData[this.columnNames[i]] = rowDataArray[i];
        } else {
          rowData[this.columnNames[i]] = null;
        }
      }
      return rowData;
    }
  
    async addNewRowBackend(index, amount) {
      const data = {
        action: this.actions[2],
      };
      const response = await this.ajaxrequest.ajaxCall(this.URLs[2], data);
      if (response.status === 'success') {
        this.hotInstance.setDataAtCell(index, 2, response.newRowID);
        this.hotInstance.setDataAtCell(index, 1, response.UserID);
        this.hotInstance.setDataAtCell(index, 0, response.PlanningID);
      } else {
        console.error("Error:", response.message);
      }
    }
  
    async handleCellEdit(row, col, newValue) {
      const rowID = this.hotInstance.getDataAtCell(row, 2); // Assuming ID is in column 2
      if (!rowID) {
        await this.addNewRowBackend(row, 1);
      }
      const columnName = this.hotInstance.getColHeader(col);
      const cellData = {
        action: this.actions[1],
        row: rowID,
        column: columnName,
        value: newValue,
      };
      const response = await this.ajaxrequest.ajaxCall(this.URLs[1], cellData);
      if (response.status !== 'success') {
        console.error('Operation failed:', response.message);
      }
    }
  }
  