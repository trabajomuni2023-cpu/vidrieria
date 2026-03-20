import * as XLSX from 'xlsx';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildAutoWidths(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    return [];
  }

  const keys = Object.keys(rows[0]);

  return keys.map((key) => {
    const maxLength = rows.reduce((length, row) => {
      const value = row[key];
      return Math.max(length, String(value ?? '').length);
    }, key.length);

    return { wch: Math.min(Math.max(maxLength + 2, 12), 40) };
  });
}

export function exportRowsToExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: Array<Array<unknown>>,
) {
  const normalizedRows = rows.map((row) =>
    headers.reduce<Record<string, unknown>>((record, header, index) => {
      record[header] = row[index] ?? '';
      return record;
    }, {}),
  );

  const worksheet = XLSX.utils.json_to_sheet(normalizedRows);
  worksheet['!cols'] = buildAutoWidths(normalizedRows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  downloadBlob(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function exportSheetsToExcel(
  filename: string,
  sheets: Array<{
    sheetName: string;
    headers: string[];
    rows: Array<Array<unknown>>;
  }>,
) {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const normalizedRows = sheet.rows.map((row) =>
      sheet.headers.reduce<Record<string, unknown>>((record, header, index) => {
        record[header] = row[index] ?? '';
        return record;
      }, {}),
    );

    const worksheet = XLSX.utils.json_to_sheet(normalizedRows);
    worksheet['!cols'] = buildAutoWidths(normalizedRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.sheetName);
  }

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  downloadBlob(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function printHtmlAsPdf(title: string, html: string) {
  const printWindow = window.open('', '_blank', 'width=1024,height=768');

  if (!printWindow) {
    throw new Error('No se pudo abrir la ventana de impresion.');
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 24px;
            color: #111827;
          }
          h1, h2 {
            margin: 0 0 12px;
          }
          h1 {
            font-size: 24px;
          }
          h2 {
            font-size: 18px;
            margin-top: 24px;
          }
          p {
            margin: 4px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          th, td {
            border: 1px solid #d1d5db;
            padding: 8px;
            font-size: 12px;
            text-align: left;
          }
          th {
            background: #f3f4f6;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-top: 16px;
          }
          .card {
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 12px;
          }
          .muted {
            color: #6b7280;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
