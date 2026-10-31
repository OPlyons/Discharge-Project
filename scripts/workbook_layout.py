from pathlib import Path
from copy import deepcopy
from itertools import count
from zipfile import ZipFile
from docx import Document
from docx.shared import Pt, Mm, RGBColor
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ROW_HEIGHT_RULE, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn, nsmap

FONT='Frutiger LT Com 45 Light'
BG='EDF2F3'
INK='172C38'
W14='http://schemas.microsoft.com/office/word/2010/wordml'
nsmap['w14']=W14
ids=count(100)
doc=Document()
sec=doc.sections[0]
sec.page_width=Mm(210)
sec.page_height=Mm(297)
sec.top_margin=Mm(17)
sec.bottom_margin=Mm(16)
sec.left_margin=Mm(15)
sec.right_margin=Mm(15)
sec.header_distance=Mm(7)
sec.footer_distance=Mm(7)

def font_properties(rpr, size=14, bold=False, color=INK, family=FONT):
    for child in list(rpr):
        if child.tag in [qn('w:'+n) for n in ['rFonts','sz','color','b']]:
            rpr.remove(child)
    fonts=OxmlElement('w:rFonts')
    for key in ('ascii','hAnsi','eastAsia','cs'):
        fonts.set(qn('w:'+key),family)
    rpr.append(fonts)
    sz=OxmlElement('w:sz');sz.set(qn('w:val'),str(round(size*2)));rpr.append(sz)
    col=OxmlElement('w:color');col.set(qn('w:val'),color);rpr.append(col)
    if bold:rpr.append(OxmlElement('w:b'))

normal=doc.styles['Normal']
normal.font.name=FONT
normal.font.size=Pt(14)
normal.font.color.rgb=RGBColor.from_string(INK)
normal.paragraph_format.line_spacing=1.12
normal.paragraph_format.space_after=Pt(5)
normal.paragraph_format.widow_control=True
font_properties(normal.element.get_or_add_rPr())
for name,sz,bold in [('Title',30,True),('Heading 1',24,True),('Heading 2',16,True)]:
    st=doc.styles[name]
    st.font.name=FONT
    st.font.size=Pt(sz)
    st.font.bold=bold
    st.font.color.rgb=RGBColor(0,0,0)
    font_properties(st.element.get_or_add_rPr(),sz,bold,'000000')
    st.paragraph_format.space_before=Pt(10 if name!='Title' else 0)
    st.paragraph_format.space_after=Pt(7)
    st.paragraph_format.keep_with_next=True

answer_style=doc.styles.add_style('Answer',1)
answer_style.base_style=normal
answer_style.font.name=FONT
answer_style.font.size=Pt(14)
answer_style.paragraph_format.space_before=Pt(0)
answer_style.paragraph_format.space_after=Pt(0)
answer_style.paragraph_format.keep_with_next=False
answer_style.paragraph_format.keep_together=False
answer_style.paragraph_format.widow_control=False
answer_style.paragraph_format.line_spacing=1.12

# Word displays the same quiet page colour behind each expanding answer box.
background=OxmlElement('w:background')
background.set(qn('w:color'),BG)
doc.element.insert(0,background)
show=OxmlElement('w:displayBackgroundShape')
doc.settings.element.append(show)

head=sec.header.paragraphs[0]
head.paragraph_format.space_after=Pt(0)
r=head.add_run('CNWL  |  Lived Experience Workforce')
r.font.name=FONT;r.font.size=Pt(11);r.font.color.rgb=RGBColor.from_string('314C59')

footer=sec.footer.paragraphs[0]
footer.paragraph_format.space_after=Pt(0)
doc.styles['Footer'].paragraph_format.tab_stops.clear_all()
footer.paragraph_format.tab_stops.clear_all()
footer.paragraph_format.tab_stops.add_tab_stop(Mm(180), WD_ALIGN_PARAGRAPH.RIGHT)
r=footer.add_run('Discharge Project')
r.font.size=Pt(10)
footer.add_run('\tPage ')
for instr,last in [('PAGE',' of '),('NUMPAGES','')]:
    f=OxmlElement('w:fldSimple');f.set(qn('w:instr'),instr)
    rr=OxmlElement('w:r');rpr=OxmlElement('w:rPr');font_properties(rpr,10);rr.append(rpr)
    tt=OxmlElement('w:t');tt.text='1';rr.append(tt);f.append(rr)
    footer._p.append(f)
    footer.add_run(last)
for r in footer.runs:
    r.font.name=FONT;r.font.size=Pt(10)

def para(text='',style=None,size=None,bold=False,after=None,before=None,keep=False):
    p=doc.add_paragraph(style=style)
    r=p.add_run(text)
    if size:r.font.size=Pt(size)
    if bold:r.bold=True
    if after is not None:p.paragraph_format.space_after=Pt(after)
    if before is not None:p.paragraph_format.space_before=Pt(before)
    if keep:p.paragraph_format.keep_with_next=True
    return p

def checkbox(paragraph,tag,label):
    sdt=OxmlElement('w:sdt')
    props=OxmlElement('w:sdtPr')
    ident=OxmlElement('w:id');ident.set(qn('w:val'),str(next(ids)));props.append(ident)
    alias=OxmlElement('w:alias');alias.set(qn('w:val'),label);props.append(alias)
    tg=OxmlElement('w:tag');tg.set(qn('w:val'),tag);props.append(tg)
    cb=OxmlElement('w14:checkbox')
    checked=OxmlElement('w14:checked');checked.set(qn('w14:val'),'0');cb.append(checked)
    for elem,val in [('checkedState','2611'),('uncheckedState','2610')]:
        st=OxmlElement('w14:'+elem);st.set(qn('w14:val'),val);st.set(qn('w14:font'),'DejaVu Sans');cb.append(st)
    props.append(cb);sdt.append(props)
    content=OxmlElement('w:sdtContent');run=OxmlElement('w:r');rpr=OxmlElement('w:rPr')
    font_properties(rpr,14,family='DejaVu Sans')
    shade=OxmlElement('w:shd');shade.set(qn('w:fill'),'FFFFFF');rpr.append(shade)
    run.append(rpr);t=OxmlElement('w:t');t.text='☐';run.append(t);content.append(run);sdt.append(content)
    paragraph._p.append(sdt)
    paragraph.add_run(' '+label+'     ')

def choices(label,tag,options=('Yes','No','Not sure')):
    para(label,'Heading 2',after=5)
    p=para(after=7)
    for i,opt in enumerate(options):checkbox(p,f'{tag}_{i}',opt)

def cell_box(cell,tag,label,height):
    cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.TOP
    tcPr=cell._tc.get_or_add_tcPr()
    sh=OxmlElement('w:shd');sh.set(qn('w:fill'),'FFFFFF');tcPr.append(sh)
    borders=OxmlElement('w:tcBorders')
    for edge in ['top','left','bottom','right']:
        e=OxmlElement('w:'+edge);e.set(qn('w:val'),'single');e.set(qn('w:sz'),'6');e.set(qn('w:color'),'71838D');borders.append(e)
    tcPr.append(borders)
    margins=OxmlElement('w:tcMar')
    for side in ['top','bottom','left','right']:
        el=OxmlElement('w:'+side);el.set(qn('w:w'),'115');el.set(qn('w:type'),'dxa');margins.append(el)
    tcPr.append(margins)
    p=cell.paragraphs[0]
    p.style=answer_style
    run=p.add_run(' ')
    run.font.name=FONT;run.font.size=Pt(14)
    run._r.get_or_add_rPr()
    sdt=OxmlElement('w:sdt');props=OxmlElement('w:sdtPr')
    alias=OxmlElement('w:alias');alias.set(qn('w:val'),label);props.append(alias)
    tg=OxmlElement('w:tag');tg.set(qn('w:val'),tag);props.append(tg)
    ident=OxmlElement('w:id');ident.set(qn('w:val'),str(next(ids)));props.append(ident)
    tx=OxmlElement('w:text');tx.set(qn('w:multiLine'),'1');props.append(tx)
    sdt.append(props)
    content=OxmlElement('w:sdtContent');content.append(p._p);sdt.append(content)
    cell._tc.append(sdt)
    row=cell._tc.getparent()
    trPr=row.find(qn('w:trPr'))
    if trPr is None:trPr=OxmlElement('w:trPr');row.insert(0,trPr)
    ht=trPr.find(qn('w:trHeight'))
    if ht is None:ht=OxmlElement('w:trHeight');trPr.append(ht)
    ht.set(qn('w:val'),str(round(height*20)));ht.set(qn('w:hRule'),'atLeast')
    for cant in trPr.findall(qn('w:cantSplit')):trPr.remove(cant)

def gap(points=3):
    p=doc.add_paragraph();p.paragraph_format.space_after=Pt(0);p.paragraph_format.space_before=Pt(0)
    p.paragraph_format.line_spacing=Pt(points)
    p.add_run('').font.size=Pt(1)

def answer(label,tag,height=78):
    para(label,'Heading 2',after=6)
    table=doc.add_table(rows=1,cols=1)
    table.alignment=WD_TABLE_ALIGNMENT.LEFT
    table.autofit=False;table.columns[0].width=Mm(180)
    cell_box(table.cell(0,0),tag,label,height)
    gap(3)
    return table



def metadata(items):
    table=doc.add_table(rows=2,cols=len(items))
    table.autofit=False
    for col in table.columns: col.width=Mm(180/len(items))
    for i,(label,tag) in enumerate(items):
        p=table.cell(0,i).paragraphs[0]
        p.paragraph_format.space_after=Pt(3)
        p.paragraph_format.keep_with_next=True
        p.add_run(label).font.size=Pt(13)
        cell_box(table.cell(1,i),tag,label,28)
    gap(3)

def heading(text,new_page=False):
    p=para(text,'Heading 1',after=7)
    p.paragraph_format.page_break_before=new_page
    return p

def opening(title,role):
    para(title,'Title',after=6)
    para(role+' · Type in the white boxes and tick one answer.',size=13.5,after=5)
    para('Area: [optional]   |   Team: [optional]',size=12,after=8)

def save(dest,title):
    doc.core_properties.title=title
    doc.core_properties.subject='Staff call form with expanding answer boxes'
    doc.core_properties.author='CNWL Lived Experience Workforce'
    for st in doc.styles:
        for border in list(st.element.iter(qn('w:pBdr'))): border.getparent().remove(border)
    for border in list(doc.element.iter(qn('w:pBdr'))): border.getparent().remove(border)
    doc.save(dest)
    with ZipFile(dest) as z:
        assert not any(n.startswith('word/fonts/') for n in z.namelist())
        xml=z.read('word/document.xml').decode()
        assert 'w:hRule="exact"' not in xml
        assert '<w:cantSplit' not in xml
    print(dest)
