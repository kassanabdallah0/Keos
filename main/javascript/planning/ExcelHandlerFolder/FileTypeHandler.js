export default class FileTypeHandler {
    readData(data, fileType) {
        if (fileType === 'xml') {
            return this.readXmlData(data);
        } else {
            console.log("in readData")
            return this.readExcelData(new Uint8Array(data));
        }
    }

    readExcelData(data) {
        return XLSX.read(data, { type: 'array' });
    }

    readXmlData(data) {
        return XLSX.read(data, { type: 'buffer' });
    }

    async convertWorkbookToJson(workbook) {
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
            throw new Error("Workbook does not have any sheets.");
        }
        const worksheet = workbook.Sheets[firstSheetName];
        console.log("Done worksheet:",worksheet)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {range: "A1:BZ3000",Blankrows: false, raw: true, dateNF: "raw"});
        console.log("jsonData",jsonData)
        // Converting the JSON object into an array of arrays
        const headers = Object.keys(jsonData[0]);
        const data = jsonData.map(row => headers.map(header => row[header]));
        console.log("done convertWorkbookToJson");
        return [headers, ...data];
    }
}
