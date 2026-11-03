"""Shared crisis appendix for each blank Word form and its local download."""
import json
from pathlib import Path
from docx.shared import Pt
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
MARKER='Local crisis routes: choose your borough on the website before downloading.'
def append_crisis_page(doc):
    data=json.loads((Path(__file__).resolve().parents[1]/'config/crisis-pathways.json').read_text())
    h=doc.add_paragraph('If someone needs urgent help','Heading 1')
    h.paragraph_format.page_break_before=True
    for title,key in [('Emergency now','emergency'),('Urgent mental health help','urgent')]:
        doc.add_paragraph(title,'Heading 2')
        doc.add_paragraph(data[key])
    doc.add_paragraph(data['staff'])
    p=doc.add_paragraph(MARKER)
    p.paragraph_format.space_before=Pt(8)
    p=doc.add_paragraph('Borough routes and current source links: ')
    field=OxmlElement('w:fldSimple');field.set(qn('w:instr'),' HYPERLINK "https://dtp.lxportal.space/#urgent" ')
    run=OxmlElement('w:r');t=OxmlElement('w:t');t.text='dtp.lxportal.space/#urgent';run.append(t);field.append(run);p._p.append(field)
    doc.add_paragraph('Check current opening and access details. This guide does not arrange referrals or replace the person’s crisis plan. Local source check '+data['checkedOn']+'.').paragraph_format.space_after=Pt(0)
