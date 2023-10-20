
export default class HeadersHandler {
    constructor(hotHandler) {
        this.hotHandler = hotHandler;
    }

    handleHeaders(sheetData) {
        const excelHeaders = sheetData[0].map(header => header.toString().trim().toLowerCase());

        if (this.areHeadersMatching(excelHeaders)) {
            return sheetData.slice(1);
        } else {
            return this.mapHeadersAndReorder(sheetData, excelHeaders);
        }
    }

    areHeadersMatching(excelHeaders) {
        const hotHeaders = this._getNormalizedHotHeaders();
        return JSON.stringify(excelHeaders) === JSON.stringify(hotHeaders);
    }

    _getNormalizedHotHeaders() {
        return this.hotHandler.getHeaders().map(header => header.toString().trim().toLowerCase());
    }

    mapHeadersAndReorder(data, excelHeaders) {
        const hotHeaders = this._getNormalizedHotHeaders();

        return data.slice(1).map(row => {
            return hotHeaders.map(hotHeader => {
                const index = excelHeaders.indexOf(hotHeader);
                return index !== -1 ? row[index] : '';
            });
        });
    }
}