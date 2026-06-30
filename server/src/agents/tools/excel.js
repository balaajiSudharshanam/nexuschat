const ExcelJS = require('exceljs');

async function run({ sheetName = 'Sheet1', headers = [], rows = [] }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  if (headers.length) ws.addRow(headers);
  for (const row of rows) ws.addRow(row);
  return wb.xlsx.writeBuffer();
}

module.exports = { id: 'excel', description: 'Create an Excel workbook with a sheet, headers, and rows', run };
