import HandsontableColumnConfig from './HandsontableColumnConfig.js';
import DynamicDropdownUpdater from '../DropdownFolder/DynamicDropdownUpdater.js';
import ErrorHandler from  '../ErrorHandler.js';
import hooksinitialisation from './hooksinitialisation.js';
import ChangeColorHandler from '../changestylehot/ChangeColorHandler.js';

export default class HandsontableHandler {
    constructor(data, nestedHeaders,collapsibleColumns) {
        this.hotInstance = null;
        this.datajson = data;
        this.manuelHooks = true;
        this.nestedHeaders = [nestedHeaders[0][0], nestedHeaders[1]];
        this.collapsibleColumns = collapsibleColumns;
        if (this.datajson.role.Role == "CDP") {
        this.contextmenu =  ['row_above', 'row_below', 'remove_row', '---------', 'undo', 'redo', '---------', 'copy', 'cut', '---------', 'mergeCells', 'unmergeCells', '---------', 'commentsAddEdit'];
        }
        else {
            this.contextmenu =  ['undo', 'redo', '---------', 'copy', '---------', 'mergeCells', 'unmergeCells', '---------', 'commentsAddEdit'];
        }
        this.hotconfig = new HandsontableColumnConfig(this.datajson.optionsMap,this.datajson.columnstypes)
    }
    // ------ Initialization & Config Methods ------
    initialize(headers = []) {
        if (!this._isValidHeaders(headers)) {
            ErrorHandler.handleError("HandsontableHandler", "Invalid headers provided.", new Error());
            return;
        }
        const initialData = this.createEmptyDataArray(this.initialRows, headers.length);
        this._setupHandsontableInstance(initialData, headers);
    }
    _isValidHeaders(headers) {
        return Array.isArray(headers) && headers.length > 0;
    }
  // Method to setup Handsontable instance
  async _setupHandsontableInstance(initialData, headers) {
    const config = this.getHandsontableConfig(initialData, headers);
    try {
      this.hotInstance = new Handsontable($('#hot')[0], config);
      this.changeColorHandler = new ChangeColorHandler(this.hotInstance);
      this.hotInstance.addHook('afterLoadData', () => this.changeColorHandler.applyColor());
      this.hotInstance.addHook('afterChange', () => this.changeColorHandler.applyColor());
        } catch (error) {
      ErrorHandler.handleError("HandsontableHandler", "Failed to initialize Handsontable.", error);
      return;
    }
    // Now that the Handsontable instance is initialized, set up the dynamic dropdown updater
    new DynamicDropdownUpdater(this.hotInstance, this.datajson,this.changeColorHandler);
    let handsonhooksbackend = new hooksinitialisation(this.hotInstance, headers);
    let data = await handsonhooksbackend.afterLoadDataHandler();
    this.updateData(data);

  }
  //flatten the array of nesteheaders
  _flattenarray = function(arr) {
      return arr.reduce(function (flat, toFlatten) {
          return flat.concat(Array.isArray(toFlatten) ? flattenarray(toFlatten) : toFlatten);
      }, []);
  }
    updateHandsontable() {
        this.manuelHooks = false;
        this.hotInstance.updateSettings({
          nestedHeaders:  this.nestedHeaders,
          collapsibleColumns: this.collapsibleColumns,
          /*
          hiddenColumns: {
            columns: [0, 1, 2],
            indicators: true
          },
            */
        });
        this.manuelHooks = true;
      }
    getHandsontableConfig(data, headers) {
        if (!data || !headers) {
            throw new Error('Missing data or headers');
        }
        return {
            data: data,
            rowHeaders: true,
            colHeaders: headers,
            nestedHeaders:  this.nestedHeaders,
            collapsibleColumns: this.collapsibleColumns,
            stretchH: 'all',
            licenseKey: 'non-commercial-and-evaluation',
            dropdownMenu: {
                items: {
                    'filter_by_condition': {},
                    'filter_by_value': {},
                    'filter_action_bar': {},
                }
            },
            filters: true,
            contextMenu:this.contextmenu,
            comments: true,
            manualRowResize: true,
            manualColumnResize: true,
            manualRowMove: true,
            manualColumnMove: true,
            formulas: true,
            autoColumnSize: true,
            renderAllRows: false,
            autorowsize: true,
            search: true,
            height: 900,
            width : 'auto',
            mergeCells: true,
            columns: this.hotconfig.generateColumns(),
            /*
            hiddenColumns: {
                columns: [0, 1, 2],
                indicators: true
              }
                */
        };
    }
    // ------ Data Handling Methods ------
    loadData(data, append = false) {
        this.manuelHooks = false;
        if (!this.isInitialized()) {
            throw new Error('Cannot load data. Handsontable is not initialized.');
        }
        if (append) {
            // Get existing data
            const existingData = this.hotInstance.getSourceData();
            
            // Append new data
            const newData = existingData.concat(data);
    
            // Load combined data into Handsontable
            this.hotInstance.loadData(newData);
        } else {
            // Replace existing data
            this.hotInstance.loadData(data);
        }
        this.manuelHooks = true;
    }
    transformData(data) {
        // Transform an array of objects into an array of arrays
        if (this.isArrayofObjects(data)) {
            return data.map(obj => Object.values(obj));
        } else {
            console.warn("Can't transform data");
            return data;
        }
    }

    isArrayofObjects(data) {
        // Check if the data is an array of objects
        return Array.isArray(data) && data.every(item => typeof item === 'object' && !Array.isArray(item));
    }
    updateData(data) {
        if (data && data.length > 0) {
            this.loadData(this.transformData(data));
        } else {
           console.warn("No data to load");
        }
    }
    clearData() {
        if (this.isInitialized()) {
            this.hotInstance.loadData([]);
        } else {
            throw new Error('Hot instance not initialized');
        }
    }
    applyFilter(column, filterFunction) {
        this.manuelHooks = false;
        if (!this.isInitialized()) return;

        if (typeof filterFunction !== 'function') {
            ErrorHandler.handleError("HandsontableHandler", "Invalid filter function provided.");
            return;
        }

        const filtersPlugin = this.hotInstance.getPlugin('filters');
        if (!filtersPlugin) {
            ErrorHandler.handleError("HandsontableHandler", "Filters plugin is not available.");
            return;
        }

        filtersPlugin.addCondition(column, filterFunction);
        filtersPlugin.filter();
        this.manuelHooks = true;
    }
    getHeaders() {
        if (!this.isInitialized()) return [];
        return this.hotInstance.getColHeader();
    }
    createEmptyDataArray(rows, cols) {
        return Array(rows).fill().map(() => Array(cols).fill(''));
    }
    // ------ Utility Methods ------
    isInitialized(context = "HandsontableHandler") {
        if (!this.hotInstance) {
            ErrorHandler.handleError(context, "Handsontable instance is not initialized yet.");
            return false;
        }
        return true;
    }
    validateInput(input, context = "HandsontableHandler") {
        if (!input) {
            ErrorHandler.handleError(context, "Input is not defined.");
            return false;
        }
        return true;
    }

    validateHandsontableInstance(hotInstance, context = "HandsontableHandler") {
        if (!hotInstance) {
            ErrorHandler.handleError(context, "Handsontable instance is not defined.");
            return false;
        }
        return true;
    }

    validateHandsontableElement(hotElement, context = "HandsontableHandler") {
        if (!hotElement) {
            ErrorHandler.handleError(context, "Handsontable element is not defined.");
            return false;
        }
        return true;
    }

    hottable() {
        if (this.hotInstance) {
            return this.hotInstance;
        }

        if (!this.hotInstance) {
            this.hotInstance = this.hot(this.hotSettings);
        }

        return this.hotInstance;
    }
    // ------ Getters and Setters ------
    
    set handsontableInstance(instance) {
        if (this.hotInstance) {
            this.hotInstance.destroy();
        }
        this.hotInstance = instance;
    }

    get handsontableInstance() {
        return this.hotInstance;
    }
    manuelHooksflag(manuelHooks = true) {
        this.manuelHooks = manuelHooks;
    }
}

