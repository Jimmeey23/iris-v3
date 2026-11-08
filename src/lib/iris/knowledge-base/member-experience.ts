// Knowledge Base — class experience, trainer feedback, member service and scheduling.
import { article, type KnowledgeArticle } from "./compose";

export const MEMBER_EXPERIENCE_ARTICLES: KnowledgeArticle[] = [
  article({
    id: "KB-001",
    title: "Hosted Class Feedback — Handling Member Proposals",
    category: "Class Experience",
    summary:
      "How to handle feedback on hosted / private class proposals (corporate groups, birthdays, bridal and community sessions): acknowledge fast, fix the proposal, and get the booking back on track within 3 business days.",
    glance: {
      priority: "P2 — revenue at risk, not service-critical",
      owner: "Sales & Client Servicing (with Marketing for the proposal deck)",
      respond: "Within 2 hours of the feedback",
      resolve: "Revised proposal within 3 business days",
    },
    firstFive: [
      "Thank the member for the feedback and confirm who the decision-maker is (the member, an HR contact, a planner).",
      "Open the proposal that was sent and note exactly what they objected to — price, format, timing, missing details or tone.",
      "Check whether the requested date and studio are still free before promising anything.",
    ],
    steps: [
      "Acknowledge the feedback within 2 hours by the channel they used (WhatsApp or email) and give a date for the revised proposal.",
      "Review the proposal against the checklist: group size, studio and room, format and trainer, date and time, inclusions (mats, towels, refreshments, photos), commercials with GST, payment terms and cancellation terms.",
      "List every gap or objection in the ticket so whoever revises the proposal works from facts, not memory.",
      "If the deck itself was weak (no case studies, no commercials, off-brand design), raise it with Marketing (Mitali Kumar) for a revised version.",
      "Offer the member a 15-minute call within 48 hours to agree the format, numbers and budget before re-sending.",
      "Hold the requested slot provisionally in Momence (blocked, unpublished) so the date isn't lost while the proposal is revised.",
      "Send the revised proposal within 3 business days, highlighting what changed in response to their feedback.",
      "Record the outcome (accepted, revised again, lost and why) in the hosted-class tracker and notify the Sales team.",
      "If the booking is confirmed, create the private class in Momence, collect the advance and share a confirmation with the run-of-show.",
      "After the session, ask for a testimonial or photos (with consent) to strengthen the next proposal.",
    ],
    diagnose: [
      ["Price objection", "Offer a smaller group format, an off-peak slot, or remove extras before discounting; discounts above 10% need Studio Director approval."],
      ["Proposal missing details or case studies", "Ask Marketing for the current hosted-class deck and add two relevant case studies (similar group size or industry)."],
      ["Date or studio unavailable", "Offer the two nearest alternatives at once instead of asking them to pick again."],
      ["Member embarrassed in front of their guests or HR", "Escalate to the Studio Director the same day — this is a reputation issue, not just a sale."],
    ],
    say: [
      ["Acknowledging", "Thank you for being so candid — you're right that the proposal didn't cover what you needed. I'll send a revised version by Thursday, and I'd love 15 minutes with you before then to get the details exactly right."],
      ["Re-sending", "Here's the revised proposal. Based on your feedback we've changed the format to a 45-minute session for 18 guests and included mats, towels and refreshments in one price."],
    ],
    dos: [
      "Quote all-inclusive prices with GST shown separately.",
      "Confirm numbers, timings and trainer in writing before taking an advance.",
      "Hold the slot while the proposal is being revised.",
    ],
    donts: [
      "Don't send a template proposal without the group's name, date and numbers on it.",
      "Don't offer discounts above 10% without approval.",
      "Don't let feedback sit unanswered overnight — hosted bookings go to competitors fast.",
    ],
    closeOut: [
      "Revised proposal sent and logged in the hosted-class tracker.",
      "Outcome recorded: booked, revised again or lost (with reason).",
      "Provisional Momence hold released if the booking was lost.",
    ],
    prevention:
      "Use the standard hosted-class proposal checklist (format, numbers, inclusions, commercials with GST, terms, two case studies) for every proposal, and have a second person review proposals above ₹50,000 before sending.",
    escalation:
      "Escalate to the Studio Director immediately if the member expresses embarrassment or dissatisfaction with the proposal quality, if the group is a corporate account, or if the discount requested exceeds 10%.",
    relatedTemplates: ["TPL-142", "TPL-144", "TPL-074", "TPL-076"],
    tags: ["hosted class", "private class", "corporate", "proposal", "events", "sales"],
  }),

  article({
    id: "KB-002",
    title: "Instructor Late for Class — Logging & Response",
    category: "Trainer Feedback",
    summary:
      "What to do the moment a trainer is running late: keep members informed, start the class on time where possible, log it accurately, and route repeat lateness to the Training Manager.",
    glance: {
      priority: "P2 (P0 if the trainer doesn't arrive within 15 minutes — treat as a no-show)",
      owner: "Front Desk Lead on shift → Training Manager",
      respond: "Immediately — before the scheduled start time",
      resolve: "Incident logged the same shift; pattern review monthly",
    },
    firstFive: [
      "Call the trainer (not just WhatsApp) to get a realistic arrival time.",
      "If they'll be more than 5 minutes late, tell the members in the studio now — don't let them wait in silence.",
      "Line up a cover option (a trainer on site or a standby) in case the delay grows past 10 minutes.",
    ],
    steps: [
      "Call the trainer as soon as they are not on site 15 minutes before class; note the time of the call and their ETA.",
      "If the ETA is more than 5 minutes after start, inform the members waiting and give them the expected start time.",
      "If a qualified trainer is on site, ask them to start the warm-up so the class begins on time.",
      "If the delay will exceed 10 minutes, offer members the choice to stay, move to another class today, or have the class credited back.",
      "For PowerCycle, remember late entry is only possible within 5 minutes of start, so make the call on cover early.",
      "If the trainer hasn't arrived 15 minutes after start, treat it as a no-show: arrange cover or cancel and follow the no-show protocol (KB-003).",
      "Log the incident in IRIS with trainer name, class, scheduled start, actual arrival time, members affected and the reason given.",
      "Send the incident to the Studio Operations Manager by the end of the shift.",
      "Make sure attendance and trainer payout reflect what actually happened (a class covered by someone else pays the cover trainer).",
      "If this is the trainer's 3rd late arrival in a month, escalate to the Training Manager for a formal conversation.",
    ],
    diagnose: [
      ["Trainer stuck in traffic, ETA under 10 min", "Inform members, start the warm-up with an on-site trainer if possible, log the delay."],
      ["ETA over 10 min or unknown", "Offer reschedule / credit, start cover arrangements, prepare to cancel at +15 min."],
      ["Trainer not answering calls", "Call the standby list immediately and inform the Training Manager — assume a no-show."],
      ["Class started late and ran over", "Apologise to members whose next commitments were affected; log it so scheduling buffers can be reviewed."],
    ],
    say: [
      ["Members waiting", "Thanks for your patience — your trainer is running about 8 minutes late. We'll start by 7:10 and still give you the full class. If that doesn't work for you, I can move you to the 8 am or credit the class back."],
      ["Trainer on arrival (privately)", "Glad you're here safely. Please start as soon as you can — I've let the class know. Let's have a quick word after class about what happened."],
    ],
    dos: [
      "Communicate early and give a specific new start time.",
      "Log the actual arrival time, not an estimate.",
      "Keep the conversation with the trainer private and factual.",
    ],
    donts: [
      "Don't criticise the trainer in front of members.",
      "Don't let members wait more than 5 minutes without an update.",
      "Don't forget to correct attendance and payout for covered classes.",
    ],
    closeOut: [
      "Incident logged with scheduled vs. actual times and members affected.",
      "Any credits or reschedules processed in Momence.",
      "Training Manager notified if this is a repeat (3+ in a month).",
    ],
    prevention:
      "Trainers confirm the next day's classes by 8 pm the evening before and arrive 15 minutes before class. Keep a standby trainer list per studio and format, and review punctuality in the monthly trainer review.",
    escalation:
      "If the trainer doesn't arrive within 15 minutes of class start, arrange a substitute immediately and escalate to the Training Manager as a no-show. Three late arrivals in a month go to the Training Manager for formal review.",
    relatedTemplates: ["TPL-145", "TPL-146", "TPL-070"],
    tags: ["trainer", "late", "punctuality", "class start", "cover"],
  }),

  article({
    id: "KB-003",
    title: "Instructor Late Causing Class Cancellation",
    category: "Trainer Feedback",
    summary:
      "When trainer lateness or a no-show forces a class to be cancelled: notify everyone, restore credits, recover the members' goodwill, and complete the incident and performance follow-up.",
    glance: {
      priority: "P0 — booked members are affected right now",
      owner: "Front Desk Lead on shift → Studio Operations Manager → Training Manager",
      respond: "Immediately",
      resolve: "Members notified within 15 minutes; root-cause review within 24 hours",
    },
    firstFive: [
      "Try the standby list one last time — a substitute beats a cancellation.",
      "If no cover is possible, cancel the class in Momence so credits are returned automatically.",
      "Speak to members in the studio personally before sending the broadcast.",
    ],
    steps: [
      "Confirm with the trainer (or after 15 minutes of no contact) that they cannot take the class.",
      "Call substitutes in order of seniority for that format; if one can arrive within 10 minutes, keep the class and inform members of the new start time.",
      "If no substitute is possible, cancel the class in Momence — this returns credits to package members automatically.",
      "Apologise in person to members already at the studio and offer them a place in the next suitable class today.",
      "Notify all booked members (including waitlist) by WhatsApp and email within 15 minutes of cancelling.",
      "Add a complimentary class credit for affected members as service recovery (Unlimited members: a guest pass or a complimentary add-on).",
      "Check in Momence that every member's credit was returned; fix any that weren't manually.",
      "File the incident with the Studio Operations Manager within 1 hour: trainer, class, members affected, reason, recovery offered.",
      "Hold a root-cause conversation with the trainer within 24 hours (illness, scheduling error, transport, no communication).",
      "If this is the second cancellation caused by the same trainer in a quarter, start the formal performance process with the Training Manager.",
      "Follow up with affected members within 48 hours to make sure the recovery landed well.",
    ],
    diagnose: [
      ["Substitute available within 10 minutes", "Keep the class, update the trainer in Momence and tell members about the change."],
      ["No substitute, members already in studio", "Cancel, apologise in person, rebook them into the next class and add the recovery credit."],
      ["Credits didn't return after cancelling", "Restore manually in Momence and note it on the ticket — check whether the class was deleted instead of cancelled."],
      ["Trainer gave no notice at all", "Treat as a no-show incident; Training Manager must be informed the same day."],
    ],
    say: [
      ["In person", "I'm really sorry — your trainer can't make it and we couldn't find cover in time, so we've had to cancel this class. Your credit is already back in your account, and I've added a complimentary class for the inconvenience. Can I book you into the 6 pm?"],
      ["Broadcast", "We're sorry — today's 7 am Barre 57 at Kwality House has been cancelled because the trainer is unavailable. Your class credit has been returned and we've added a complimentary class to your account. Reply here if you'd like help rebooking."],
    ],
    dos: [
      "Cancel (don't delete) the class so Momence returns credits.",
      "Include the waitlist in the notification.",
      "Offer a concrete rebooking option, not just an apology.",
    ],
    donts: [
      "Don't blame the trainer to members.",
      "Don't wait until the trainer is 30 minutes late to decide.",
      "Don't send the broadcast before members in the studio have been told in person.",
    ],
    closeOut: [
      "All booked members notified and credits verified.",
      "Recovery credits applied and noted on the ticket.",
      "Incident report filed and trainer conversation recorded.",
      "Performance process started if it's a repeat.",
    ],
    prevention:
      "Maintain a standby trainer list for each studio and format, run a 30-minute pre-class confirmation for early-morning classes, and review trainer reliability monthly.",
    escalation:
      "Escalate to the Studio Director and HR for formal performance management if the same trainer causes 2 or more cancellations in a quarter, or immediately if the trainer gave no notice.",
    relatedTemplates: ["TPL-070", "TPL-066", "TPL-140", "TPL-145"],
    tags: ["no-show", "cancellation", "trainer", "service recovery", "credits"],
  }),

  article({
    id: "KB-004",
    title: "Member Arrived Late & Denied Entry",
    category: "Class Experience",
    summary:
      "Applying the Late Entry Policy kindly and consistently: 10-minute grace for regular classes, no entry once express classes start, 5 minutes for PowerCycle (experienced riders only) — and how to recover the member's day.",
    glance: {
      priority: "P2 — complaint risk",
      owner: "Front Desk on shift → Front Desk Lead for disputes",
      respond: "In the moment, at the desk",
      resolve: "Same day (rebooking or credit decision)",
    },
    firstFive: [
      "Greet the member warmly — the goal is to keep them coming back, not to win the argument.",
      "Check the class start time and the exact arrival time.",
      "Look for a same-day alternative class before explaining the policy.",
    ],
    steps: [
      "Greet the member by name and acknowledge they rushed to get here.",
      "Confirm the class type and how late they are: regular classes allow 10 minutes, express formats (Sweat in 30 etc.) allow no entry after start, PowerCycle allows 5 minutes and only for riders with more than 10 classes.",
      "Explain the reason in one sentence: late entry without a warm-up risks injury and disrupts the class.",
      "Offer the next same-day class at any studio with space, and book it for them on the spot.",
      "If no same-day option works, follow the credit rule: package members are treated as a late cancellation unless you have a reason to waive it; Unlimited members lose nothing.",
      "If there's a genuine reason (accident, studio error, valet delay caused by us), waive the late-cancel and note why.",
      "If the member is upset, log the interaction so the Front Desk Lead can follow up.",
      "If they dispute the policy, offer a callback from the Front Desk Lead rather than debating at the desk.",
    ],
    diagnose: [
      ["Within the grace window", "Let them in quietly through the back of the room and inform the trainer."],
      ["Express class already started", "No entry — offer the next class or another format today."],
      ["Late because of a studio issue (valet, check-in queue, lift)", "Let them in if safe, or rebook with the credit restored — it's our delay, not theirs."],
      ["Repeat late arrivals", "Mention the policy kindly and suggest arriving 10 minutes early; note the pattern on their profile."],
    ],
    say: [
      ["Explaining", "I'm so sorry — the class started 12 minutes ago and for safety we can't bring anyone in without the warm-up. Let me get you into the 7:30 at Supreme HQ instead — I've got a spot right here."],
      ["When they push back", "I completely understand how frustrating that is. I'll ask our Front Desk Lead to call you today to look at this properly — is this number best?"],
    ],
    dos: [
      "Apply the same rule for everyone — consistency avoids disputes.",
      "Offer an alternative before you explain the policy.",
      "Record genuine exceptions and the reason.",
    ],
    donts: [
      "Don't interrupt the class to ask the trainer.",
      "Don't lecture or quote the policy word-for-word.",
      "Don't promise a waiver you're not authorised to give.",
    ],
    closeOut: [
      "Member rebooked or credit decision recorded in Momence.",
      "Any waiver noted with the reason.",
      "Dispute passed to the Front Desk Lead if unresolved.",
    ],
    prevention:
      "Send class reminders 2 hours before start with the late-entry rule, display the policy at reception and in the app, and open check-in 20 minutes before class to avoid queues.",
    escalation:
      "Escalate to the Studio Director immediately if the member becomes aggressive, threatens to cancel their membership, or posts about it publicly.",
    relatedTemplates: ["TPL-168", "TPL-083", "TPL-076"],
    tags: ["late entry", "policy", "denied entry", "late cancel", "front desk"],
  }),

  article({
    id: "KB-008",
    title: "Member Change/Addition of Class Time or Instructor",
    category: "Scheduling",
    summary:
      "Moving a member to a different class time, format or trainer: check capacity and the 12-hour window, rebook without losing their credit, and record preferences so the next booking is easier.",
    glance: {
      priority: "P2 — routine request",
      owner: "Front Desk / Client Servicing",
      respond: "Within 30 minutes (same day for next-day classes)",
      resolve: "At first contact where capacity allows",
    },
    firstFive: [
      "Find the member and the booking in Momence (name or phone).",
      "Check how far away the original class is — the 12-hour cancellation window decides whether a fee applies.",
      "Check the requested class's capacity and waitlist.",
    ],
    steps: [
      "Look up the member's current booking in Momence and confirm which class they want to move from and to.",
      "Check the requested class has space; if it's full, add them to the waitlist and keep the original booking until a spot is confirmed.",
      "If the original class is more than 12 hours away, cancel it and book the new class — no fee applies.",
      "If it's within 12 hours, explain that it counts as a late cancellation; apply a one-off courtesy waiver only if they have no late cancels in the last 30 days.",
      "For trainer preference requests, show the member that trainer's upcoming classes and book the one that fits.",
      "If they want a specific trainer or time regularly, note the preference in their Momence profile and suggest a recurring booking.",
      "Confirm the new booking by WhatsApp or email with date, time, studio and trainer.",
      "Unlimited members: no credit change; package members: check the credit moved with the booking.",
      "If several members ask for the same new time or trainer, raise a class timing request so Scheduling can review demand.",
    ],
    diagnose: [
      ["Requested class full", "Waitlist them and keep the original booking; tell them waitlist promotion is automatic."],
      ["Change inside 12 hours", "Late-cancel rules apply; one courtesy waiver per 30 days at the desk's discretion."],
      ["Credit didn't move", "Restore the credit manually and check the booking history for a double deduction."],
      ["Recurring booking keeps re-adding the old slot", "Cancel the recurring series, not just the single class, then create the new series."],
    ],
    say: [
      ["Moving within the window", "Done — I've moved you from the 7 am to the 6 pm with Reshma. Your credit came across, and you'll get a confirmation on WhatsApp in a minute."],
      ["Inside 12 hours", "Because the class is in 4 hours this would normally count as a late cancellation. You haven't had one recently, so I've waived it this once."],
    ],
    dos: [
      "Keep the original booking until the new spot is confirmed.",
      "Record regular preferences on the profile.",
      "Confirm in writing.",
    ],
    donts: [
      "Don't cancel first and then discover the new class is full.",
      "Don't waive late-cancel fees repeatedly for the same member.",
      "Don't override capacity to fit someone in.",
    ],
    closeOut: [
      "New booking confirmed and original cancelled (or waitlisted).",
      "Credit and any fee or waiver recorded.",
      "Preference noted if it's a regular request.",
    ],
    prevention:
      "Encourage members to change bookings themselves in the app, and publish the 12-hour window clearly in booking confirmations.",
    escalation:
      "Escalate to the Front Desk Lead if the member disputes a late-cancellation charge related to the change, or to Scheduling if repeated requests show demand for a new class time.",
    relatedTemplates: ["TPL-068", "TPL-133", "TPL-138", "TPL-067"],
    tags: ["booking", "reschedule", "class change", "trainer preference", "waitlist"],
  }),

  article({
    id: "KB-011",
    title: "Late Cancellation Policy Dispute — Member Pushback",
    category: "Customer Service and Communication",
    summary:
      "Resolving disputes about late-cancellation fees and booking blocks: verify the facts in Momence first, correct genuine errors immediately, and explain correct charges calmly with a fair goodwill option.",
    glance: {
      priority: "P2 — complaint; P1 if the member threatens to cancel or post publicly",
      owner: "Front Desk Lead → Memberships Manager",
      respond: "Within 4 hours",
      resolve: "Within 24 hours",
    },
    firstFive: [
      "Pull the member's cancellation history for the period in question.",
      "Check each cancellation time against the class start (12-hour window).",
      "Decide whether the charge or block was correct before replying.",
    ],
    steps: [
      "Review the member's cancellation history in Momence and list the specific late cancellations with timestamps.",
      "Verify the rule: 3 late cancellations within any 7 consecutive days triggers a 7-day booking block; Unlimited members may late-cancel 2 times per calendar week before the block.",
      "Check each cancellation was genuinely within 12 hours of the class start (time zone, app delays and class time changes can cause false positives).",
      "If any charge or block was applied in error, remove it immediately, refund any fee and apologise.",
      "If it was applied correctly, explain the policy with the specific dates and times — facts, not policy quotes.",
      "Offer one fair goodwill option where appropriate (e.g. lift the block early if they have no history, or convert a fee into a credit deduction).",
      "For force majeure (bandh, extreme weather, studio-side issues), waive the charge and credit the class back.",
      "If the member threatens to cancel, hand over to the Memberships Manager for a retention conversation.",
      "Log the dispute, the decision and the reason on the member's profile.",
      "If the member has disputed 3 or more times, flag the account for management review.",
    ],
    diagnose: [
      ["Cancellation was outside 12 hours", "Charge/block applied in error — reverse it now and apologise."],
      ["Class time was changed by the studio", "Not the member's fault — waive and credit back."],
      ["Genuine late cancels, first offence", "Explain with dates; consider lifting the block a few days early as goodwill."],
      ["Repeat disputer", "Hold the line politely, document thoroughly, flag for review."],
    ],
    say: [
      ["Charge was correct", "I've looked at this carefully: the cancellations were at 9:40 pm for a 7 am class, 6:15 am for 7 am, and 2 pm for 6 pm — all within the 12-hour window, which is what triggered the block. Since this is the first time, I've lifted it from tomorrow."],
      ["Charge was wrong", "You're right, and I'm sorry — the second cancellation was more than 12 hours ahead, so the block shouldn't have applied. I've removed it and refunded the fee."],
    ],
    dos: [
      "Lead with the facts from Momence.",
      "Correct our errors quickly and visibly.",
      "Record every waiver and its reason.",
    ],
    donts: [
      "Don't argue the policy before checking the data.",
      "Don't offer compensation beyond the fee itself without approval.",
      "Don't remove blocks silently — tell the member.",
    ],
    closeOut: [
      "Decision recorded with the cancellation timestamps.",
      "Any refund, credit or block change completed in Momence.",
      "Member informed in writing.",
    ],
    prevention:
      "Send the late-cancellation policy to all new members at sign-up, show the 12-hour cut-off in the app's cancel screen, and send a warning message after the 2nd late cancellation in a week.",
    escalation:
      "Escalate to the Studio Director immediately if the member threatens legal action or demands compensation beyond a class credit.",
    relatedTemplates: ["TPL-083", "TPL-169", "TPL-141"],
    tags: ["late cancellation", "dispute", "booking block", "fee waiver", "policy"],
  }),

  article({
    id: "KB-014",
    title: "Member Complaint — Class Too Crowded",
    category: "Class Experience",
    summary:
      "Handling complaints that a class was overcrowded: verify bookings against capacity, find how the oversell happened, recover the member, and fix the capacity setting or schedule.",
    glance: {
      priority: "P2 (P1 if over safe capacity on the day)",
      owner: "Studio Operations Manager",
      respond: "Within 4 hours",
      resolve: "Capacity cause fixed within 48 hours",
    },
    firstFive: [
      "Thank the member and apologise for the experience.",
      "Compare the attendance and booking count with the room's capacity in Momence.",
      "Check for manual overrides, walk-ins, and waitlist promotions on that class.",
    ],
    steps: [
      "Acknowledge the member's experience and apologise for the discomfort.",
      "Open the class in Momence: compare booked, checked-in and walk-in counts with the configured capacity and the room's real safe capacity.",
      "Identify how it happened: manual override, wrong capacity setting, waitlist auto-promotion past capacity, double-booked spots, or walk-ins added at the desk.",
      "Offer the member a complimentary class credit as service recovery.",
      "Correct the capacity setting if it's wrong; remove the ability to override if the cause was a manual override.",
      "If waitlist promotion exceeded capacity, raise it with IT as a Momence configuration issue.",
      "If the class is regularly full, propose a duplicate slot or a larger room to Scheduling.",
      "Document the complaint with class, trainer, date and the cause found.",
      "Follow up with the member on their next visit.",
    ],
    diagnose: [
      ["Booked count above room capacity", "Capacity misconfigured or overridden — fix the setting and review who overrode it."],
      ["Booked count fine but room felt packed", "Check walk-ins and late check-ins; check props layout and spacing."],
      ["Waitlist pushed numbers over capacity", "IT ticket for Momence waitlist rules; manually cap until fixed."],
      ["Same class crowded every week", "Demand issue — add a slot or move rooms."],
    ],
    say: [
      ["Recovery", "You're right — that class had more people than it should have, and that's on us. I've added a complimentary class to your account, and we've corrected the capacity so it won't happen again."],
    ],
    dos: [
      "Check the data before promising a cause.",
      "Fix the root cause, not just the complaint.",
      "Thank members for flagging safety-related issues.",
    ],
    donts: [
      "Don't override capacity without manager approval.",
      "Don't blame the member's timing or other members.",
    ],
    closeOut: [
      "Cause identified and recorded.",
      "Capacity setting corrected (if needed).",
      "Recovery credit applied.",
    ],
    prevention:
      "Set hard capacity limits per room in Momence, restrict overrides to managers, and review classes running above 90% capacity every month.",
    escalation:
      "Escalate to the Studio Director for a capacity review if there are multiple complaints about the same class within a week, or immediately if a class ran above safe capacity.",
    relatedTemplates: ["TPL-071", "TPL-136", "TPL-076"],
    tags: ["overcrowded", "capacity", "overbooking", "waitlist", "complaint"],
  }),

  article({
    id: "KB-016",
    title: "Class Cancellation — Instructor Unavailable",
    category: "Scheduling",
    summary:
      "When a trainer becomes unavailable at short notice: find a substitute in the right order, communicate the change, and only cancel as a last resort — with credits and recovery handled properly.",
    glance: {
      priority: "P1 (P0 within 2 hours of class start)",
      owner: "Scheduling / Front Desk Lead → Training Manager",
      respond: "As soon as the trainer informs us",
      resolve: "Cover confirmed or class cancelled at least 60 minutes before start",
    },
    firstFive: [
      "Confirm the class, time, format and studio affected.",
      "Start calling the substitute list for that format immediately.",
      "Decide by 60 minutes before start: covered or cancelled.",
    ],
    steps: [
      "Confirm the trainer's unavailability and reason (medical, emergency, transport, no-show).",
      "Open the substitute list for that studio and format; call in order of seniority and format certification.",
      "When a substitute agrees, update the trainer in Momence before telling members.",
      "Notify booked members about the trainer change by WhatsApp so nobody is surprised.",
      "If no substitute is found, cancel the class in Momence at least 60 minutes before start whenever possible.",
      "Notify all booked members and the waitlist about the cancellation, with rebooking suggestions.",
      "Confirm credits returned automatically for package members; Unlimited members are unaffected.",
      "Add service-recovery credits if the cancellation was within 2 hours of start.",
      "File an incident if the cause was a no-show rather than a communicated absence.",
      "Follow up with affected members within 48 hours.",
    ],
    diagnose: [
      ["Substitute found", "Update Momence first, then notify members of the change."],
      ["Partial match (different format trainer available)", "Offer a format swap only if the trainer is certified for it; tell members clearly."],
      ["No cover, more than 2 hours to class", "Cancel early to give members time to rebook."],
      ["No cover, under 2 hours", "Cancel, notify, add recovery credits, and call regulars personally."],
    ],
    say: [
      ["Trainer change", "Heads-up: tomorrow's 7 am PowerCycle at Supreme HQ will be taught by Karan instead of Rohan. Same time, same bike — see you there!"],
      ["Cancellation", "We're sorry — today's 6 pm Barre 57 is cancelled as the trainer is unwell and we couldn't arrange cover. Your credit is back in your account. There's space in the 7 pm class if you'd like it."],
    ],
    dos: [
      "Update Momence before messaging members.",
      "Use certified substitutes only.",
      "Give members a rebooking option in the same message.",
    ],
    donts: [
      "Don't cancel without trying the full substitute list.",
      "Don't swap formats without saying so.",
    ],
    closeOut: [
      "Cover confirmed in Momence or class cancelled with credits verified.",
      "Members and waitlist notified.",
      "Incident filed for no-shows.",
    ],
    prevention:
      "Maintain a standby trainer list for each studio and format, run a 4-hour pre-class confirmation with trainers, and ask trainers to request planned leave at least 7 days ahead.",
    escalation:
      "If a trainer no-shows (no communication) more than once in a quarter, escalate to the Training Manager for formal performance review.",
    relatedTemplates: ["TPL-070", "TPL-139", "TPL-140", "TPL-066"],
    tags: ["substitute", "cover", "cancellation", "trainer unavailable", "schedule"],
  }),

  article({
    id: "KB-021",
    title: "Front Desk — Handling Walk-In Inquiries",
    category: "Customer Service and Communication",
    summary:
      "Turning walk-ins into first classes: a warm greeting, a quick needs check, the right offer (newcomer 2-for-1), a short tour, and a same-day follow-up — while verifying who is entering the studio.",
    glance: {
      priority: "P3 — sales opportunity",
      owner: "Front Desk / Sales",
      respond: "Greet within 10 seconds",
      resolve: "Follow-up within 24 hours",
    },
    firstFive: [
      "Stand, smile and greet them within 10 seconds of entering.",
      "Ask what brought them in today and what they're looking for.",
      "Check today's schedule for a class they could try.",
    ],
    steps: [
      "Greet the visitor: 'Hi, welcome to Physique 57! How can I help you today?'",
      "Ask two questions: what kind of workout they enjoy, and what goal they have (strength, posture, weight, rehab, community).",
      "Recommend the format that fits (Barre 57, Cardio Barre, Strength Lab, PowerCycle) and explain it in one line.",
      "Explain the newcomer offer (2-for-1 trial) and check eligibility — first-time visitors only.",
      "If they want to try, create their Momence profile (name, phone, email), book the trial and take the waiver.",
      "Offer a 5-minute tour: studio floor, changing rooms, lockers and reception.",
      "Answer pricing questions with the current price sheet; highlight the most popular package rather than listing everything.",
      "If they're not ready, take their contact details with consent and give them a brochure or the website link.",
      "Log the walk-in with interest level (high / medium / low) and source.",
      "Follow up on WhatsApp within 24 hours with a booking link.",
    ],
    diagnose: [
      ["Wants to try today", "Book the trial, take the waiver, give them a 2-minute orientation before class."],
      ["Price-focused", "Lead with the trial offer, then the best-value package; avoid listing every plan."],
      ["Has an injury or is pregnant", "Recommend a consult with the trainer and medical clearance before booking (see KB-047)."],
      ["Asking detailed operational questions (possible competitor)", "Stay polite and general; inform the Studio Director discreetly."],
    ],
    say: [
      ["Opening", "Welcome! Have you been to a Physique 57 class before? Great — what kind of workout do you usually enjoy?"],
      ["Closing", "The first class is the best way to know — with our newcomer offer you get two classes for the price of one. Would tomorrow at 7 am or 6 pm suit you better?"],
    ],
    dos: [
      "Use their name once you have it.",
      "Offer two specific class times rather than an open question.",
      "Make sure every walk-in who enters the studio floor is registered.",
    ],
    donts: [
      "Don't hand over a brochure and stop there.",
      "Don't let unregistered visitors into the changing rooms or studio.",
    ],
    closeOut: [
      "Walk-in logged with interest level.",
      "Trial booked or follow-up scheduled.",
    ],
    prevention:
      "Train every front desk team member on the walk-in script, keep the studio tour-ready at all times, and keep price sheets current.",
    escalation:
      "If a visitor appears to be a competitor or refuses to register while trying to access the studio floor, notify the Studio Director discreetly.",
    relatedTemplates: ["TPL-122", "TPL-231"],
    tags: ["walk-in", "trial", "sales", "newcomer offer", "front desk"],
  }),

  article({
    id: "KB-022",
    title: "Trainer Performance Concern — Member Feedback",
    category: "Trainer Feedback",
    summary:
      "Capturing member feedback about a trainer properly, separating safety and conduct issues (escalate now) from coaching issues (pattern review), and closing the loop with the member.",
    glance: {
      priority: "P2 (P1 for unsafe adjustments; P0 for harassment or discrimination)",
      owner: "Training Manager (Studio Director / HR for conduct)",
      respond: "Acknowledge within 4 hours",
      resolve: "Member updated within 48 hours",
    },
    firstFive: [
      "Listen without defending the trainer and thank the member.",
      "Capture specifics: class, date, what happened, impact on the member.",
      "Decide: is this safety/conduct (escalate now) or coaching quality (log and review)?",
    ],
    steps: [
      "Listen actively and acknowledge — never dismiss or defend the trainer.",
      "Record trainer name, class, date, the specific concern, and the member's contact details.",
      "Ask clarifying questions: what exactly happened, when, and how it affected them.",
      "Don't promise an outcome — say you'll look into it and come back within 48 hours.",
      "If it involves unsafe corrections, hands-on adjustments without consent, inappropriate behaviour, harassment or discrimination, escalate immediately to the Studio Director (and HR) — do not investigate yourself.",
      "For coaching issues (cueing, music, pacing, modifications), log it in the trainer's feedback file.",
      "Check the trainer's recent feedback and class observations for patterns.",
      "If there are 3 or more similar concerns in a month, the Training Manager schedules a coaching conversation with specific examples.",
      "Consider a class observation to see the issue first-hand.",
      "Update the member within 48 hours that the feedback was reviewed and acted on (without sharing HR details).",
      "Record the resolution in the trainer's file and on the member's profile.",
    ],
    diagnose: [
      ["Unsafe cueing or a forced adjustment", "Escalate to Training Manager today; consider pausing hands-on adjustments until reviewed."],
      ["Inappropriate comments, harassment, discrimination", "Studio Director + HR immediately; follow KB-037."],
      ["Music too loud, hard to follow, too fast", "Log as coaching feedback; observation if it repeats."],
      ["Member simply prefers a different style", "Suggest trainers whose style fits; log as preference, not a concern."],
    ],
    say: [
      ["Acknowledging", "Thank you for telling me — this is exactly the feedback we need. I've written down what happened, and our Training Manager will review it. I'll update you by Thursday."],
      ["Closing the loop", "I wanted to let you know we've reviewed your feedback with the trainer and agreed specific changes. Thank you again for raising it."],
    ],
    dos: [
      "Write down the member's words, not your interpretation.",
      "Keep the conversation with the trainer private and fact-based.",
      "Close the loop with the member.",
    ],
    donts: [
      "Don't investigate harassment or safety allegations yourself.",
      "Don't share disciplinary outcomes with members.",
      "Don't tell the trainer who complained if the member asked for anonymity.",
    ],
    closeOut: [
      "Feedback logged in the trainer's file.",
      "Escalation done for any safety or conduct element.",
      "Member updated.",
    ],
    prevention:
      "Run quarterly anonymous member feedback surveys, schedule regular class observations, and train trainers on consent before hands-on adjustments.",
    escalation:
      "If feedback involves harassment, discrimination or physical safety, escalate to the Studio Director AND HR immediately. Do not investigate independently.",
    relatedTemplates: ["TPL-158", "TPL-148", "TPL-150", "TPL-160", "TPL-164"],
    tags: ["trainer", "feedback", "coaching", "conduct", "complaint"],
  }),

  article({
    id: "KB-023",
    title: "PowerCycle Class — Bike Setup & Member Onboarding",
    category: "Class Experience",
    summary:
      "Setting up a new rider on a Stages SC3 bike safely and quickly: saddle height and fore/aft, handlebar, FitLoc check, pedals and cleats, console basics, and the safety brief.",
    glance: {
      priority: "P3 — onboarding standard (P1 if a bike fault is found)",
      owner: "PowerCycle trainer / Front Desk",
      respond: "10 minutes before class",
      resolve: "Before class starts",
    },
    firstFive: [
      "Confirm the rider is new and check their bike number in Momence.",
      "Inspect the bike: pedals tight, FitLoc locked, saddle clamp tight, no noise.",
      "Set the bike up with the rider standing beside it.",
    ],
    steps: [
      "Welcome the rider and confirm it's their first PowerCycle class.",
      "Saddle height: level with the rider's hip bone when standing beside the bike; at the bottom of the pedal stroke the knee keeps a slight bend.",
      "Saddle fore/aft: with the pedal at 3 o'clock, the front of the knee sits over the pedal spindle.",
      "Handlebar: slightly above saddle height for beginners, level for experienced riders.",
      "Lock everything: the FitLoc lever pushed fully down until it clicks, saddle clamp tight, and test by pressing on bars and saddle.",
      "Feet: cleats clipped in properly, or sneakers flat with toe cages snug.",
      "Safety brief (2 minutes): push the resistance knob down to stop the flywheel, how to unclip, and that they can always sit down and reduce resistance.",
      "Console basics: cadence (RPM), power (watts) and the colour zones — first class is about form, not numbers.",
      "Late-entry rule: entry only within 5 minutes of start, and only for riders with more than 10 classes.",
      "Water bottle in the cage, towel ready, and tell them the trainer's name.",
      "After class, ask how the setup felt and note their settings on their profile for next time.",
    ],
    diagnose: [
      ["Knee pain at the front", "Saddle too low or too far forward — raise it or move it back."],
      ["Rocking hips / reaching for pedals", "Saddle too high — lower it."],
      ["Handlebar drops during class", "FitLoc not engaged or worn — take the bike out of use (TPL-194)."],
      ["Pedal clicks or feels loose", "Stop using the bike; pedal needs refitting at 42 N·m (TPL-193)."],
    ],
    say: [
      ["Safety brief", "If you ever need to stop quickly, push this red knob straight down — the wheel stops. And it's always OK to sit down and turn the resistance back."],
    ],
    dos: [
      "Check the bike before the rider gets on.",
      "Record settings on the member's profile.",
      "Encourage first-timers to keep resistance moderate.",
    ],
    donts: [
      "Don't let anyone ride a bike with a loose pedal, saddle or handlebar.",
      "Don't allow late entry for new riders.",
    ],
    closeOut: [
      "Rider set up and briefed before class.",
      "Any bike fault logged with the bike number.",
    ],
    prevention:
      "Train all PowerCycle trainers to offer setup help to new riders, keep a 'newbie' tag visible on the booking list, and inspect bikes during the opening walkthrough.",
    escalation:
      "If the rider reports pain that suggests an existing injury, advise them to stop and consult a physician before continuing. Any bike safety fault: take the bike out of service and raise a ticket immediately.",
    relatedTemplates: ["TPL-134", "TPL-194", "TPL-193", "TPL-192"],
    tags: ["powercycle", "bike setup", "onboarding", "stages sc3", "safety brief"],
  }),

  article({
    id: "KB-025",
    title: "Member Cancellation — Retention Conversation",
    category: "Customer Service and Communication",
    summary:
      "A respectful retention conversation when a member asks to cancel: find the real reason, offer the one option that fits (freeze, downgrade, transfer, schedule fix), and process the cancellation gracefully if they still want to leave.",
    glance: {
      priority: "P2 — revenue at risk",
      owner: "Memberships / Client Servicing",
      respond: "Within 4 hours of the request",
      resolve: "Within 48 hours (retained or cancelled cleanly)",
    },
    firstFive: [
      "Thank them and ask what's prompting the decision — then listen.",
      "Check their plan, end date, billing and freeze history in Momence.",
      "Pick one relevant alternative, not a menu of offers.",
    ],
    steps: [
      "Acknowledge the decision without defensiveness and ask what's prompting it.",
      "Identify the root cause: relocation, finances, dissatisfaction, injury or medical, time constraints.",
      "Relocation: offer a transfer to another P57 studio or city, or a free pause if the move is temporary.",
      "Finances: offer a downgrade, a smaller class pack, or a pause.",
      "Dissatisfaction: ask for specifics (trainer, timing, crowding, facility) and offer a concrete fix.",
      "Injury or medical: offer a medical freeze instead of cancelling (see KB-007).",
      "Time constraints: offer a lower-frequency pack or a pause until their schedule settles.",
      "If they still want to cancel, process it respectfully — no pressure, no repeated offers.",
      "Confirm the terms in writing: last billing date, access end date, any remaining credits and how to rejoin.",
      "Cancel in Momence (including auto-renewal) and send the confirmation email.",
      "Log the reason and any offer made on the profile; schedule a win-back message for 60 days later.",
    ],
    diagnose: [
      ["Moving cities", "Transfer to another studio or pause; if no studio nearby, cancel gracefully."],
      ["Unhappy with a trainer or schedule", "Fix the specific issue and offer a complimentary class to try the change."],
      ["Injured", "Medical freeze with doctor's note instead of cancellation."],
      ["Auto-renewal surprise", "Cancel the renewal now; check if a refund is due under policy (KB-018)."],
    ],
    say: [
      ["Opening", "I'm sorry to hear that — before I process anything, can I ask what's prompting the cancellation? It really helps us improve."],
      ["If they still want to leave", "Completely understood. I've cancelled your renewal — your access runs until 30 June and your remaining 3 classes stay usable until then. You're always welcome back."],
    ],
    dos: [
      "Offer one tailored alternative.",
      "Confirm cancellation terms in writing.",
      "Make rejoining easy.",
    ],
    donts: [
      "Don't make the member repeat their request multiple times.",
      "Don't leave auto-renewal active after agreeing to cancel.",
      "Don't argue with the member's reason.",
    ],
    closeOut: [
      "Outcome recorded: retained (with what) or cancelled (with reason).",
      "Auto-renewal stopped if cancelled.",
      "Confirmation sent and win-back reminder set.",
    ],
    prevention:
      "Run proactive check-ins at month 3 and month 6 of each membership, and watch for falling attendance (see KB-050) to catch dissatisfaction early.",
    escalation:
      "If cancellations exceed 5% of active members in a month, escalate to the Studio Director for a retention strategy review. Escalate individual cases to the Memberships Manager if a refund or exception is requested.",
    relatedTemplates: ["TPL-004", "TPL-015", "TPL-174", "TPL-019"],
    tags: ["cancellation", "retention", "churn", "membership", "win-back"],
  }),

  article({
    id: "KB-040",
    title: "Negative Online Review or Social Media Complaint",
    category: "Customer Service and Communication",
    summary:
      "Responding to a negative Google review, Instagram comment or DM: reply publicly within hours with empathy, move the details offline, fix the underlying issue, and only then ask whether they'd update their review.",
    glance: {
      priority: "P1 — public and visible to prospects",
      owner: "Client Servicing with Marketing (Studio Director for serious allegations)",
      respond: "Public reply within 4 business hours",
      resolve: "Issue resolved and member followed up within 72 hours",
    },
    firstFive: [
      "Screenshot the review or comment with the date and the author's handle.",
      "Find the member in Momence and check what actually happened.",
      "Decide: is it a service issue, a misunderstanding, or a serious allegation (safety, harassment)?",
    ],
    steps: [
      "Capture the review or comment (screenshot, link, date) and add it to the ticket.",
      "Identify the member and the visit in Momence; gather facts from staff on shift.",
      "Draft a public reply: thank them, apologise for the experience (not for allegations you can't verify), and invite them to continue the conversation privately.",
      "Have Marketing approve the reply if it mentions policy, pricing or a named staff member; post within 4 business hours.",
      "Contact the member privately (phone first, then WhatsApp or email) to understand and resolve the issue.",
      "Fix the underlying problem and offer proportionate recovery (credit, complimentary class, refund if warranted).",
      "If the post contains abuse, personal data or false claims about staff, ask Marketing to hide or report it rather than arguing publicly.",
      "For allegations of injury, harassment or discrimination, escalate to the Studio Director before replying publicly.",
      "After the issue is resolved, politely ask whether they'd consider updating their review — never pressure or offer incentives for it.",
      "Log the theme (cleanliness, trainer, booking, billing) so recurring issues show up in reporting.",
    ],
    diagnose: [
      ["Genuine service failure", "Apologise publicly, fix privately, offer recovery."],
      ["Misunderstanding of a policy", "Explain briefly and kindly in public; details privately."],
      ["Not a recognisable member", "Reply politely asking them to contact us so we can look into it."],
      ["Abusive, discriminatory or containing personal data", "Hide/report via Marketing and document; don't engage."],
    ],
    say: [
      ["Public reply", "Hi Priya, thank you for sharing this — it's not the experience we want anyone to have at Physique 57. We'd like to make it right; please could you WhatsApp us on our studio number or reply to our DM so we can look into it today?"],
      ["Private follow-up", "Thanks for taking my call. I've looked into what happened on Saturday and you were right about the changing room. Here's what we've done about it, and I've added a complimentary class to your account."],
    ],
    dos: [
      "Reply fast, briefly and in a warm, human tone.",
      "Take details offline.",
      "Fix the root cause and record the theme.",
    ],
    donts: [
      "Don't argue, blame or share member details publicly.",
      "Don't ask for a review update before the issue is fixed.",
      "Don't offer incentives in exchange for changing a review.",
    ],
    closeOut: [
      "Public reply posted and screenshot saved.",
      "Member contacted and outcome recorded.",
      "Root cause fixed or ticketed to the right team.",
    ],
    prevention:
      "Monitor Google reviews and social mentions daily, resolve complaints at the desk before members leave, and send a feedback request after negative experiences so issues come to us first.",
    escalation:
      "Escalate to the Studio Director before replying if the post alleges injury, harassment, discrimination or legal action, or if it is gaining traction (shares, press, influencer accounts).",
    relatedTemplates: ["TPL-167", "TPL-258", "TPL-165", "TPL-172"],
    tags: ["review", "google", "social media", "reputation", "complaint", "instagram"],
  }),

  article({
    id: "KB-041",
    title: "Waitlist & Overbooking — Fair Handling",
    category: "Scheduling",
    summary:
      "Keeping waitlists fair and classes within safe capacity: how auto-promotion works, what to do when a promotion wasn't notified or a class is overbooked on the day, and when to add capacity.",
    glance: {
      priority: "P2 (P1 if a class is over capacity on the day)",
      owner: "Front Desk Lead / Scheduling",
      respond: "Within 30 minutes (immediately on the day)",
      resolve: "Same day; capacity review weekly",
    },
    firstFive: [
      "Open the class in Momence: capacity, booked, waitlist order and promotion log.",
      "If it's today and over capacity, decide who is affected before members arrive.",
      "Check whether the member was notified of their promotion.",
    ],
    steps: [
      "Check the class capacity, bookings, waitlist order and promotion history in Momence.",
      "If a member was promoted but not notified, apologise; if they missed the class because of it, waive any no-show or late-cancel fee and restore the credit.",
      "If a class is overbooked on the day, contact the most recently booked members first and offer them the next class plus a complimentary credit.",
      "Never exceed the room's safe capacity, even for regulars; bikes, barre spots and props are fixed.",
      "If the overbooking came from a manual override or a sync problem, record it and raise an IT ticket for sync issues.",
      "For classes with a waitlist of 5+ for three weeks running, request an extra slot or a larger room from Scheduling.",
      "Keep waitlist promotion automatic; manual promotions only in waitlist order.",
      "Confirm outcomes to affected members in writing.",
    ],
    diagnose: [
      ["Promoted, not notified, no-show fee charged", "Reverse the fee, restore the credit, raise a notifications ticket (TPL-217) if systemic."],
      ["More bookings than bikes or spots", "Contact the latest bookers, rebook with a complimentary credit; investigate the cause."],
      ["Member jumped the queue", "Restore waitlist order; record who overrode it."],
      ["Waitlist consistently long", "Demand signal — request extra capacity."],
    ],
    say: [
      ["Overbooked", "I'm really sorry — because of a booking error the 7 am is over capacity. I've reserved you a bike in the 8 am and added a complimentary class. Would that work?"],
    ],
    dos: [
      "Respect waitlist order.",
      "Fix the cause, not just today's class.",
      "Waive fees caused by our notification failures.",
    ],
    donts: [
      "Don't squeeze extra people into a full room.",
      "Don't promote people manually out of order.",
    ],
    closeOut: [
      "Affected members rebooked or credited.",
      "Cause recorded (override, sync, notifications).",
      "Capacity request raised if demand is consistently high.",
    ],
    prevention:
      "Keep hard capacity limits, restrict overrides to managers, check notification delivery weekly, and review waitlist lengths every Monday.",
    escalation:
      "Escalate to IT if promotions or bookings are syncing incorrectly, and to the Studio Operations Manager if overbooking happens more than once in a week.",
    relatedTemplates: ["TPL-067", "TPL-071", "TPL-135", "TPL-136"],
    tags: ["waitlist", "overbooking", "capacity", "promotion", "momence"],
  }),

  article({
    id: "KB-047",
    title: "Pre/Post-Natal & Injury Modifications — Safe Participation",
    category: "Class Experience",
    summary:
      "Helping pregnant, post-natal and injured members train safely: medical clearance, trainer briefing, the right classes and modifications, and how to record it so every trainer knows.",
    glance: {
      priority: "P2 — member safety",
      owner: "Training Manager / trainer on the class",
      respond: "Before the member's next class",
      resolve: "Modification plan on the profile within 48 hours",
    },
    firstFive: [
      "Thank the member for telling you and ask what their doctor or physio has advised.",
      "Check whether we have medical clearance on file.",
      "Make sure the trainer of their next class knows before it starts.",
    ],
    steps: [
      "Ask about the condition, stage (trimester, weeks post-partum, type of injury) and any restrictions from their doctor or physio.",
      "Request written medical clearance for pregnancy, post-natal return (typically after the 6-week check, longer after a C-section), and significant injuries.",
      "Recommend suitable formats and suggest avoiding high-impact or intense formats until cleared.",
      "Brief the trainer before class: condition, restrictions, and the member's preference about being singled out.",
      "Trainer offers modifications discreetly: no deep twists or lying flat on the back after the first trimester; avoid loaded spinal flexion for post-natal core recovery; pain-free range only for injuries.",
      "Record the condition, clearance date and modifications on the member's Momence profile (visible to trainers), with consent.",
      "Offer a short consult with the Training Manager for complex cases.",
      "Review the plan at agreed intervals (each trimester; every 4–6 weeks for injuries).",
      "If the member reports pain, dizziness, bleeding or other warning signs, stop the exercise immediately and follow the medical emergency protocol if needed.",
    ],
    diagnose: [
      ["No medical clearance", "Ask for clearance before booking intense formats; offer gentler options meanwhile."],
      ["Member wants full intensity during pregnancy", "Respect their doctor's advice; document and keep modifications available."],
      ["Recurring injury flare-ups", "Pause the aggravating format and suggest physio review; adjust the plan."],
      ["Warning symptoms in class", "Stop, sit them down, assess; call 108 if severe (KB-038)."],
    ],
    say: [
      ["Asking for clearance", "Congratulations! To make sure we look after you properly, could you share a note from your doctor confirming you're cleared to exercise? Meanwhile, here are the classes we'd recommend."],
    ],
    dos: [
      "Record modifications where every trainer can see them.",
      "Let the member choose how visible their modifications are.",
      "Review plans regularly.",
    ],
    donts: [
      "Don't give medical advice beyond our scope.",
      "Don't announce a member's condition to the class.",
      "Don't let members train through pain.",
    ],
    closeOut: [
      "Clearance on file (or requested).",
      "Modification plan recorded on the profile.",
      "Trainers for upcoming classes briefed.",
    ],
    prevention:
      "Ask about pregnancy and injuries in the intake form, train all trainers on pre/post-natal and common injury modifications, and keep modification notes on member profiles.",
    escalation:
      "Escalate to the Training Manager for complex cases or if a member insists on training against medical advice. Any in-class warning symptoms: follow the medical emergency protocol immediately.",
    relatedTemplates: ["TPL-170", "TPL-171", "TPL-080", "TPL-149"],
    tags: ["prenatal", "postnatal", "pregnancy", "injury", "modifications", "medical clearance"],
  }),

  article({
    id: "KB-050",
    title: "At-Risk Member & NPS Detractor Recovery",
    category: "Customer Service and Communication",
    summary:
      "Spotting members likely to churn (falling attendance, detractor scores, recent complaints) and running a short, personal recovery outreach before they cancel.",
    glance: {
      priority: "P2 — retention",
      owner: "Client Servicing / Memberships",
      respond: "Within 48 hours of the trigger",
      resolve: "Outcome recorded within 7 days",
    },
    firstFive: [
      "Confirm the trigger: attendance drop, NPS 0–6, complaint, or no visits in 21 days.",
      "Read their recent history: bookings, complaints, trainer preferences, billing issues.",
      "Plan one personal, relevant message — not a generic promotion.",
    ],
    steps: [
      "Identify at-risk members weekly: attendance down 50% vs. their usual, no visit in 21 days, an NPS score of 0–6, or an unresolved complaint.",
      "Review the member's history to guess the likely reason before reaching out.",
      "Reach out personally (call first, then WhatsApp) within 48 hours — from someone they know where possible.",
      "Ask an open question about how training is going and listen for the real reason.",
      "Offer one relevant fix: a new class time, a trainer suggestion, a freeze, a format change, or resolving an open issue.",
      "For NPS detractors, thank them for the score, ask what one thing would change it, and act on it.",
      "Record the conversation, reason and agreed action on the profile.",
      "Check attendance two weeks later; follow up once more if they haven't returned.",
      "Report recurring reasons monthly so the studio can fix systemic issues.",
    ],
    diagnose: [
      ["Schedule no longer fits", "Suggest classes at their new times; offer a recurring booking."],
      ["Unresolved complaint", "Resolve it first — outreach without a fix makes it worse."],
      ["Injury or life event", "Offer a freeze rather than letting the membership drift."],
      ["Lost motivation", "Suggest a challenge, a friend pass or a new format; invite them to a community class."],
    ],
    say: [
      ["Opening call", "Hi Neha, it's Sana from Physique 57 Bandra — we've missed you in class! I wanted to check in and see how things are going, and whether there's anything we could do better."],
    ],
    dos: [
      "Make it personal and specific.",
      "Fix open issues before offering anything.",
      "Record outcomes so the team learns.",
    ],
    donts: [
      "Don't send generic discount blasts to at-risk members.",
      "Don't contact the same member more than twice in two weeks.",
    ],
    closeOut: [
      "Outreach done and outcome recorded.",
      "Agreed action completed (booking, freeze, issue fixed).",
    ],
    prevention:
      "Review the at-risk list weekly, close complaints quickly, and run check-ins at months 3 and 6 of every membership.",
    escalation:
      "Escalate to the Memberships Manager if the member requests a refund or exception, and to the Studio Director if the same reason (e.g. a trainer or cleanliness) appears in several detractor responses in a month.",
    relatedTemplates: ["TPL-174", "TPL-172", "TPL-118"],
    tags: ["retention", "nps", "detractor", "churn", "outreach"],
  }),
];
