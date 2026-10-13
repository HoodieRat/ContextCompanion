"""Synthetic text-bearing PDF/DOCX ingestion fixtures; standard library only."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.sax.saxutils import escape

root = Path(__file__).resolve().parent.parent / 'evidence/windows-fixtures/documents'
root.mkdir(parents=True, exist_ok=True)
docx_text = ('The document conversion calibration marker is CCFORMATDOCXamberbridge. '
             'This synthetic maintenance document describes the amber bridge inspection. '
             'Inspect its supports every forty days and retain source citations when quoting it.')
with ZipFile(root / 'maintenance.docx', 'w', ZIP_DEFLATED) as docx:
    docx.writestr('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
    docx.writestr('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
    docx.writestr('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>' + escape(docx_text) + '</w:t></w:r></w:p><w:sectPr/></w:body></w:document>')

lines = ['Synthetic PDF maintenance instructions.',
         'The conversion marker is CCFORMATPDFcobaltbridge.',
         'Inspect the cobalt bridge supports every forty days.',
         'Record the original document and preserve its source citation.',
         'This controlled test contains text and requires no OCR.']
stream = ('BT /F1 11 Tf 50 740 Td 16 TL ' + ' Tj T* '.join('(' + line + ')' for line in lines) + ' Tj ET').encode('ascii')
objects = [b'<< /Type /Catalog /Pages 2 0 R >>', b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
           b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
           b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
           b'<< /Length ' + str(len(stream)).encode() + b' >>\nstream\n' + stream + b'\nendstream']
pdf = bytearray(b'%PDF-1.4\n'); offsets = [0]
for index, content in enumerate(objects, 1):
    offsets.append(len(pdf)); pdf.extend(f'{index} 0 obj\n'.encode() + content + b'\nendobj\n')
xref = len(pdf); pdf.extend(f'xref\n0 {len(offsets)}\n0000000000 65535 f \n'.encode())
for offset in offsets[1:]: pdf.extend(f'{offset:010d} 00000 n \n'.encode())
pdf.extend(f'trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode())
(root / 'maintenance.pdf').write_bytes(pdf)
print('Created synthetic text-bearing PDF and DOCX fixtures.')
