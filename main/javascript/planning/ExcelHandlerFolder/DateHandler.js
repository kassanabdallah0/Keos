
export default class DateHandler {
    processDates(sheetData) {
        sheetData.forEach(row => {
            row.forEach((cell, index) => {
                if (this.isExcelDate(cell)) {
                    row[index] = this.convertExcelDate(cell);
                }
            });
        });
    }

    isExcelDate(value) {
        return typeof value === 'number' && value > 30000 && value < 50000;
    }

    convertExcelDate(excelDate) {
        const date = new Date(Math.round((excelDate - 25569) * 864e5));
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }
}