"""Build the compact Harrow working draft based on Stuart's 26 November form.

This is a local pilot version, separate from the general combined form.
The attempt limit and coordinator closure process remain proposals for agreement.
"""
from itertools import count
import json
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn, nsmap
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "public/assets/Harrow_Peer_Support_Follow_Up_Form_Working_Draft.docx"
CRISIS = json.loads((ROOT / "config/crisis-pathways.json").read_text())
W14 = "http://schemas.microsoft.com/office/word/2010/wordml"
nsmap["w14"] = W14
IDS = count(1000)
doc = Document()
section = doc.sections[0]
section.page_width, section.page_height = Inches(8.27), Inches(11.69)
section.top_margin = section.bottom_margin = Inches(.55)
section.left_margin = section.right_margin = Inches(.6)
section.header_distance = section.footer_distance = Inches(.25)
WIDTH = 7.07

for name, size, bold in [("Normal", 11, False), ("Title", 20, True),
                         ("Heading 1", 15, True), ("Heading 2", 11.5, True)]:
    style = doc.styles[name]
    style.font.name = "Arial"
    style.font.size = Pt(size)
    style.font.bold = bold
    style.font.color.rgb = RGBColor(0, 0, 0)
    style.paragraph_format.line_spacing = 1.0
    style.paragraph_format.space_after = Pt(3)
    style.paragraph_format.space_before = Pt(4 if name.startswith("Heading") else 0)
    style.paragraph_format.keep_with_next = name != "Normal"
    style.paragraph_format.widow_control = True
    for border in list(style.element.iter(qn("w:pBdr"))):
        border.getparent().remove(border)

answer_style = doc.styles.add_style("Form answer", 1)
answer_style.base_style = doc.styles["Normal"]
answer_style.paragraph_format.space_before = Pt(0)
answer_style.paragraph_format.space_after = Pt(0)
answer_style.paragraph_format.keep_with_next = False
answer_style.paragraph_format.keep_together = False
answer_style.paragraph_format.widow_control = False

header = section.header.paragraphs[0]
header.text = "CNWL Lived Experience Workforce    Harrow pilot working draft"
header.style = "Normal"
header.paragraph_format.space_after = Pt(0)
for run in header.runs:
    run.font.size = Pt(9)
footer = section.footer.paragraphs[0]
footer.paragraph_format.tab_stops.add_tab_stop(Inches(WIDTH), WD_ALIGN_PARAGRAPH.RIGHT)
footer.add_run("Harrow PSFC    Working draft    26 November 2026\tPage ")
for code, suffix in [("PAGE", " of "), ("NUMPAGES", "")]:
    field = OxmlElement("w:fldSimple")
    field.set(qn("w:instr"), code)
    r = OxmlElement("w:r")
    t = OxmlElement("w:t")
    t.text = "1"
    r.append(t)
    field.append(r)
    footer._p.append(field)
    footer.add_run(suffix)
for run in footer.runs:
    run.font.name = "Arial"
    run.font.size = Pt(9)


def para(text="", style=None, bold=False, size=None, after=3):
    p = doc.add_paragraph(style=style)
    run = p.add_run(text)
    if bold:
        run.bold = True
    if size:
        run.font.size = Pt(size)
    p.paragraph_format.space_after = Pt(after)
    return p


def heading(text, new_page=False):
    p = para(text, "Heading 1")
    p.paragraph_format.page_break_before = new_page
    return p


def label(text):
    return para(text, "Heading 2")


def control_properties(tag, title):
    props = OxmlElement("w:sdtPr")
    for name, value in [("id", str(next(IDS))), ("tag", "harrow_" + tag), ("alias", title)]:
        element = OxmlElement("w:" + name)
        element.set(qn("w:val"), value)
        props.append(element)
    return props


def check(p, tag, text):
    sdt = OxmlElement("w:sdt")
    props = control_properties(tag, text)
    cb = OxmlElement("w14:checkbox")
    value = OxmlElement("w14:checked")
    value.set(qn("w14:val"), "0")
    cb.append(value)
    for name, code in [("checkedState", "2611"), ("uncheckedState", "2610")]:
        state = OxmlElement("w14:" + name)
        state.set(qn("w14:val"), code)
        state.set(qn("w14:font"), "DejaVu Sans")
        cb.append(state)
    props.append(cb)
    sdt.append(props)
    content = OxmlElement("w:sdtContent")
    run = OxmlElement("w:r")
    properties = OxmlElement("w:rPr")
    fonts = OxmlElement("w:rFonts")
    fonts.set(qn("w:ascii"), "DejaVu Sans")
    fonts.set(qn("w:hAnsi"), "DejaVu Sans")
    properties.append(fonts)
    run.append(properties)
    text_node = OxmlElement("w:t")
    text_node.text = "☐"
    run.append(text_node)
    content.append(run)
    sdt.append(content)
    p._p.append(sdt)
    p.add_run(" " + text + "   ")


def checks(tag, items):
    p = para(after=3)
    for i, text in enumerate(items):
        check(p, f"{tag}_{i}", text)
    return p


def question(text, tag, options=("Yes", "No", "Not sure")):
    p = para(after=4)
    p.add_run(text + "  ").bold = True
    for i, option in enumerate(options):
        check(p, f"{tag}_{i}", option)


def table(widths, rows):
    widths = [width * WIDTH / sum(widths) for width in widths]
    t = doc.add_table(rows=rows, cols=len(widths))
    t.alignment = WD_TABLE_ALIGNMENT.LEFT
    t.autofit = False
    for col, width in zip(t.columns, widths):
        col.width = Inches(width)
    for row in t.rows:
        for cell, width in zip(row.cells, widths):
            cell.width = Inches(width)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            pr = cell._tc.get_or_add_tcPr()
            borders = OxmlElement("w:tcBorders")
            for side in ["top", "left", "bottom", "right"]:
                edge = OxmlElement("w:" + side)
                for key, value in [("val", "single"), ("sz", "4"), ("color", "D9D9D9")]:
                    edge.set(qn("w:" + key), value)
                borders.append(edge)
            pr.append(borders)
            margins = OxmlElement("w:tcMar")
            for side, value in [("top", "50"), ("bottom", "50"), ("left", "90"), ("right", "90")]:
                margin = OxmlElement("w:" + side)
                margin.set(qn("w:w"), value)
                margin.set(qn("w:type"), "dxa")
                margins.append(margin)
            pr.append(margins)
            for p in cell.paragraphs:
                p.paragraph_format.space_after = Pt(0)
    return t


def text_cell(cell, text, header=False):
    p = cell.paragraphs[0]
    p.text = text
    p.paragraph_format.keep_with_next = header
    for run in p.runs:
        run.font.size = Pt(10.5)
        run.bold = header
    if header:
        shade = OxmlElement("w:shd")
        shade.set(qn("w:fill"), "E9F0F3")
        cell._tc.get_or_add_tcPr().append(shade)


def answer_cell(cell, tag, title, height=24):
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
    shade = OxmlElement("w:shd")
    shade.set(qn("w:fill"), "FFFFFF")
    cell._tc.get_or_add_tcPr().append(shade)
    p = cell.paragraphs[0]
    p.style = "Form answer"
    p.add_run(" ")
    sdt = OxmlElement("w:sdt")
    props = control_properties(tag, title)
    text_type = OxmlElement("w:text")
    text_type.set(qn("w:multiLine"), "1")
    props.append(text_type)
    sdt.append(props)
    content = OxmlElement("w:sdtContent")
    content.append(p._p)
    sdt.append(content)
    cell._tc.append(sdt)
    row = cell._tc.getparent()
    pr = row.get_or_add_trPr()
    row_height = pr.find(qn("w:trHeight"))
    if row_height is None:
        row_height = OxmlElement("w:trHeight")
        pr.append(row_height)
    row_height.set(qn("w:val"), str(height * 20))
    row_height.set(qn("w:hRule"), "atLeast")
    for cant_split in pr.findall(qn("w:cantSplit")):
        pr.remove(cant_split)


def gap():
    p = para(after=0)
    p.paragraph_format.line_spacing = Pt(2)
    p.add_run("").font.size = Pt(1)


def fields(items, widths=None, height=24):
    t = table(widths or [WIDTH / len(items)] * len(items), 2)
    for i, (title, tag) in enumerate(items):
        text_cell(t.cell(0, i), title, True)
        answer_cell(t.cell(1, i), tag, title, height)
    gap()
    return t


def answer(title, tag, height=32):
    label(title)
    t = table([WIDTH], 1)
    answer_cell(t.cell(0, 0), tag, title, height)
    gap()


def records(headers, widths, tag, rows=3, height=28):
    t = table(widths, rows + 1)
    for i, header_text in enumerate(headers):
        text_cell(t.cell(0, i), header_text, True)
    repeat = OxmlElement("w:tblHeader")
    t.rows[0]._tr.get_or_add_trPr().append(repeat)
    for n in range(1, rows + 1):
        for c, name in enumerate(headers):
            answer_cell(t.cell(n, c), f"{tag}_{n}_{c}", name, height)
    gap()
    return t


def attempt_log(prefix):
    label("Contact attempts")
    para("Record each attempt, including agreed voicemail or rearrangements. Three rows are provided for the proposed pilot limit; the number of attempts still needs agreement.", size=10.5)
    t = records(["Attempt", "Date and time", "Outcome and next action"], [.85, 1.55, 4.9], prefix + "_attempt", height=28)
    for i in range(1, 4):
        cell = t.cell(i, 0)
        for child in list(cell._tc):
            if child.tag != qn("w:tcPr"):
                cell._tc.remove(child)
        cell.add_paragraph(str(i))
    para("No answer does not confirm safety. Follow the recorded no-answer plan after each attempt. Act on concerns immediately; do not wait for a final attempt.", size=10.5)


def outcome(prefix):
    label("Call outcome and saving")
    checks(prefix + "_outcome", ["Completed", "Partly completed", "No answer"])
    checks(prefix + "_outcome_more", ["Declined", "Rearranged", "Could not continue"])
    answer("Anything unfinished and who will do it by when", prefix + "_unfinished", 32)
    checks(prefix + "_saved", ["Saved and reopened in the agreed record to check"])
    checks(prefix + "_feedback_shared", ["Only agreed anonymous feedback shared for project learning"])


para("Harrow peer support follow up call form", "Title")
para("Northwick Park Hospital    Working pilot draft    26 November 2026", size=10.5)
para("One document follows the offer, handover, call and feedback. Use a separate copy for each person or carer. Complete the relevant call section and only update earlier information when it changes.")
para("For review. The three-attempt limit and arrangements for closure and handover back to the clinical team still need local agreement before use as an agreed process.", bold=True, size=10.5)
t = table([1.9, 5.4], 4)
for row, (owner, task) in zip(t.rows, [
    ("Ward staff", "Section 1 — offer the call and prepare the handover before discharge."),
    ("LX Coordinator", "Section 2 — check the information, arrange the call and coordinate episode review."),
    ("Peer Support Caller", "Section 3 — record a call with the person leaving hospital."),
    ("Peer Support Caller", "Section 4 — record a carer’s own call in a separate copy and record."),
]):
    text_cell(row.cells[0], owner, True)
    text_cell(row.cells[1], task)
gap()
heading("Section 1  Ward staff offer and prepare")
fields([("Person or carer record reference", "record_ref"), ("Ward and staff member", "ward_staff"), ("Date completed", "ward_date")], [2.7, 3.1, 1.5])
question("This copy is for", "record_type", ["Person leaving hospital", "Carer"])
para("For a carer, record their own safe contact and support needs. Include only information needed for their call; do not copy the other person’s private care information.", size=10.5)
label("Offer the choice")
para("“Would you like a peer support call after leaving hospital? Someone with lived experience can listen, explore support with you and hear your feedback. It is voluntary and non-clinical. Saying no will not affect your usual care.”", size=10.5)
checks("choice", ["Yes", "No — do not arrange", "More time needed", "Unable to confirm"])
answer("If undecided, who will check again and when?", "choice_followup", 22)
checks("understands", ["Purpose and limits explained", "Safety information sharing explained"])
checks("information_given", ["Call information provided or shown"])
label("Check this offer with the person")
checks("suitability", ["Can understand and take part with any support needed", "Unsure"])
para("If unsure, discuss with the Ward Manager and LX Coordinator. This is not a clinical eligibility test or a fixed exclusion for people described as high risk.", size=10.5)
answer("Support needed or anything to discuss", "suitability_details", 22)
fields([("Safe phone number or contact method", "safe_contact"), ("Communication and accessibility needs", "communication_needs")], [3.5, 3.8], height=30)
question("Can we leave a voicemail?", "voicemail", ["Yes", "No"])
answer("If yes, the agreed neutral wording", "voicemail_wording", 22)

heading("Section 1 continued  Ward staff handover", True)
label("Agree call availability before discharge")
fields([("Expected discharge date", "discharge_date"), ("Preferred date and period", "preferred_period"), ("Alternative 1", "alternative_1"), ("Alternative 2", "alternative_2")], [1.5, 2.2, 1.8, 1.8])
para("Choose periods, not exact times: Monday to Friday, 9am–1pm or 1pm–5pm. Aim for the first peer attempt within 72 hours of discharge; outside caller hours, agree the next available period. This does not replace or delay the clinical team’s required post-discharge follow-up.", size=10.5)
checks("notice", ["About three days’ notice given where possible", "Shorter notice discussed with coordinator"])
label("Clinical arrangements and safety information")
fields([("Responsible clinical or community team and named or duty contact", "clinical_team"), ("Follow-up already arranged and other relevant services", "clinical_followup")], [3.65, 3.65], height=32)
question("Care plan on SystmOne (S1)", "care_plan", ["Yes", "No", "Not checked", "Not applicable"])
question("Crisis or safety plan on S1", "safety_plan", ["Yes", "No", "Not checked", "Not applicable"])
checks("risk_checked", ["Current risk information checked", "Only necessary information shared"])
fields([("Relevant risks or safety considerations for this call", "relevant_risks"), ("Agreed safety steps for the caller", "safety_steps")], [3.65, 3.65], height=40)
fields([("Clinical escalation contact", "clinical_route"), ("Service safeguarding lead", "safeguarding_route"), ("Backup if no response", "backup_route")], [2.44, 2.43, 2.43], height=32)
para("Enter each contact’s name, role and phone number. If a route is missing, resolve it before handing over the call.", size=10.5)
answer("Agreed identity check and no-answer plan: when and how to escalate", "no_answer_plan", 32)
label("If someone needs urgent help")
para(CRISIS["emergency"], size=10.5)
para(CRISIS["urgent"], size=10.5)
para("For safeguarding, follow the service procedure and named lead or backup route. Record who accepted the handover. No answer does not confirm safety.", size=10.5)
p = para("Current Harrow crisis routes and source links: ", size=10.5)
link = OxmlElement("w:fldSimple")
link.set(qn("w:instr"), ' HYPERLINK "https://dtp.lxportal.space/#crisis-harrow" ')
r = OxmlElement("w:r")
text_node = OxmlElement("w:t")
text_node.text = "dtp.lxportal.space/#crisis-harrow"
r.append(text_node)
link.append(r)
p._p.append(link)
label("Ward staff save and send to the coordinator")
para("Save in the agreed SystmOne record, then email securely to Stuart Angus at stuart.angus2@nhs.net. Send to the coordinator, not directly to the caller.", size=10.5)
checks("ward_saved", ["Saved to SystmOne", "Sent securely to Stuart", "Receipt confirmed"])
fields([("Date and time sent and received", "ward_handover_time"), ("Anything still to resolve and who owns it", "ward_outstanding")], [3.1, 4.2], height=24)

heading("Section 2  LX Coordinator checks and arranges", True)
para("Owner — Stuart Angus or the named covering LX Coordinator. Use Section 1 and record changes only.", size=10.5)
fields([("Coordinator", "coordinator"), ("Date checked", "coordinator_date")], [4.8, 2.5])
checks("coordinator_checks_a", ["Section 1 complete enough to proceed", "Relevant S1 information accessible"])
checks("coordinator_checks_b", ["Call periods and 72-hour peer-call aim checked", "Escalation routes clear"])
answer("Missing information or changes and who will resolve them by when", "coordinator_missing", 38)
fields([("Allocated Peer Support Caller", "caller_allocated"), ("Agreed first call period", "first_call"), ("Backup caller or contact", "backup_caller")], [2.7, 2.3, 2.3], height=28)
checks("caller_handover", ["Caller accepted handover", "Caller can access the agreed record"])
checks("caller_plan", ["Caller understands safety routes and the no answer plan"])
fields([("Handover accepted by", "handover_accepted_by"), ("Date and time", "handover_accepted_at")], [4.5, 2.8])
label("Proposed review after unsuccessful contact")
para("For local agreement. A usual maximum of three agreed attempts is proposed: preferred period and two alternatives. Record any change. Stop if the person declines and act earlier on concerns.")
para("Caller — record attempts in Section 3 or 4 and return the outcome to the coordinator. Escalate concerns immediately through the agreed route.")
para("Coordinator — proposed owner of administrative closure. Send attempt dates, outcomes, relevant concerns and outstanding actions to the responsible clinical team. Record a named acknowledgement and next action before closing. Use the backup route if no one responds; a sent email alone is not an accepted handover.")
para("Clinical team — decides further clinical follow-up. Closing a peer episode does not end clinical care or confirm safety.", bold=True, size=10.5)
para("For a carer, confirm the appropriate receiving service for their own needs; do not assume it is the other person’s clinical team.", size=10.5)
fields([("Named recipient and acknowledgement date and time", "clinical_acknowledgement"), ("Clinical team’s agreed next action and responsible person", "clinical_next_action")], [3.65, 3.65], height=38)
fields([("Peer episode status and reason", "episode_status"), ("Coordinator and date recorded", "episode_closed_by")], [4.4, 2.9], height=30)
label("Pilot decisions still to agree")
para("Review the attempt limit, exceptions, closure owner and handover route, timing and acknowledgement with Rebecca, ward colleagues and the clinical lead. Confirm the carer route too. Report improvements to Stuart and update the draft after agreement.", size=10.5)

heading("Section 3  Peer Support Caller person call", True)
para("Owner — the allocated Peer Support Caller. Read Sections 1 and 2 first. The caller listens and passes on concerns; they do not carry out a clinical risk assessment. The person can skip questions or stop. If the call cannot continue, complete the outcome on the next page and follow the agreed plan.", size=10.5)
fields([("Caller", "person_caller"), ("Call date and time", "person_call_time")], [4.5, 2.8])
checks("person_start", ["Identity checked", "Safe to talk", "Still agrees", "Handover reviewed"])
label("Ask and listen")
answer("How has it been since you left hospital?", "person_how", 40)
answer("What helped you get ready to leave?", "person_helped", 36)
answer("What was difficult or could have been better?", "person_difficult", 36)
question("Are your next steps clear?", "person_next_steps")
question("Do you know who to contact if you need help?", "person_help_contact")
answer("Is there any support you would like to explore?", "person_support", 36)
answer("What would you like the ward to know?", "person_ward_feedback", 36)
question("May we use an anonymous summary to improve support?", "person_feedback_consent", ["Yes", "No", "Not asked"])
para("Saying no does not affect support. This does not give permission for public quotes.", size=10.5)
answer("Anything the person wants left out of anonymous feedback", "person_feedback_exclusions", 28)

heading("Section 3 continued  Caller records and hands back", True)
para("Owner — the same Peer Support Caller. Record actions and each contact attempt. Return any outstanding work to its named owner.", size=10.5)
label("Agree next steps")
records(["What was agreed", "Who will do it", "By when"], [4.2, 1.8, 1.3], "person_actions", rows=2, height=32)
question("Another peer call requested?", "person_another_call", ["Yes", "No", "Not asked"])
answer("If yes, the purpose, calling period and who will arrange it", "person_next_call", 30)
attempt_log("person")
answer("Any concern: who accepted the handover, when and what was agreed", "person_concern_handover", 48)
outcome("person")
para("Save the completed form in the person’s agreed S1 record. Tell the coordinator if agreed attempts were unsuccessful or an action is outstanding. The coordinator’s proposed closure record is in Section 2.", size=10.5)

heading("Section 4  Peer Support Caller carer call", True)
para("Owner — the allocated Peer Support Caller. Use a separate copy for a carer who has agreed to their own call. Sections 1 and 2 must contain information relevant to the carer’s call. Focus on their own experience and support needs; protect the other person’s private care information.", size=10.5)
fields([("Carer’s agreed record reference", "carer_record"), ("Caller", "carer_caller"), ("Call date and time", "carer_call_time")], [3.0, 2.4, 1.9])
checks("carer_start", ["Identity checked", "Safe to talk", "Still agrees", "Handover reviewed"])
para("The carer may skip questions or stop. If the call cannot continue, record the outcome on the next page and follow their agreed plan.", size=10.5)
label("Ask and listen")
answer("What has helped?", "carer_helped", 54)
answer("What has been difficult or could be better?", "carer_difficult", 54)
answer("What support would help you now?", "carer_support", 54)
question("May we use an anonymous summary to improve support?", "carer_feedback_consent", ["Yes", "No", "Not asked"])
para("Saying no does not affect support. This does not give permission for public quotes.", size=10.5)
answer("Anything the carer wants left out of anonymous feedback", "carer_feedback_exclusions", 40)
label("Agree next steps")
records(["What was agreed", "Who will do it", "By when"], [4.2, 1.8, 1.3], "carer_actions", rows=2, height=30)

heading("Section 4 continued  Caller records the carer call", True)
para("Owner — the same Peer Support Caller. Use the carer’s agreed record and handover routes. Do not combine the carer’s notes with the person’s call record.", size=10.5)
question("Another peer call requested?", "carer_another_call", ["Yes", "No", "Not asked"])
answer("If yes, the purpose, calling period and who will arrange it", "carer_next_call", 32)
attempt_log("carer")
answer("Any concern: who accepted the handover, when and what was agreed", "carer_concern_handover", 50)
outcome("carer")
para("Save in the carer’s agreed S1 record. Tell the coordinator if agreed attempts were unsuccessful or an action is outstanding. The coordinator checks the appropriate receiving service for the carer; the other person’s clinical team is not automatically the carer’s team.", size=10.5)
para("Only share necessary information through the agreed route. The coordinator records the proposed episode review in Section 2, subject to the pilot agreement.", size=10.5)

doc.core_properties.title = "Harrow peer support follow up call form"
doc.core_properties.subject = "Working pilot draft with four role owned sections"
doc.core_properties.author = "CNWL Lived Experience Workforce"
doc.core_properties.keywords = "Harrow Northwick Park Hospital working draft 26 November 2026"
doc.core_properties.comments = "Based on Stuart Angus's working draft dated 26 November 2026. Pilot decisions remain subject to local agreement."
TARGET.parent.mkdir(parents=True, exist_ok=True)
doc.save(TARGET)
print(TARGET)
