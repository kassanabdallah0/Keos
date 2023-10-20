const FILE_TYPES = ['csv', 'xlsx', 'xml'];

import FileTypeHandler from './FileTypeHandler.js';
import HeadersHandler from './HeadersHandler.js';
import DateHandler from './DateHandler.js';
import ErrorHandler from  '../../ErrorHandler.js';

export default class ExcelImporter {
    constructor(hotHandler) {
        this.hotHandler = hotHandler;
        this.fileTypeHandler = new FileTypeHandler();
        this.headersHandler = new HeadersHandler(hotHandler);
        this.dateHandler = new DateHandler();
    }

    async handleFileUpload(inputElement) {
        try {
            // Check if there's a file to process
            if (!inputElement.files.length) {
                ErrorHandler.handleError("ExcelImporter", "No file selected.", new Error("No file selected."));
                return;
            }
    
            const file = inputElement.files[0];
            const fileType = file.name.split('.').pop().toLowerCase();
    
            // Validate file type
            if (!FILE_TYPES.includes(fileType)) {
                ErrorHandler.handleError("ExcelImporter", "Unsupported file type. Please upload a .csv, .xlsx, or .xml file.", new Error(`Unsupported file type: ${fileType}`));
                return;
            }
    
            // Read the file
            const fileData = await this._readFile(file);
    
            // Process the file data
            await this.processFileData(fileData, fileType);
        } catch (error) {
            ErrorHandler.handleError("ExcelImporter", "Error processing the file", error);
        }
    }

    async _readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = error => reject(new Error(`File reading error: ${error.message}`));
            reader.readAsArrayBuffer(file);
            console.log("reader done")
        }).catch(e => {
            console.error(`File reading error: ${e.message}`);
            return new ArrayBuffer(0);
        });
    }

    async processFileData(data, fileType) {
        try {
            const result = this._extractResult(data);
            this._validateHandsontableInstance();
            const workbook = await this.fileTypeHandler.readData(result, fileType);
            let sheetData = await this.fileTypeHandler.convertWorkbookToJson(workbook);
            if (!sheetData || sheetData.length === 0) {
                throw new Error("No data found in the Excel sheet.");
            }
            sheetData = await this.headersHandler.handleHeaders(sheetData);
            sheetData = await this.addimportedDataBackend(sheetData);
            this.dateHandler.processDates(sheetData);
            this.appendAfterLastNonEmptyRow(sheetData);
        } catch (error) {
            ErrorHandler.handleError("ExcelImporter", "Error processing the file", error);
        }
    }
    appendAfterLastNonEmptyRow(sheetData) {
        const existingData = this.hotHandler.hotInstance.getData();
        const newData = existingData.slice(0, this.hotHandler.hotInstance.countRows()).concat(sheetData);
        this.hotHandler.loadData(newData);
        this.hotHandler.updateHandsontable();
    }
    _extractResult(data) {
        if (!data) {
            throw new Error("Data is undefined or null.");
        }
        if (data.target) {
            data = data.target;
        }
        if (data.result) {
            data = data.result;
        }
        return data;
    }
    
    _validateHandsontableInstance() {
        if (!this.hotHandler) {
            throw new Error("Handsontable handler is not initialized.");
        }
        if (!this.hotHandler.handsontableInstance) {
            throw new Error("Handsontable instance is not initialized.");
        }
    }
    async addimportedDataBackend(sheetData) {
        const data = {
            sheetData: sheetData,
            action: 'importData'
        };
    
        try {
            const response = await this._sendDataToBackend(data);
            
            if (response.status === 'success') {
                return this._updateSheetDataWithResponse(sheetData, response.data.newRowsInfo);
            } else {
                console.error("Error:", response.message);
            }
        } catch (error) {
            this._logError(error);
        }
    
        return sheetData;  // Return original data if any issues arise
    }
    
    _sendDataToBackend(data) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: 'http://planningfix.keos-telecom.com/PHPPlanning/addimportedDataBackend.php',
                type: 'POST',
                data: JSON.stringify(data),
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                success: function(response) {
                    resolve(response);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.error('AJAX Error:', textStatus);
                    console.error('Thrown Exception:', errorThrown);
                    if (jqXHR.responseText) {
                        console.error('Server Response:', jqXHR.responseText);
                    }
                    reject(jqXHR);
                }
            });
        });
    }
    
    _updateSheetDataWithResponse(sheetData, newRowsInfo) {
        for (let i = 0; i < newRowsInfo.length; i++) {
            const info = newRowsInfo[i];
            sheetData[i][2] = info.rowID;
            sheetData[i][1] = info.userID;
            sheetData[i][0] = info.planningID;
        }
        return sheetData;
    }
    
    _logError(error) {
        console.error('An error occurred:', error);
        if (error.responseText) {
            console.error('Server responded with:', error.responseText);
        }
    }
}