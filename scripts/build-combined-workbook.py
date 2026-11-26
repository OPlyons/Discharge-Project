"""Combine the existing staff forms into one editable discharge document."""

from copy import deepcopy
from itertools import count
from pathlib import Path
import runpy

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets"
SECTIONS = [
    ("offer", "Offer_a_Call_v12.docx", "Offer a peer support call", "Ward staff"),
    ("handover", "Arrange_and_Hand_Over_v12.docx", "Arrange the call", "Lived Experience Coordinator"),
    ("person", "Person_Call_and_Feedback_v13.docx", "Call a person leaving hospital", "Peer support worker"),
    ("carer", "Carer_Call_and_Feedback_v12.docx", "Call a carer", "Peer support worker"),
]
CRISIS_HEADING = "If someone needs urgent help"


def text_of(element):
    return "".join(
        item.text or "" for item in element.iter(qn("w:t"))
    )


def bookmark(paragraph, name, number):
    start = OxmlElement("w:bookmarkStart")
    start.set(qn("w:id"), str(number))
    start.set(qn("w:name"), name)
    end = OxmlElement("w:bookmarkEnd")
    end.set(qn("w:id"), str(number))
    paragraph.append(start)
    paragraph.append(end)


def build():
    document = Document(ASSETS / SECTIONS[0][1])
    document._element.body.clear_content()
    section_style = deepcopy(document.styles["Heading 1"].element)
    section_style.set(qn("w:styleId"), "FormSection")
    section_style.find(qn("w:name")).set(qn("w:val"), "Form section")
    document.styles.element.append(section_style)
    # Keep the existing type sizes while nesting each form's original headings.
    for style_name, level in [("Heading 1", "1"), ("Heading 2", "2")]:
        document.styles[style_name].element.find(".//" + qn("w:outlineLvl")).set(qn("w:val"), level)

    document.add_paragraph("Discharge and transition form", "Title")
    document.add_paragraph("Peer support calls after hospital")
    document.add_paragraph(
        "Use this form from offering a call through to handover, the conversation and feedback. "
        "Type in the white boxes and tick the relevant answers."
    )
    document.add_paragraph(
        "Use a separate copy for each person or carer. Complete the offer and handover sections, "
        "then the relevant call section. Save the completed form in their agreed record."
    )
    document.add_paragraph("Area: [optional]   |   Team: [optional]")
    document.add_paragraph("Sections in this form", "Heading 2")
    for key, _, title, role in SECTIONS:
        paragraph = document.add_paragraph()
        link = OxmlElement("w:hyperlink")
        link.set(qn("w:anchor"), key)
        run = OxmlElement("w:r")
        properties = OxmlElement("w:rPr")
        properties.append(OxmlElement("w:u"))
        properties[-1].set(qn("w:val"), "single")
        run.append(properties)
        text = OxmlElement("w:t")
        text.text = title
        run.append(text)
        link.append(run)
        paragraph._p.append(link)
        paragraph.add_run("\n" + role).font.size = Pt(12)
    document.add_paragraph("Crisis guidance is at the end of this form.")

    control_ids = count(100)
    for index, (key, filename, title, _) in enumerate(SECTIONS, start=1):
        source = Document(ASSETS / filename)
        if key == "handover":
            # Keep the backup contact with the clinical and safeguarding contacts,
            # leaving room for the final handover instruction on the next page.
            continuation = next(p for p in source.paragraphs if p.text == "2 Give the help routes continued")
            identity = next(p for p in source.paragraphs if p.text == "Identity check and no answer plan")
            identity._p.addprevious(continuation._p)
        for original in source._element.body:
            text = text_of(original)
            if text == CRISIS_HEADING:
                break
            if original.tag == qn("w:sectPr") or text.startswith("Area: [optional]"):
                continue
            element = deepcopy(original)
            # These form bodies contain text and controls. Fail if a future edit
            # adds external parts that would need relationship remapping.
            if element.xpath(".//@r:id | .//@r:embed | .//@r:link"):
                raise ValueError(f"{filename} has body relationships that require merging")
            style = element.find(".//" + qn("w:pStyle"))
            if style is not None and style.get(qn("w:val")) == "Title":
                style.set(qn("w:val"), "FormSection")
                next(element.iter(qn("w:t"))).text = title
                page_break = OxmlElement("w:pageBreakBefore")
                element.find(qn("w:pPr")).append(page_break)
                bookmark(element, key, index)
            for text_node in element.iter(qn("w:t")):
                text_node.text = (text_node.text or "").replace("offer form", "offer section").replace(
                    "If the call cannot go ahead, go to section 4.",
                    "If the call cannot go ahead, use Record and save in this call section.",
                )
            for properties in element.iter(qn("w:sdtPr")):
                properties.find(qn("w:id")).set(qn("w:val"), str(next(control_ids)))
                tag = properties.find(qn("w:tag"))
                tag.set(qn("w:val"), key + "_" + tag.get(qn("w:val")))
            document._element.body.insert_element_before(element, "w:sectPr")

    crisis = runpy.run_path(str(ROOT / "scripts" / "crisis-forms.py"))
    crisis["append_crisis_page"](document)
    for paragraph in document.paragraphs:
        if paragraph.text == CRISIS_HEADING:
            paragraph.style = "Form section"
    document.core_properties.title = "Discharge and transition form"
    document.core_properties.subject = "Offer, handover, peer support calls and feedback"
    target = ASSETS / "Discharge_and_Transition_Form.docx"
    document.save(target)
    print(target)


if __name__ == "__main__":
    build()
