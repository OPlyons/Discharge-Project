"""Rebuild offer, handover and carer forms. Requires python-docx.

Run with the project's document runtime. Frutiger is referenced, not embedded.
Install a licensed copy locally when rendering previews.
"""
from pathlib import Path
import runpy

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'public'/'assets'

def layout():
    return runpy.run_path(str(Path(__file__).with_name('workbook_layout.py')))

def offer():
    g=layout(); p=g['para']; a=g['answer']; c=g['choices']; h=g['heading']
    g['opening']('Offer a peer support call','Ward staff')
    g['metadata']([('Record reference','record_reference'),('Staff member and date','staff_date')])
    c('Who is the call for?','call_for',('Person leaving hospital','Carer'))
    h('1 Offer the choice')
    p('“Would you like a call from a peer support worker after hospital? They can listen and help you explore support. It is your choice. Saying no will not change your usual care.”',size=14,after=7)
    c('Their decision','decision',('Yes','No','More time','Unable to confirm'))
    p('If yes, continue. Otherwise stop arranging the call.',size=13.5,after=3)
    a('If undecided who will check again and when?','decision_followup',48)
    h('2 Record safe contact')
    a('Safe phone number or contact method','safe_contact',42)
    a('Best day or time','best_time',42)
    h('2 Record safe contact continued',True)
    c('Can we leave a voicemail?','voicemail',('Yes','No'))
    a('If yes what neutral message was agreed?','voicemail_message',42)
    a('Communication needs','communication_needs',45)
    a('For a carer where is their own record?','carer_record',34)
    p('Give the call leaflet. Explain how to change their mind.\nA carer agrees to their own call, not sharing another person’s private information.',size=13.5,after=6)
    h('3 Save and pass on')
    p('Save in the agreed record. If the call is agreed, send the names list securely to the Lived Experience Coordinator.',size=13.5,after=5)
    a('Sent to and when','sent_to_date',30)
    c('Has receipt been confirmed?','receipt',('Yes','Not yet'))
    a('If not yet who will follow up and when?','receipt_followup',34)
    g['save'](ASSETS/'Offer_a_Call_v12.docx','Offer a peer support call')

def handover():
    g=layout();p=g['para'];a=g['answer'];h=g['heading']
    g['opening']('Arrange the call','Lived Experience Coordinator')
    p('Use the offer form. There is no need to copy its details again.',size=13.5,after=6)
    g['metadata']([('Record reference','record_reference'),('Coordinator and date','coordinator_date')])
    h('1 Agree the caller')
    a('Caller and agreed call time','caller_and_time',55)
    a('Cover name and contact if needed','cover_contact',50)
    p('Check the caller can open the offer form and use the agreed safe contact and communication arrangements.',size=13.5,after=5)
    h('2 Give the help routes')
    a('Clinical or safeguarding team and contact','clinical_help',55)
    a('Backup contact if no response','backup_help',55)
    h('2 Give the help routes continued',True)
    a('Identity check and no answer plan','identity_and_no_answer',80)
    p('Use the voicemail choice in the offer form.\nNo answer does not confirm safety.',size=13.5,after=6)
    a('Where should the call form be saved?','record_location',55)
    p('Use the person’s SystmOne record. For a carer, use their own agreed record.',size=13.5,after=6)
    a('Who reviews the agreed project feedback?','feedback_reviewer',55)
    p('Name the authorised reviewer and their secure access to the record. Feedback stays in the call form. The caller does not complete another feedback form.',size=13.5,after=6)
    h('3 Confirm the handover')
    cp=p(after=7)
    g['checkbox'](cp,'handover_accepted','Caller has accepted and can access the record.')
    cp=p(after=7)
    g['checkbox'](cp,'plans_understood','Caller knows the contact and help plans.')
    a('Anything still needed','outstanding_actions',55)
    p('Include the action, who will do it and when.\nResolve incomplete checks before the call. Save in the agreed record.',size=13.5,after=0)
    g['save'](ASSETS/'Arrange_and_Hand_Over_v12.docx','Arrange the call')

def carer():
    g=layout();p=g['para'];a=g['answer'];h=g['heading'];c=g['choices']
    g['opening']('Carer peer support call','Caller')
    p('Short notes are enough. They can skip questions or stop.',size=13.5,after=6)
    g['metadata']([('Carer record reference','record_reference'),('Caller and call date','caller_date')])
    h('1 Before you start')
    p('Read the handover. Check identity, safe contact, communication needs and how to get help. Introduce yourself. Explain notes and when you must share a safety concern.',size=13.5,after=7)
    cp=p(after=5)
    g['checkbox'](cp,'safe_to_talk','Safe to talk');g['checkbox'](cp,'call_agreed','Agrees to the call')
    p('If the call cannot go ahead, go to section 4.',size=13,after=5)
    p('Focus on the carer’s own needs. Do not share the other person’s private care information.',size=13.5,after=3)
    h('2 Ask and listen')
    a('What has helped?','what_helped',78)
    a('What has been difficult or could be better?','what_was_difficult',78)
    h('2 Ask and listen continued',True)
    a('What support would help you now?','support_now',105)
    c('May we use an anonymous summary to improve support?','anonymous_summary',('Yes','No','Not asked'))
    p('Saying no does not affect support.\nThis does not give permission for public quotes.',size=13.5,after=5)
    a('Anything they want left out?','leave_out',70)
    h('3 Agree next steps')
    p('Share information, explore options or pass a request to the care team.\nThe team or service handles any referral needed.',size=13.5,after=5)
    a('What did we agree?','agreed_next_steps',83)
    p('Include who will do it and when, or write “No further action”.',size=13.5,after=3)
    h('3 Agree next steps continued',True)
    c('Do they want another call?','another_call',('Yes','No','Not asked'))
    a('If yes purpose time and who will arrange it','next_call_plan',50)
    p('Any concern that needs help?','Heading 2',after=5)
    p('For urgent concerns, use the clinical or safeguarding route now.\nUse the backup contact if no one accepts the handover.',size=13.5,after=5,keep=True)
    a('Who was told when and what they agreed','concern_and_handover',65)
    h('4 Record and save')
    cp=p(after=4)
    for i,opt in enumerate(['Completed','Partly completed','No answer']):g['checkbox'](cp,f'outcome_{i}',opt)
    cp=p(after=7)
    for i,opt in enumerate(['Declined','Rearranged','Could not continue']):g['checkbox'](cp,f'outcome_{i+3}',opt)
    p('If no answer or unable to continue, follow the handover plan.\nNo answer does not confirm safety.',size=13.5,after=5)
    a('Anything unfinished or needing another attempt?','unfinished_next_attempt',55)
    p('Include the action, who will do it and when.',size=13,after=5)
    cp=p(after=7);g['checkbox'](cp,'saved_checked','Form saved and reopened to check.')
    p('Save the whole form in the carer’s agreed record. Keep it off the website. The authorised reviewer uses only the agreed, non-identifying feedback. There is no separate feedback form.',size=13.5,after=0)
    g['save'](ASSETS/'Carer_Call_and_Feedback_v12.docx','Carer peer support call')

if __name__=='__main__':
    offer();handover();carer()
