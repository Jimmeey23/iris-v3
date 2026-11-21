export default [
  {
    "id": 27,
    "title": "Recurrence handling: decide, record and verify",
    "collection": "Operations SOPs",
    "path": "sops/27-recurrence-handling-decide-record-and-verify",
    "chapters": [
      {
        "label": "Identify the check",
        "gate": "Match check → original → equipment",
        "text": "Start on the day five check, not the original repair. There are two numbers here. Match the original ticket, the equipment, and the symptom before you touch an outcome.",
        "time": 0
      },
      {
        "label": "Reconstruct the test",
        "gate": "Test the reported condition",
        "text": "Read the repair history. For this microphone, the cable was replaced because moving it interrupted the audio. Test that condition on the same unit according to your studio procedure. Silence from the reporter is not a test. If you cannot verify the result, leave the check open and arrange a test.",
        "time": 9.5
      },
      {
        "label": "Record a failed check",
        "gate": "Unit + trigger + observed symptom",
        "text": "Here the sound cuts out again. Choose Fault returned. In the note, identify mic five, describe the movement that triggered the dropout, and say what you observed.",
        "time": 26.54
      },
      {
        "label": "Verify the reopened repair",
        "gate": "Match the reopened number",
        "text": "Check the number on Reopen before confirming. Follow Open back to the original and verify its number and reopened state. Keep the evidence on that repair rather than creating another ticket.",
        "time": 36.43
      },
      {
        "label": "Compare the pass branch",
        "gate": "Separate example: Bike 12",
        "text": "Now compare a separate check for bike twelve. The reported symptom was a click during climbs.",
        "time": 46.96
      },
      {
        "label": "Record a passed check",
        "gate": "Pass only after the actual test",
        "text": "Once the same bike has been tested and the symptom has not returned, select No recurrence.",
        "time": 52.48
      },
      {
        "label": "Inspect the schedule",
        "gate": "Current outcome ≠ next check",
        "text": "Look for the saved outcome, open the original, and read the schedule. A pass applies to this check; it is not evidence that a later check has already been done.",
        "time": 57.78
      }
    ],
    "duration": 66.55,
    "controls": {
      "trigger": "A bike or microphone check is due. In the default schedule, day five and day ten are counted from resolution of the original, not from the last check. The check goes to the original reporter; the repair owner handles a returned fault.",
      "stop": "If you cannot identify the original unit, reproduce the test conditions, or access the outcome controls, do not record a pass. Arrange verification with the repair owner.",
      "evidence": "Returned fault: the original number reopens with the observation and pending checks in that cycle are cancelled. Passed check: No recurrence appears against this day; a later scheduled check is not marked passed."
    }
  },
  {
    "id": 28,
    "title": "Form Mode: from fault report to saved record",
    "collection": "Operations SOPs",
    "path": "sops/28-form-mode-from-fault-report-to-saved-record",
    "chapters": [
      {
        "label": "Choose the intake path",
        "gate": "Structured entry • Form Mode",
        "text": "Use Form Mode when you know the issue and want to enter it field by field. Start in AI Assistant, then switch to Form Mode before typing.",
        "time": 0
      },
      {
        "label": "Write a searchable title",
        "gate": "Equipment + failure",
        "text": "Write a title that names the equipment and the failure. Headset microphone cuts out is more useful in a queue than please help.",
        "time": 8.62
      },
      {
        "label": "Capture evidence",
        "gate": "Unit + symptom + workaround",
        "text": "In the description, separate observation from diagnosis. Record which unit failed, the movement that caused the sound to drop, and the spare used to keep class running. Do not call the cable defective unless someone has verified it.",
        "time": 16.03
      },
      {
        "label": "Validate routing",
        "gate": "Category → subtype → priority",
        "text": "Choose Next. Under Repair and Maintenance, pick Audio, Mic and Headphone Malfunction. Read the suggested priority in light of the actual disruption.",
        "time": 29.5
      },
      {
        "label": "Specify the location and people",
        "gate": "Use the affected studio",
        "text": "On the location step, select the studio where the equipment failed, not the office filing the report. Work through the people and detail steps. Do not invent an instructor or a member to fill an optional field.",
        "time": 38.75
      },
      {
        "label": "Authorize one submission",
        "gate": "Compare the draft with the report",
        "text": "At Review and Submit, compare the title, category and studio with your original report. If anything disagrees, go back before creating the ticket. Select Create Ticket once.",
        "time": 50.68
      },
      {
        "label": "Verify persistence",
        "gate": "Same number after reload",
        "text": "In All Tickets, open the new row, note the ticket number, and reload. The same number and title are your evidence that the report was saved.",
        "time": 61.37
      }
    ],
    "duration": 69.43,
    "controls": {
      "trigger": "You know the affected studio and can describe one failure without the assistant interpreting a chat report.",
      "stop": "Stop at review if the title, route or studio disagrees with the report. If submission appears slow, look for the saved record before trying again.",
      "evidence": "The newly created ticket can be opened by number and shows the same title after reload."
    }
  },
  {
    "id": 29,
    "title": "AI Assistant: validate the draft before approval",
    "collection": "Operations SOPs",
    "path": "sops/29-ai-assistant-validate-the-draft-before-approval",
    "chapters": [
      {
        "label": "Describe one incident",
        "gate": "Studio + unit + observation",
        "text": "Open AI Assistant and describe one incident in plain language. Include the studio, the exact equipment, what happened, and what kept the class running. In this report, mic four loses audio when the instructor turns.",
        "time": 0
      },
      {
        "label": "Audit the suggestion",
        "gate": "An intake card is not a ticket",
        "text": "Send the report and wait for the assistant's intake card. Treat the classification as a suggestion. The text says microphone, but the suggested category is not the repair route this incident needs.",
        "time": 13.27
      },
      {
        "label": "Correct the classification",
        "gate": "Read both classification fields",
        "text": "Choose Repair and Maintenance, then Audio, Mic and Headphone Malfunction. Check the selected studio against the report.",
        "time": 24.56
      },
      {
        "label": "Identify the failed equipment",
        "gate": "Area → device → symptom",
        "text": "Identify the area as Barre Studio, the device as Headset mic, and the problem as Cutting out.",
        "time": 31.77
      },
      {
        "label": "Record operational impact",
        "gate": "Answer from facts, not guesses",
        "text": "Answer the remaining questions from the incident, not from a guess. The next class, when it started, whether the unit is in use, and the impact on the member experience are different facts.",
        "time": 38.0
      },
      {
        "label": "Review the draft",
        "gate": "Stop if the draft disagrees",
        "text": "Select Review ticket. This is still a draft. Read its title, routing and issue details; correct a mismatch before approval.",
        "time": 48.06
      },
      {
        "label": "Approve and open",
        "gate": "Wait for the created number",
        "text": "Select Approve and create once. Wait for the created ticket number before opening the record.",
        "time": 55.86
      },
      {
        "label": "Verify the saved record",
        "gate": "Match the header after reload",
        "text": "Compare the ticket header with the draft, then reload and confirm the same number persists. A completed chat exchange by itself is not proof of a saved ticket.",
        "time": 60.92
      }
    ],
    "duration": 69.75,
    "controls": {
      "trigger": "A free-text incident needs classification and structured equipment details.",
      "stop": "If the proposed route conflicts with the symptom, correct both category and subtype. If a required fact is unknown, confirm it instead of guessing merely to reach approval.",
      "evidence": "Approval returns a ticket number. Opening and reloading that record reproduces the approved incident."
    }
  },
  {
    "id": 30,
    "title": "Prevent a duplicate repair report",
    "collection": "Operations SOPs",
    "path": "sops/30-prevent-a-duplicate-repair-report",
    "chapters": [
      {
        "label": "Search first",
        "gate": "Look for the supplied identifier",
        "text": "Before raising a second microphone report, search All Tickets using the equipment or ticket number already supplied.",
        "time": 0
      },
      {
        "label": "Compare candidates",
        "gate": "Studio + asset + symptom",
        "text": "In Split view, compare the studio, asset and failure condition, not just two similar titles.",
        "time": 6.78
      },
      {
        "label": "Add evidence once",
        "gate": "Same incident → existing thread",
        "text": "If the existing record is the same incident, open it and add the new observation to Comments instead of submitting another repair.",
        "time": 12.92
      }
    ],
    "duration": 20.01,
    "controls": {
      "trigger": "Another report mentions equipment that already has an open repair.",
      "stop": "Matching equipment is not enough: compare studio and symptom. A parts request is not the same work as repairing the unit.",
      "evidence": "Either the existing repair carries the new observation, or the differences justify a distinct incident."
    }
  },
  {
    "id": 31,
    "title": "Shift opening: reconcile urgent work and ownership",
    "collection": "Operations SOPs",
    "path": "sops/31-shift-opening-reconcile-urgent-work-and-ownership",
    "chapters": [
      {
        "label": "Build the intersection",
        "gate": "Open + urgent + unassigned",
        "text": "At shift opening, select the Open scope, then combine the urgent priority shortcut with Unassigned.",
        "time": 0
      },
      {
        "label": "Interpret an empty result",
        "gate": "Empty only within this scope",
        "text": "Read the result as an intersection: a blank list does not mean that every urgent ticket has an owner in every scope.",
        "time": 6.72
      },
      {
        "label": "Validate ownership",
        "gate": "Verify the owner on the record",
        "text": "Clear the filters, switch to Owners, and inspect the primary owner on the individual ticket before handing it over.",
        "time": 13.44
      }
    ],
    "duration": 19.96,
    "controls": {
      "trigger": "The shift lead needs urgent open work with no current owner.",
      "stop": "An empty intersection is a valid result. Check the scope and remove one filter before drawing a wider conclusion.",
      "evidence": "For a candidate requiring handover, the exact ticket and its actual ownership have been checked."
    }
  },
  {
    "id": 32,
    "title": "Validate a saved morning review",
    "collection": "Operations SOPs",
    "path": "sops/32-validate-a-saved-morning-review",
    "chapters": [
      {
        "label": "Define the population",
        "gate": "Start from known filters",
        "text": "To make tomorrow's review reproducible, start with a clean queue and apply the priority shortcut.",
        "time": 0
      },
      {
        "label": "Test the saved filter",
        "gate": "Name it, save it, clear it",
        "text": "Save the current filters under a name that describes the review, then clear them to test the saved view rather than the current screen.",
        "time": 5.96
      },
      {
        "label": "Verify the recalled condition",
        "gate": "Priority is not ownership",
        "text": "Recall the name and check the priority indicator; if you need unassigned work as well, apply that condition explicitly.",
        "time": 13.09
      }
    ],
    "duration": 19.54,
    "controls": {
      "trigger": "A lead needs to repeat the same priority review on another shift.",
      "stop": "If the recalled conditions differ, do not use the row count as a comparison. Verify the filter indicators first.",
      "evidence": "Clearing the queue and reopening the saved view restores the intended priority filter."
    }
  },
  {
    "id": 33,
    "title": "Compare studio backlogs without miscounting",
    "collection": "Operations SOPs",
    "path": "sops/33-compare-studio-backlogs-without-miscounting",
    "chapters": [
      {
        "label": "Read studio totals",
        "gate": "Read counts within a group",
        "text": "For a studio workload review, first group the queue by Studio and read each heading and count.",
        "time": 0
      },
      {
        "label": "Compare nested priorities",
        "gate": "A collapsed row is not gone",
        "text": "Use Then by to compare priority inside a single studio; collapsing a group only hides its rows.",
        "time": 6.15
      },
      {
        "label": "Check the denominator",
        "gate": "Scope selects; sort orders",
        "text": "Before reporting a backlog, inspect the scope and sort order so a display choice is not mistaken for a change in workload.",
        "time": 12.69
      }
    ],
    "duration": 19.555,
    "controls": {
      "trigger": "Two studios appear to have different repair backlogs.",
      "stop": "Do not compare one studio's open-only count with another studio's all-status count. Collapsing a section does not remove its tickets.",
      "evidence": "The comparison names the scope, grouping level and priority slice used for both studios."
    }
  },
  {
    "id": 34,
    "title": "Reconstruct an incident from a date",
    "collection": "Operations SOPs",
    "path": "sops/34-reconstruct-an-incident-from-a-date",
    "chapters": [
      {
        "label": "Find the report",
        "gate": "Date group + matching title",
        "text": "When a colleague remembers the day but not the number, switch the queue to Timeline and match the date group and ticket title.",
        "time": 0
      },
      {
        "label": "Separate event dates",
        "gate": "Actor + action + timestamp",
        "text": "Open the candidate and read Activity for the event, actor and time, rather than treating the report date as the time of the repair.",
        "time": 7.165
      },
      {
        "label": "Cross-check identity",
        "gate": "Confirm studio and equipment",
        "text": "Use Details to confirm the studio and equipment before quoting that history.",
        "time": 14.895
      }
    ],
    "duration": 19.165,
    "controls": {
      "trigger": "Someone remembers the reporting day but cannot supply the ticket number.",
      "stop": "Multiple reports can share a date and a similar title. Verify the studio and equipment before quoting an event.",
      "evidence": "The cited event includes the matched ticket, actor and event time, not just the report date."
    }
  },
  {
    "id": 35,
    "title": "Diagnose a stalled board card",
    "collection": "Operations SOPs",
    "path": "sops/35-diagnose-a-stalled-board-card",
    "chapters": [
      {
        "label": "Inspect the card",
        "gate": "A column is a starting point",
        "text": "When a status board looks stalled, open the card rather than assuming nobody is working on it.",
        "time": 0
      },
      {
        "label": "Read the dependency",
        "gate": "Status + owner + last note",
        "text": "Read the status and owner together, then inspect the latest resolution note for the dependency.",
        "time": 5.35
      },
      {
        "label": "Give the next shift a test",
        "gate": "Record the action, not a false closure",
        "text": "If the next shift still owes a test, record a follow-up naming the check; do not mark the repair resolved just to clear the column.",
        "time": 10.78
      }
    ],
    "duration": 18.23,
    "controls": {
      "trigger": "Work appears to have stopped moving across status columns.",
      "stop": "Do not move a card merely because it has been in the same column for a long time. Read the dependency first.",
      "evidence": "The next check is documented as a follow-up or the existing reason for waiting is understood."
    }
  },
  {
    "id": 36,
    "title": "Put a repair on hold with evidence",
    "collection": "Operations SOPs",
    "path": "sops/36-put-a-repair-on-hold-with-evidence",
    "chapters": [
      {
        "label": "Establish what changed",
        "gate": "Work performed vs response owed",
        "text": "When a repair is waiting on a person, distinguish the work already done from the response still missing.",
        "time": 0
      },
      {
        "label": "Record the blocker",
        "gate": "Use the status that matches reality",
        "text": "In Status and Assignment, choose Awaiting Response only when that describes the actual blocker.",
        "time": 6.26
      },
      {
        "label": "Leave a verifiable note",
        "gate": "Name the test and who owes it",
        "text": "Add a resolution note naming the test and who owes confirmation; verify the saved line so the next shift can act without rereading the whole thread.",
        "time": 12.3
      }
    ],
    "duration": 20.98,
    "controls": {
      "trigger": "Repair work has started but the owner needs a response to proceed.",
      "stop": "A parts delay and a missing instructor confirmation are different blockers. Do not choose Awaiting Response unless someone actually owes a reply.",
      "evidence": "Status and the saved log entry agree on what is pending and who should respond."
    }
  },
  {
    "id": 37,
    "title": "Apply a repair closure gate",
    "collection": "Operations SOPs",
    "path": "sops/37-apply-a-repair-closure-gate",
    "chapters": [
      {
        "label": "Set the acceptance test",
        "gate": "Test the original symptom",
        "text": "Before closing a repair, compare the original symptom with the conditions of the test.",
        "time": 0
      },
      {
        "label": "Document the repair",
        "gate": "Evidence first; cause only if known",
        "text": "Open Mark Resolved and write the repair and the observed test result in the summary; enter a root cause only if the evidence supports it.",
        "time": 5.19
      },
      {
        "label": "Confirm the state change",
        "gate": "Read the saved badge",
        "text": "Confirm Resolution and read the new badge, because entering a summary without confirming is not a completed status change.",
        "time": 13.33
      }
    ],
    "duration": 20.205,
    "controls": {
      "trigger": "The owner believes the fix is ready to close.",
      "stop": "A spare keeping a class running is a workaround, not proof the original unit is fixed. Do not claim a cause that has not been verified.",
      "evidence": "The resolution describes the test and its result, and the saved status reads Resolved."
    }
  },
  {
    "id": 38,
    "title": "Write a handover the next shift can execute",
    "collection": "Operations SOPs",
    "path": "sops/38-write-a-handover-the-next-shift-can-execute",
    "chapters": [
      {
        "label": "Establish responsibility",
        "gate": "Who owns the next action?",
        "text": "For an evening handover, read the current status and identify who is responsible before writing.",
        "time": 0
      },
      {
        "label": "Create the follow-up",
        "gate": "Shift + equipment + next action",
        "text": "In Resolution Log choose Follow-up, name the shift, the equipment and the next action, then submit.",
        "time": 5.985
      },
      {
        "label": "Verify two facts",
        "gate": "Saved follow-up ≠ reassignment",
        "text": "Read the saved entry back and check the owner separately; a follow-up records work to do but does not transfer responsibility.",
        "time": 12.635
      }
    ],
    "duration": 19.925,
    "controls": {
      "trigger": "An incoming shift must perform a specific equipment test.",
      "stop": "Do not assume that entering a person's name in the log reassigns the ticket. Check ownership separately.",
      "evidence": "A saved Follow-up names the shift, unit and observable next action."
    }
  },
  {
    "id": 39,
    "title": "Investigate a reported missed response",
    "collection": "Operations SOPs",
    "path": "sops/39-investigate-a-reported-missed-response",
    "chapters": [
      {
        "label": "Locate the response clock",
        "gate": "Read the named milestone",
        "text": "If a reporter says nobody responded, open the exact ticket and locate the first response line under SLA Tracking.",
        "time": 0
      },
      {
        "label": "Separate the resolution target",
        "gate": "Response is not resolution",
        "text": "Read that target separately from the resolution target; a response can be complete while repair work is still due.",
        "time": 7.78
      },
      {
        "label": "Reconcile the evidence",
        "gate": "Corroborate the event in Activity",
        "text": "Compare the clocks with Activity before explaining which milestone was met and what remains outstanding.",
        "time": 14.54
      }
    ],
    "duration": 20.405,
    "controls": {
      "trigger": "The reporter disputes whether the first response was timely.",
      "stop": "If the history does not support a conclusion, report the displayed milestone and the missing evidence separately.",
      "evidence": "The answer distinguishes first response from resolution and cites the relevant event."
    }
  },
  {
    "id": 40,
    "title": "Escalate a decision that the owner cannot make",
    "collection": "Operations SOPs",
    "path": "sops/40-escalate-a-decision-that-the-owner-cannot-make",
    "chapters": [
      {
        "label": "Check the current rung",
        "gate": "Identify the missing authority",
        "text": "When a technician needs approval beyond the current level, inspect the highlighted rung before escalating.",
        "time": 0
      },
      {
        "label": "State the decision",
        "gate": "Say what approval is needed",
        "text": "Use Escalate inside the ladder and record the decision needed, not simply the word urgent.",
        "time": 5.975
      },
      {
        "label": "Audit the move",
        "gate": "Confirm level and saved reason",
        "text": "Confirm the proposed level, then expand History and check the reason; a future escalation time is not a recorded move.",
        "time": 11.605
      }
    ],
    "duration": 18.945,
    "controls": {
      "trigger": "The repair owner cannot authorize a required decision.",
      "stop": "Do not escalate to compensate for a vague note. Identify the exact approval, part or intervention needed.",
      "evidence": "History shows the intended new level and the recorded decision request."
    }
  },
  {
    "id": 41,
    "title": "Return authority after an approval",
    "collection": "Operations SOPs",
    "path": "sops/41-return-authority-after-an-approval",
    "chapters": [
      {
        "label": "Confirm the blocker cleared",
        "gate": "Can the local owner proceed?",
        "text": "After approval arrives, check the current level and whether the local owner can now continue.",
        "time": 0
      },
      {
        "label": "Give the reason",
        "gate": "Document what changed",
        "text": "Choose De-escalate and state what changed, such as approval of the replacement part.",
        "time": 5.47
      },
      {
        "label": "Check the lower rung",
        "gate": "Authority changed; repair remains",
        "text": "Confirm the lower level and inspect History; lowering the escalation does not resolve the equipment fault.",
        "time": 10.43
      }
    ],
    "duration": 16.32,
    "controls": {
      "trigger": "A higher-level blocker is cleared and the local owner can continue.",
      "stop": "Do not lower the rung solely because time passed; verify the approval or other change that removes the blocker.",
      "evidence": "History records why the level decreased, without implying that the repair itself was completed."
    }
  },
  {
    "id": 42,
    "title": "Audit a disputed escalation",
    "collection": "Operations SOPs",
    "path": "sops/42-audit-a-disputed-escalation",
    "chapters": [
      {
        "label": "Identify the record",
        "gate": "Open the specific exception",
        "text": "To audit a disputed escalation, open the specific ticket from Escalations rather than relying on a queue count.",
        "time": 0
      },
      {
        "label": "Reconcile two histories",
        "gate": "Sequence in Activity; reason in History",
        "text": "Read Activity for the sequence of events, then expand ladder History for the reason behind the move.",
        "time": 6.82
      },
      {
        "label": "Explain the decision",
        "gate": "Position alone is not a reason",
        "text": "Compare that reason with the current rung; the latest position alone cannot tell you why a previous decision was made.",
        "time": 12.68
      }
    ],
    "duration": 19.24,
    "controls": {
      "trigger": "A colleague questions why or when a ticket moved up the ladder.",
      "stop": "A timer predicts a move. It does not replace a historical event. Keep current level and prior reasons separate.",
      "evidence": "The explanation names the actual move, its reason and the current rung."
    }
  },
  {
    "id": 43,
    "title": "Trace a parts dependency without merging tickets",
    "collection": "Operations SOPs",
    "path": "sops/43-trace-a-parts-dependency-without-merging-tickets",
    "chapters": [
      {
        "label": "Keep the work distinct",
        "gate": "Repair and stock have different histories",
        "text": "When the spare cable has its own work order, keep the repair and stock request as separate records.",
        "time": 0
      },
      {
        "label": "Create the relationship",
        "gate": "Match the other number and title",
        "text": "Search from Link Related Ticket using the other number, select the matching title, and check that the linked number appears.",
        "time": 6.02
      },
      {
        "label": "Verify the destination",
        "gate": "Open the linked work order",
        "text": "Open the link to verify its destination before telling a colleague the dependency is documented.",
        "time": 13.02
      }
    ],
    "duration": 18.375,
    "controls": {
      "trigger": "A repair depends on a separate supply or parts work order.",
      "stop": "A similar title is not proof of a dependency. Check the destination before relying on the link.",
      "evidence": "The original shows a linked number that opens the intended separate work order."
    }
  },
  {
    "id": 44,
    "title": "Separate a desk update from an action request",
    "collection": "Operations SOPs",
    "path": "sops/44-separate-a-desk-update-from-an-action-request",
    "chapters": [
      {
        "label": "Read before posting",
        "gate": "Avoid repeating the thread",
        "text": "For a front desk update, first read Comments so you do not repeat an earlier message.",
        "time": 0
      },
      {
        "label": "Record the change",
        "gate": "Concrete observation + author",
        "text": "Post the concrete change, such as the spare being ready, and verify it appears with its author.",
        "time": 5.315
      },
      {
        "label": "Assign a next check in writing",
        "gate": "Discussion is not a status change",
        "text": "If another shift must perform a test, put that action in a resolution follow-up as well; do not rely on a discussion message to change status.",
        "time": 10.975
      }
    ],
    "duration": 19.335,
    "controls": {
      "trigger": "The front desk has useful information and another shift may need to act.",
      "stop": "Do not treat a comment as a resolution, ownership change or scheduled test. Record an actionable follow-up separately.",
      "evidence": "The thread shows the factual update; the log contains any specific work still owed."
    }
  },
  {
    "id": 45,
    "title": "Distinguish a tracking tag from a routing category",
    "collection": "Operations SOPs",
    "path": "sops/45-distinguish-a-tracking-tag-from-a-routing-category",
    "chapters": [
      {
        "label": "Choose the vocabulary",
        "gate": "Use a consistent test label",
        "text": "Use a tag when a cross-cutting label such as sound check would help colleagues recognise the work.",
        "time": 0
      },
      {
        "label": "Save and verify the label",
        "gate": "Check Tags under Details",
        "text": "Add the short label in Resolution Center, press Enter and verify it under Details.",
        "time": 5.7
      },
      {
        "label": "Recognize a routing correction",
        "gate": "Tagging cannot reroute intake",
        "text": "Compare it with the category: a tag can describe a test, but it cannot correct a wrongly routed intake.",
        "time": 11.1
      }
    ],
    "duration": 17.605,
    "controls": {
      "trigger": "A ticket needs a descriptive label shared across several kinds of work.",
      "stop": "If the department or classification is wrong, a tag alone will not fix it. Treat intake routing as a separate decision.",
      "evidence": "Details shows the intended tag without changing the meaning of the routing category."
    }
  },
  {
    "id": 46,
    "title": "Recover a ticket hidden by scope or filters",
    "collection": "Operations SOPs",
    "path": "sops/46-recover-a-ticket-hidden-by-scope-or-filters",
    "chapters": [
      {
        "label": "Check the queue boundary",
        "gate": "Personal vs department scope",
        "text": "When a ticket seems missing, check whether you are in My Tickets or the department queue.",
        "time": 0
      },
      {
        "label": "Reset and search",
        "gate": "Clear conditions; enter exact number",
        "text": "Move to All Tickets, clear filters and search for the exact number before assuming the record was lost.",
        "time": 5.425
      },
      {
        "label": "Verify the match",
        "gate": "Match the title, not just the row",
        "text": "Open the match and verify the title; a different queue changes what you see, not the underlying repair.",
        "time": 11.875
      }
    ],
    "duration": 18.275,
    "controls": {
      "trigger": "A known ticket is absent from the current queue.",
      "stop": "If the number still does not appear in All Tickets, check the number and your access with the appropriate lead; do not raise a duplicate on that basis.",
      "evidence": "The opened record matches the original number and title, or the visibility question is passed on explicitly."
    }
  },
  {
    "id": 47,
    "title": "Use a ticket number for a live handoff",
    "collection": "Operations SOPs",
    "path": "sops/47-use-a-ticket-number-for-a-live-handoff",
    "chapters": [
      {
        "label": "Search precisely",
        "gate": "Use the number from the handoff",
        "text": "During a live handoff, open quick search and enter the ticket number rather than an ambiguous equipment name.",
        "time": 0
      },
      {
        "label": "Read the result and header",
        "gate": "Match before discussing the case",
        "text": "Read the matching result before opening it, then compare the workspace header with the number you were given.",
        "time": 6.79
      },
      {
        "label": "Validate location and owner",
        "gate": "Studio + current owner",
        "text": "Use Details to verify the studio and owner before discussing the case.",
        "time": 12.53
      }
    ],
    "duration": 16.78,
    "controls": {
      "trigger": "A colleague hands over a specific repair number during a call.",
      "stop": "If the result has the wrong number, stop before discussing details or recording an update.",
      "evidence": "Search result, ticket header, affected studio and owner all refer to the intended case."
    }
  },
  {
    "id": 48,
    "title": "Choose the right record before documenting work",
    "collection": "Operations SOPs",
    "path": "sops/48-choose-the-right-record-before-documenting-work",
    "chapters": [
      {
        "label": "Compare before opening",
        "gate": "Read both previews",
        "text": "When two tickets look similar, select them in Split view and compare their descriptions without leaving the list.",
        "time": 0
      },
      {
        "label": "Separate asset from task",
        "gate": "Same microphone, different work",
        "text": "Distinguish the failed microphone from the separate replacement cable request; different work can share equipment and staff.",
        "time": 6.53
      },
      {
        "label": "Enter the right workspace",
        "gate": "Confirm the title before writing",
        "text": "Open the right record before adding a note so the evidence stays with the incident it describes.",
        "time": 13.44
      }
    ],
    "duration": 18.37,
    "controls": {
      "trigger": "Similar titles make it easy to put a note on the wrong record.",
      "stop": "Distinguish an equipment incident from procurement work, even when both mention the same unit.",
      "evidence": "The selected workspace describes the task the new evidence actually belongs to."
    }
  },
  {
    "id": 49,
    "title": "Bike recurrence: certify a tested pass",
    "collection": "Operations SOPs",
    "path": "sops/49-bike-recurrence-certify-a-tested-pass",
    "chapters": [
      {
        "label": "Match the original bike",
        "gate": "Verify unit and original symptom",
        "text": "For a passed bike check, start by matching the original ticket number and the reported pedal noise.",
        "time": 0
      },
      {
        "label": "Apply the pass gate",
        "gate": "Unavailable is not a pass",
        "text": "Only after the same unit has been tested should you select No recurrence; if the bike is unavailable, leave the check open.",
        "time": 5.89
      },
      {
        "label": "Check the schedule",
        "gate": "Current result vs later appointment",
        "text": "Verify the outcome on the check and open the original schedule to distinguish this result from a future appointment.",
        "time": 13.48
      }
    ],
    "duration": 19.37,
    "controls": {
      "trigger": "A due bike follow-up is ready for an observed test.",
      "stop": "No complaint is not a successful test. If the bike cannot be checked, keep the outcome pending.",
      "evidence": "The check shows No recurrence and the original schedule distinguishes this pass from later checks."
    }
  },
  {
    "id": 50,
    "title": "Microphone recurrence: reopen with diagnostic evidence",
    "collection": "Operations SOPs",
    "path": "sops/50-microphone-recurrence-reopen-with-diagnostic-evidence",
    "chapters": [
      {
        "label": "Confirm recurrence",
        "gate": "Read the original repair history",
        "text": "For a failed microphone check, read the original history before deciding whether this is the same fault.",
        "time": 0
      },
      {
        "label": "Describe the returned symptom",
        "gate": "Trigger + observation, not a guess",
        "text": "Choose Fault returned and describe the repeated symptom and the condition that triggers it; do not substitute an unverified cause.",
        "time": 6.04
      },
      {
        "label": "Route back to the repair",
        "gate": "Verify the original ticket number",
        "text": "Confirm Reopen against the original number and verify the destination instead of filing a second microphone repair.",
        "time": 13.97
      }
    ],
    "duration": 20.25,
    "controls": {
      "trigger": "A microphone exhibits the repaired fault again during a recurrence check.",
      "stop": "If the symptom or equipment differs, establish the relationship before reopening the original. Record observations rather than an assumed diagnosis.",
      "evidence": "The original repair number is reopened and the recurrence note states the unit, trigger and repeated symptom."
    }
  },
  {
    "id": 51,
    "title": "Shift sign-off: deliver an actionable case summary",
    "collection": "Operations SOPs",
    "path": "sops/51-shift-sign-off-deliver-an-actionable-case-summary",
    "chapters": [
      {
        "label": "Find the exact record",
        "gate": "Start with a durable identifier",
        "text": "Before ending a shift, test the handoff as if you were the incoming lead.",
        "time": 0
      },
      {
        "label": "Name the outstanding work",
        "gate": "Owner + state + next action",
        "text": "Open the ticket by number, verify its status and owner, and read the latest follow-up for the next action.",
        "time": 4.6
      },
      {
        "label": "State the outstanding decision",
        "gate": "Consult the rung and the reason",
        "text": "If the work is escalated, compare the current rung with its history so you can say who needs to decide what, rather than just reporting that the ticket is open.",
        "time": 10.83
      }
    ],
    "duration": 19.25,
    "controls": {
      "trigger": "A lead needs to brief another shift on open or escalated work.",
      "stop": "Do not invent an owner, decision or return time. If one is missing, say exactly what still needs confirmation.",
      "evidence": "The incoming lead can identify the ticket, current responsibility, next action and any outstanding approval."
    }
  }
];
