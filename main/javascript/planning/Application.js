console.log(2)
import HandsontableHandler from './hothandlerFolder/HandsontableHandler.js';
import ExcelImporter from './ExcelHandlerFolder/ExcelImporter.js';
console.log(3)
import ErrorHandler from  './ErrorHandler.js';
import FindandReplace from "./FindAndReplaceFolder/FindAndReplace.js";
console.log(4)

export default class Application {
    
    constructor() {
        this.hotHandler = "";
        this.findAndReplace = null;
    }
    async ajaxcall () {
        const response = await new Promise((resolve, reject) => {
            $.ajax({ 
                url: 'http://planningfix.keos-telecom.com/PHPPlanning/loadJson_data.php',
                type: 'POST',
                dataType: 'json',  // Explicitly expecting JSON here
                data: { action: 'fetch_data' },
                success: (data) => {
                    if (data.status === 'error' && data.message === 'Unauthorized access') {
                        window.location.href = 'http://planningfix.keos-telecom.com/LoginPage.html';
                        reject(new Error('Unauthorized access'));
                    } else { 
                        resolve(data);
                    }
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    console.error("AJAX Request Failed:", {
                        jqXHR: jqXHR,
                        textStatus: textStatus,
                        errorThrown: errorThrown
                    });
                    reject(new Error(`AJAX Error: ${textStatus}; Status Code: ${jqXHR.status}; Error Thrown: ${errorThrown}`));
                }
            });
        });
        response.Json_Data = JSON.parse(response.Json_Data);
        return response;  
    }
    async initialize() {
        try {
            const response = await this.ajaxcall();
    
            if (!response || response.status !== 'success') {
                throw new Error("Error fetching data from the database");
            }
    
            const { Json_Data, role } = response;
            const {
                Dynamic,
                columnDefinitionType,
                Options_Map,
                NestedHeaders,
                collapsibleColumns,
                PlanningHeaders
            } = Json_Data;
            
            const commonData = {
                TPmap: { Type_TP: Dynamic["Type TP"] },
                admap: { Nom_de_l_admin: Dynamic["Nom de l admin"] },
                columnstypes: columnDefinitionType,
                intmap: { Intervenant_Terrain: Dynamic["Intervenant Terrain"] },
                optionsMap: { OPTIONS_MAP_Stringheader: Options_Map },
                typomap: { Typologie: Dynamic["Typologie"] },
                role: { Role: role }
            };
    
            let data = {};
            if (role === "CDP") {
                data = {
                    ...commonData,
                    causemap: { Causes_Echecs: Dynamic["Causes Echecs"] }
                };
            } else {
                data = {
                    ...commonData,
                    causemap: { Causes_Echecs: Dynamic["Causes Echecs"] },
                    causemepmap: { Causes_Echecs_MEP: Dynamic["Causes Echecs (MEP)"] }
                };
            }
            const nestedHeaders = NestedHeaders;
            this.hotHandler = new HandsontableHandler(data, nestedHeaders, collapsibleColumns);
    
            await this._initializeHotHandler(this.hotHandler, PlanningHeaders);
            await this._setupFileUploadListener(new ExcelImporter(this.hotHandler), role);
    
            this.findAndReplace = new FindandReplace(this.hotHandler); // Assuming this returns the main Handsontable instance
            this._initializeReplacePreviewModalButtons();
    
        } catch (error) {
            ErrorHandler.handleError("Application", "Error in Application initialization", error);
        }
    }    

    _initializeReplacePreviewModalButtons() {
        $('#searchButton').on('click', () => {
            const searchValue = $('#searchBar').val();
            this.findAndReplace.search(searchValue); // Search in the main Handsontable
        });
    
        $('#nextButton').on('click', () => {
            this.findAndReplace.getNext();
        });
        $('#previousButton').on('click', () => {
            this.findAndReplace.getPrevious();
        });
    
        $('#replaceAllButton').on('click', () => {
            const newValue = $('#replaceBar').val();
            this.replacePreview(newValue, (findAndReplaceInstance, value) => {
                findAndReplaceInstance.replaceAll(value);
            });
        });
        $('#replaceSelectedButton').on('click', () => {
            const newValue = $('#replaceBar').val();
            this.replacePreview(newValue, (findAndReplaceInstance, value) => {
                findAndReplaceInstance.replaceSelected(value);
            });
        });
        }
        replacePreview(newValue, callback) {
            if (!this.findAndReplace) {
                return;
            }
        
            if (!newValue) {
                return;
            }
        
            if (this.findAndReplace.foundMatches.length === 0) { 
                return;
            }
        
            if (!confirm("Are you sure you want to replace the selected values?")) { 
                return;
            }
        
            const cursorPosition = this.findAndReplace.selectedIndex;
            callback(this.findAndReplace, newValue);
            this.findAndReplace.search($('#searchBar').val());
            this.findAndReplace.selectedIndex = cursorPosition;
        }
        applyReplacements() {
            if (confirm("Are you sure you want to apply the changes?")) { // Confirmation alert
                // Apply the changes based on the previewed replacements
                // You may need to customize this part depending on your logic
                this.findAndReplace.applyPreviewedReplacements();
        
                // Refresh the Handsontable display if needed
                this.hotHandler.hotInstance.render();
            }
        }
    async _initializeHotHandler(hotHandler, header) {
        // Initialize with header data
        hotHandler.initialize(header);
    }

    async _setupFileUploadListener(excelImporter, role) {
        console.log(role);
        if (role == "CDP") {
        $('#upload').on('change', async function() {
            try {
                await excelImporter.handleFileUpload(this);
                $(this).val(''); // Clear the file input
            } catch (error) {
                ErrorHandler.handleError("ExcelImporter", "Error processing the file", error);
            }
        });
        }
        else {
            console.warn("You are not allowed to upload the file");
        }
    }
}
