# IRIS operations SOPs

25 procedures demonstrated in the local IRIS training workspace. Use your site’s approved test and escalation procedures.

## 27 · Recurrence handling: decide, record and verify

**Use when:** A bike or microphone check is due. In the default schedule, day five and day ten are counted from resolution of the original, not from the last check. The check goes to the original reporter; the repair owner handles a returned fault.

1. **Identify the check:** Start on the day five check, not the original repair. There are two numbers here. Match the original ticket, the equipment, and the symptom before you touch an outcome.
2. **Reconstruct the test:** Read the repair history. For this microphone, the cable was replaced because moving it interrupted the audio. Test that condition on the same unit according to your studio procedure. Silence from the reporter is not a test. If you cannot verify the result, leave the check open and arrange a test.
3. **Record a failed check:** Here the sound cuts out again. Choose Fault returned. In the note, identify mic five, describe the movement that triggered the dropout, and say what you observed.
4. **Verify the reopened repair:** Check the number on Reopen before confirming. Follow Open back to the original and verify its number and reopened state. Keep the evidence on that repair rather than creating another ticket.
5. **Compare the pass branch:** Now compare a separate check for bike twelve. The reported symptom was a click during climbs.
6. **Record a passed check:** Once the same bike has been tested and the symptom has not returned, select No recurrence.
7. **Inspect the schedule:** Look for the saved outcome, open the original, and read the schedule. A pass applies to this check; it is not evidence that a later check has already been done.

**Stop if:** If you cannot identify the original unit, reproduce the test conditions, or access the outcome controls, do not record a pass. Arrange verification with the repair owner.

**Completion evidence:** Returned fault: the original number reopens with the observation and pending checks in that cycle are cancelled. Passed check: No recurrence appears against this day; a later scheduled check is not marked passed.

## 28 · Form Mode: from fault report to saved record

**Use when:** You know the affected studio and can describe one failure without the assistant interpreting a chat report.

1. **Choose the intake path:** Use Form Mode when you know the issue and want to enter it field by field. Start in AI Assistant, then switch to Form Mode before typing.
2. **Write a searchable title:** Write a title that names the equipment and the failure. Headset microphone cuts out is more useful in a queue than please help.
3. **Capture evidence:** In the description, separate observation from diagnosis. Record which unit failed, the movement that caused the sound to drop, and the spare used to keep class running. Do not call the cable defective unless someone has verified it.
4. **Validate routing:** Choose Next. Under Repair and Maintenance, pick Audio, Mic and Headphone Malfunction. Read the suggested priority in light of the actual disruption.
5. **Specify the location and people:** On the location step, select the studio where the equipment failed, not the office filing the report. Work through the people and detail steps. Do not invent an instructor or a member to fill an optional field.
6. **Authorize one submission:** At Review and Submit, compare the title, category and studio with your original report. If anything disagrees, go back before creating the ticket. Select Create Ticket once.
7. **Verify persistence:** In All Tickets, open the new row, note the ticket number, and reload. The same number and title are your evidence that the report was saved.

**Stop if:** Stop at review if the title, route or studio disagrees with the report. If submission appears slow, look for the saved record before trying again.

**Completion evidence:** The newly created ticket can be opened by number and shows the same title after reload.

## 29 · AI Assistant: validate the draft before approval

**Use when:** A free-text incident needs classification and structured equipment details.

1. **Describe one incident:** Open AI Assistant and describe one incident in plain language. Include the studio, the exact equipment, what happened, and what kept the class running. In this report, mic four loses audio when the instructor turns.
2. **Audit the suggestion:** Send the report and wait for the assistant's intake card. Treat the classification as a suggestion. The text says microphone, but the suggested category is not the repair route this incident needs.
3. **Correct the classification:** Choose Repair and Maintenance, then Audio, Mic and Headphone Malfunction. Check the selected studio against the report.
4. **Identify the failed equipment:** Identify the area as Barre Studio, the device as Headset mic, and the problem as Cutting out.
5. **Record operational impact:** Answer the remaining questions from the incident, not from a guess. The next class, when it started, whether the unit is in use, and the impact on the member experience are different facts.
6. **Review the draft:** Select Review ticket. This is still a draft. Read its title, routing and issue details; correct a mismatch before approval.
7. **Approve and open:** Select Approve and create once. Wait for the created ticket number before opening the record.
8. **Verify the saved record:** Compare the ticket header with the draft, then reload and confirm the same number persists. A completed chat exchange by itself is not proof of a saved ticket.

**Stop if:** If the proposed route conflicts with the symptom, correct both category and subtype. If a required fact is unknown, confirm it instead of guessing merely to reach approval.

**Completion evidence:** Approval returns a ticket number. Opening and reloading that record reproduces the approved incident.

## 30 · Prevent a duplicate repair report

**Use when:** Another report mentions equipment that already has an open repair.

1. **Search first:** Before raising a second microphone report, search All Tickets using the equipment or ticket number already supplied.
2. **Compare candidates:** In Split view, compare the studio, asset and failure condition, not just two similar titles.
3. **Add evidence once:** If the existing record is the same incident, open it and add the new observation to Comments instead of submitting another repair.

**Stop if:** Matching equipment is not enough: compare studio and symptom. A parts request is not the same work as repairing the unit.

**Completion evidence:** Either the existing repair carries the new observation, or the differences justify a distinct incident.

## 31 · Shift opening: reconcile urgent work and ownership

**Use when:** The shift lead needs urgent open work with no current owner.

1. **Build the intersection:** At shift opening, select the Open scope, then combine the urgent priority shortcut with Unassigned.
2. **Interpret an empty result:** Read the result as an intersection: a blank list does not mean that every urgent ticket has an owner in every scope.
3. **Validate ownership:** Clear the filters, switch to Owners, and inspect the primary owner on the individual ticket before handing it over.

**Stop if:** An empty intersection is a valid result. Check the scope and remove one filter before drawing a wider conclusion.

**Completion evidence:** For a candidate requiring handover, the exact ticket and its actual ownership have been checked.

## 32 · Validate a saved morning review

**Use when:** A lead needs to repeat the same priority review on another shift.

1. **Define the population:** To make tomorrow's review reproducible, start with a clean queue and apply the priority shortcut.
2. **Test the saved filter:** Save the current filters under a name that describes the review, then clear them to test the saved view rather than the current screen.
3. **Verify the recalled condition:** Recall the name and check the priority indicator; if you need unassigned work as well, apply that condition explicitly.

**Stop if:** If the recalled conditions differ, do not use the row count as a comparison. Verify the filter indicators first.

**Completion evidence:** Clearing the queue and reopening the saved view restores the intended priority filter.

## 33 · Compare studio backlogs without miscounting

**Use when:** Two studios appear to have different repair backlogs.

1. **Read studio totals:** For a studio workload review, first group the queue by Studio and read each heading and count.
2. **Compare nested priorities:** Use Then by to compare priority inside a single studio; collapsing a group only hides its rows.
3. **Check the denominator:** Before reporting a backlog, inspect the scope and sort order so a display choice is not mistaken for a change in workload.

**Stop if:** Do not compare one studio's open-only count with another studio's all-status count. Collapsing a section does not remove its tickets.

**Completion evidence:** The comparison names the scope, grouping level and priority slice used for both studios.

## 34 · Reconstruct an incident from a date

**Use when:** Someone remembers the reporting day but cannot supply the ticket number.

1. **Find the report:** When a colleague remembers the day but not the number, switch the queue to Timeline and match the date group and ticket title.
2. **Separate event dates:** Open the candidate and read Activity for the event, actor and time, rather than treating the report date as the time of the repair.
3. **Cross-check identity:** Use Details to confirm the studio and equipment before quoting that history.

**Stop if:** Multiple reports can share a date and a similar title. Verify the studio and equipment before quoting an event.

**Completion evidence:** The cited event includes the matched ticket, actor and event time, not just the report date.

## 35 · Diagnose a stalled board card

**Use when:** Work appears to have stopped moving across status columns.

1. **Inspect the card:** When a status board looks stalled, open the card rather than assuming nobody is working on it.
2. **Read the dependency:** Read the status and owner together, then inspect the latest resolution note for the dependency.
3. **Give the next shift a test:** If the next shift still owes a test, record a follow-up naming the check; do not mark the repair resolved just to clear the column.

**Stop if:** Do not move a card merely because it has been in the same column for a long time. Read the dependency first.

**Completion evidence:** The next check is documented as a follow-up or the existing reason for waiting is understood.

## 36 · Put a repair on hold with evidence

**Use when:** Repair work has started but the owner needs a response to proceed.

1. **Establish what changed:** When a repair is waiting on a person, distinguish the work already done from the response still missing.
2. **Record the blocker:** In Status and Assignment, choose Awaiting Response only when that describes the actual blocker.
3. **Leave a verifiable note:** Add a resolution note naming the test and who owes confirmation; verify the saved line so the next shift can act without rereading the whole thread.

**Stop if:** A parts delay and a missing instructor confirmation are different blockers. Do not choose Awaiting Response unless someone actually owes a reply.

**Completion evidence:** Status and the saved log entry agree on what is pending and who should respond.

## 37 · Apply a repair closure gate

**Use when:** The owner believes the fix is ready to close.

1. **Set the acceptance test:** Before closing a repair, compare the original symptom with the conditions of the test.
2. **Document the repair:** Open Mark Resolved and write the repair and the observed test result in the summary; enter a root cause only if the evidence supports it.
3. **Confirm the state change:** Confirm Resolution and read the new badge, because entering a summary without confirming is not a completed status change.

**Stop if:** A spare keeping a class running is a workaround, not proof the original unit is fixed. Do not claim a cause that has not been verified.

**Completion evidence:** The resolution describes the test and its result, and the saved status reads Resolved.

## 38 · Write a handover the next shift can execute

**Use when:** An incoming shift must perform a specific equipment test.

1. **Establish responsibility:** For an evening handover, read the current status and identify who is responsible before writing.
2. **Create the follow-up:** In Resolution Log choose Follow-up, name the shift, the equipment and the next action, then submit.
3. **Verify two facts:** Read the saved entry back and check the owner separately; a follow-up records work to do but does not transfer responsibility.

**Stop if:** Do not assume that entering a person's name in the log reassigns the ticket. Check ownership separately.

**Completion evidence:** A saved Follow-up names the shift, unit and observable next action.

## 39 · Investigate a reported missed response

**Use when:** The reporter disputes whether the first response was timely.

1. **Locate the response clock:** If a reporter says nobody responded, open the exact ticket and locate the first response line under SLA Tracking.
2. **Separate the resolution target:** Read that target separately from the resolution target; a response can be complete while repair work is still due.
3. **Reconcile the evidence:** Compare the clocks with Activity before explaining which milestone was met and what remains outstanding.

**Stop if:** If the history does not support a conclusion, report the displayed milestone and the missing evidence separately.

**Completion evidence:** The answer distinguishes first response from resolution and cites the relevant event.

## 40 · Escalate a decision that the owner cannot make

**Use when:** The repair owner cannot authorize a required decision.

1. **Check the current rung:** When a technician needs approval beyond the current level, inspect the highlighted rung before escalating.
2. **State the decision:** Use Escalate inside the ladder and record the decision needed, not simply the word urgent.
3. **Audit the move:** Confirm the proposed level, then expand History and check the reason; a future escalation time is not a recorded move.

**Stop if:** Do not escalate to compensate for a vague note. Identify the exact approval, part or intervention needed.

**Completion evidence:** History shows the intended new level and the recorded decision request.

## 41 · Return authority after an approval

**Use when:** A higher-level blocker is cleared and the local owner can continue.

1. **Confirm the blocker cleared:** After approval arrives, check the current level and whether the local owner can now continue.
2. **Give the reason:** Choose De-escalate and state what changed, such as approval of the replacement part.
3. **Check the lower rung:** Confirm the lower level and inspect History; lowering the escalation does not resolve the equipment fault.

**Stop if:** Do not lower the rung solely because time passed; verify the approval or other change that removes the blocker.

**Completion evidence:** History records why the level decreased, without implying that the repair itself was completed.

## 42 · Audit a disputed escalation

**Use when:** A colleague questions why or when a ticket moved up the ladder.

1. **Identify the record:** To audit a disputed escalation, open the specific ticket from Escalations rather than relying on a queue count.
2. **Reconcile two histories:** Read Activity for the sequence of events, then expand ladder History for the reason behind the move.
3. **Explain the decision:** Compare that reason with the current rung; the latest position alone cannot tell you why a previous decision was made.

**Stop if:** A timer predicts a move. It does not replace a historical event. Keep current level and prior reasons separate.

**Completion evidence:** The explanation names the actual move, its reason and the current rung.

## 43 · Trace a parts dependency without merging tickets

**Use when:** A repair depends on a separate supply or parts work order.

1. **Keep the work distinct:** When the spare cable has its own work order, keep the repair and stock request as separate records.
2. **Create the relationship:** Search from Link Related Ticket using the other number, select the matching title, and check that the linked number appears.
3. **Verify the destination:** Open the link to verify its destination before telling a colleague the dependency is documented.

**Stop if:** A similar title is not proof of a dependency. Check the destination before relying on the link.

**Completion evidence:** The original shows a linked number that opens the intended separate work order.

## 44 · Separate a desk update from an action request

**Use when:** The front desk has useful information and another shift may need to act.

1. **Read before posting:** For a front desk update, first read Comments so you do not repeat an earlier message.
2. **Record the change:** Post the concrete change, such as the spare being ready, and verify it appears with its author.
3. **Assign a next check in writing:** If another shift must perform a test, put that action in a resolution follow-up as well; do not rely on a discussion message to change status.

**Stop if:** Do not treat a comment as a resolution, ownership change or scheduled test. Record an actionable follow-up separately.

**Completion evidence:** The thread shows the factual update; the log contains any specific work still owed.

## 45 · Distinguish a tracking tag from a routing category

**Use when:** A ticket needs a descriptive label shared across several kinds of work.

1. **Choose the vocabulary:** Use a tag when a cross-cutting label such as sound check would help colleagues recognise the work.
2. **Save and verify the label:** Add the short label in Resolution Center, press Enter and verify it under Details.
3. **Recognize a routing correction:** Compare it with the category: a tag can describe a test, but it cannot correct a wrongly routed intake.

**Stop if:** If the department or classification is wrong, a tag alone will not fix it. Treat intake routing as a separate decision.

**Completion evidence:** Details shows the intended tag without changing the meaning of the routing category.

## 46 · Recover a ticket hidden by scope or filters

**Use when:** A known ticket is absent from the current queue.

1. **Check the queue boundary:** When a ticket seems missing, check whether you are in My Tickets or the department queue.
2. **Reset and search:** Move to All Tickets, clear filters and search for the exact number before assuming the record was lost.
3. **Verify the match:** Open the match and verify the title; a different queue changes what you see, not the underlying repair.

**Stop if:** If the number still does not appear in All Tickets, check the number and your access with the appropriate lead; do not raise a duplicate on that basis.

**Completion evidence:** The opened record matches the original number and title, or the visibility question is passed on explicitly.

## 47 · Use a ticket number for a live handoff

**Use when:** A colleague hands over a specific repair number during a call.

1. **Search precisely:** During a live handoff, open quick search and enter the ticket number rather than an ambiguous equipment name.
2. **Read the result and header:** Read the matching result before opening it, then compare the workspace header with the number you were given.
3. **Validate location and owner:** Use Details to verify the studio and owner before discussing the case.

**Stop if:** If the result has the wrong number, stop before discussing details or recording an update.

**Completion evidence:** Search result, ticket header, affected studio and owner all refer to the intended case.

## 48 · Choose the right record before documenting work

**Use when:** Similar titles make it easy to put a note on the wrong record.

1. **Compare before opening:** When two tickets look similar, select them in Split view and compare their descriptions without leaving the list.
2. **Separate asset from task:** Distinguish the failed microphone from the separate replacement cable request; different work can share equipment and staff.
3. **Enter the right workspace:** Open the right record before adding a note so the evidence stays with the incident it describes.

**Stop if:** Distinguish an equipment incident from procurement work, even when both mention the same unit.

**Completion evidence:** The selected workspace describes the task the new evidence actually belongs to.

## 49 · Bike recurrence: certify a tested pass

**Use when:** A due bike follow-up is ready for an observed test.

1. **Match the original bike:** For a passed bike check, start by matching the original ticket number and the reported pedal noise.
2. **Apply the pass gate:** Only after the same unit has been tested should you select No recurrence; if the bike is unavailable, leave the check open.
3. **Check the schedule:** Verify the outcome on the check and open the original schedule to distinguish this result from a future appointment.

**Stop if:** No complaint is not a successful test. If the bike cannot be checked, keep the outcome pending.

**Completion evidence:** The check shows No recurrence and the original schedule distinguishes this pass from later checks.

## 50 · Microphone recurrence: reopen with diagnostic evidence

**Use when:** A microphone exhibits the repaired fault again during a recurrence check.

1. **Confirm recurrence:** For a failed microphone check, read the original history before deciding whether this is the same fault.
2. **Describe the returned symptom:** Choose Fault returned and describe the repeated symptom and the condition that triggers it; do not substitute an unverified cause.
3. **Route back to the repair:** Confirm Reopen against the original number and verify the destination instead of filing a second microphone repair.

**Stop if:** If the symptom or equipment differs, establish the relationship before reopening the original. Record observations rather than an assumed diagnosis.

**Completion evidence:** The original repair number is reopened and the recurrence note states the unit, trigger and repeated symptom.

## 51 · Shift sign-off: deliver an actionable case summary

**Use when:** A lead needs to brief another shift on open or escalated work.

1. **Find the exact record:** Before ending a shift, test the handoff as if you were the incoming lead.
2. **Name the outstanding work:** Open the ticket by number, verify its status and owner, and read the latest follow-up for the next action.
3. **State the outstanding decision:** If the work is escalated, compare the current rung with its history so you can say who needs to decide what, rather than just reporting that the ticket is open.

**Stop if:** Do not invent an owner, decision or return time. If one is missing, say exactly what still needs confirmation.

**Completion evidence:** The incoming lead can identify the ticket, current responsibility, next action and any outstanding approval.
