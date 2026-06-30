const PDFDocument = require('pdfkit');

async function run({ title = '', content = '' }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    if (title) doc.fontSize(18).text(title, { underline: true }).moveDown();
    doc.fontSize(12).text(content);
    doc.end();
  });
}

module.exports = { id: 'pdfMaker', description: 'Generate a PDF from a title and content string', run };
