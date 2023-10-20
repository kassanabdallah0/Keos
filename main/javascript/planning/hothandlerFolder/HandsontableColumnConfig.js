export default class HandsontableColumnConfig {
    constructor(optionMap, columnstypes) {
        this.optionsMap = optionMap;
        this.columnDefinitions = columnstypes;
    }

    columnDefinitionsfct(columnDefinitions) {
        return columnDefinitions.map(columnDef => {
            if (columnDef.type) {
                return this._getColumnTypeConfig(columnDef.type);
            } else if (columnDef.key) {
                return this._getDropdownConfig(columnDef.key);
            }
        });
    }

    generateColumns() {
        return this.columnDefinitionsfct(this.columnDefinitions);
    }

    _getColumnTypeConfig(type) {
        switch (type) {
            case "date": return this._getDateConfig();
            case "numeric": return { type: 'numeric' };
            case "checkbox": return { type: 'checkbox' };
            case "empty": return {};
            default: throw new Error(`Unsupported column type: ${type}`);
        }
    }

    _getDateConfig() {
        return {
            type: 'date',
            dateFormat: 'DD/MM/YYYY',
            correctFormat: true,
            defaultDate: '01/01/1900'
        };
    }

    _getDropdownConfig(key) {
        const data = this.optionsMap.OPTIONS_MAP_Stringheader[key];
        if (!data) {
            throw new Error(`Missing options for key: ${key}`);
        }
        return this._getDropdownConfigFromArray(data);
    }

    _getDropdownConfigFromArray(datainarray) {
        return {
            type: 'dropdown',
            source: datainarray
        };
    }
}