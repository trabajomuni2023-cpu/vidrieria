function escapeCsvValue(value: unknown) {
  const normalized = value == null ? '' : String(value);
  const escaped = normalized.replace(/"/g, '""');
  return `"${escaped}"`;
}

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

export function exportRowsToCsv(filename: string, headers: string[], rows: Array<Array<unknown>>) {
  const csv = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(',')),
  ].join('\n');

  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8;',
  });

  downloadBlob(blob, filename);
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
