// Knowledge Base - Trainer Feedback: timing, cueing and modifications, hands-on
// adjustments, conduct, presence, compliments and class observations.
import { article, type KnowledgeArticle } from "./compose";

export const TRAINER_FEEDBACK_GUIDES: KnowledgeArticle[] = [
  article({
    id: "KB-079",
    title: "Class Started Late or Ran Over Time",
    category: "Trainer Feedback",
    subcategory: "Punctuality & Timing",
    summary:
      "Members complain a class started late, finished late, or rushed the warm-up or cool-down to catch up. Find out why, protect members' time and safety, and coach on timing where the trainer caused it.",
    glance: {
      priority: "P2 (P3 for a one-off delay under 5 minutes)",
      owner: "Front Desk Lead → Training Manager",
      respond: "Within 1 working day",
      resolve: "Coaching conversation within 1 week",
    },
    firstFive: [
      "Note the class, trainer, and scheduled versus actual start and end times.",
      "Check for an operational cause - room turnover, the previous class overrunning, an AV fault.",
      "Thank the member and say it will be followed up.",
    ],
    steps: [
      "Get the facts: actual start and end times from check-in and the desk, and what happened before class.",
      "Operational cause (previous class overran, cleaning reset, mic failure): fix the turnover process, not the trainer.",
      "Trainer cause (arrived late, long chat before starting, ran over): log it (TPL-146) and tell the Training Manager.",
      "Rushed warm-up or cool-down (TPL-147) is a safety issue - the Training Manager reinforces the class structure.",
      "If members missed their next commitment or lost more than 10 minutes of class, consider a goodwill credit.",
      "The Training Manager reviews the trainer's punctuality record (KB-002) and agrees expectations.",
      "Tell the member what's being done.",
    ],
    diagnose: [
      ["Every class in that room starts late", "Turnover is too tight - add a buffer between classes."],
      ["One trainer often runs over", "Timing coaching; consider a visible timer."],
      ["Cool-down cut to finish on time", "Coach the trainer to trim the main set, never the cool-down."],
    ],
    say: [
      [
        "Reply",
        "Thank you for flagging that the 7 am started 8 minutes late. That's not the experience we want - we've spoken with the team about timing and passed your feedback to the Training Manager.",
      ],
    ],
    dos: ["Separate operational causes from trainer causes.", "Protect the warm-up and cool-down.", "Follow up with the member."],
    donts: ["Don't blame the trainer in front of members.", "Don't let one class eat into the next one's start."],
    closeOut: ["Cause found and fixed; trainer coached if needed.", "Member updated."],
    prevention: "Keep a 10-minute buffer between classes and a clock or timer visible to trainers in every room.",
    escalation:
      "Escalate to the Training Manager after three late starts by the same trainer in a month; lateness that cancels a class follows KB-003.",
    relatedTemplates: ["TPL-146", "TPL-147", "TPL-145"],
    tags: ["late start", "ran over", "timing", "warm-up", "cool-down", "punctuality"],
  }),

  article({
    id: "KB-080",
    title: "Unclear Cueing or Too Few Modifications",
    category: "Trainer Feedback",
    subcategory: "Coaching Quality & Cueing",
    summary:
      "Members say they couldn't follow the trainer, got too many or too few corrections, or weren't offered modifications. Gather specific feedback, observe a class, and coach against clear standards.",
    glance: {
      priority: "P3 (P2 if a member was hurt or several members complain)",
      owner: "Training Manager",
      respond: "Within 2 working days",
      resolve: "Observation and feedback within 2 weeks",
    },
    firstFive: [
      "Ask for specifics: which moves, which class, what was unclear.",
      "Check whether the member was new or injured - modifications matter most for them.",
      "Thank them and explain it will be reviewed.",
    ],
    steps: [
      "Log the feedback with specifics (TPL-148 unclear cueing, TPL-149 modifications, TPL-151 corrections).",
      "Look for patterns across classes and members for that trainer.",
      "Check that day's class list for newcomers and injured members - gaps in modifications affect them most.",
      "The Training Manager or a Master Trainer observes a class (TPL-164).",
      "Give feedback against brand standards: cue before the move, demonstrate both sides, offer an easier and a harder option, and spread corrections across the room.",
      "Agree a short development plan (shadowing, a workshop) and re-observe within 4–6 weeks.",
      "Reply to the member and invite them to try the class again.",
    ],
    diagnose: [
      ["Beginners feel lost", "More set-up cues and demonstrations; point beginners to foundation classes."],
      ["Advanced members bored", "Offer progressions alongside modifications."],
      ["One member feels singled out", "Spread corrections across the room and use positive cues."],
    ],
    say: [
      [
        "Reply",
        "Thanks for the detailed feedback - it really helps. Our Training Manager will join an upcoming class to look at cueing and modifications, and we'd love you to give it another try.",
      ],
    ],
    dos: ["Get specifics.", "Observe before judging.", "Coach against clear standards."],
    donts: ["Don't name the member to the trainer without consent.", "Don't judge a trainer on one comment."],
    closeOut: ["Observation done and feedback given.", "Development plan recorded; member updated."],
    prevention: "Observe every trainer regularly and teach cueing standards in onboarding.",
    escalation: "Escalate to the Training Manager straight away if poor cueing led to an injury, and log the injury under KB-020.",
    relatedTemplates: ["TPL-148", "TPL-149", "TPL-151"],
    tags: ["cueing", "modifications", "corrections", "coaching quality", "trainer feedback"],
  }),

  article({
    id: "KB-081",
    title: "Hands-On Adjustment Concern - Consent & Touch",
    category: "Trainer Feedback",
    subcategory: "Coaching Quality & Cueing",
    summary:
      "A member felt uncomfortable with a trainer's hands-on adjustment, or says it was too forceful or done without asking. Respond with care, take it seriously, and make consent-based touch the standard.",
    glance: {
      priority: "P1 (P0 if the member describes inappropriate or sexual touch - follow KB-037)",
      owner: "Training Manager → Studio Director (HR / Internal Committee for misconduct)",
      respond: "Within 2 hours",
      resolve: "Initial review within 2 working days",
    },
    firstFive: [
      "Listen privately, believe the member and thank them for telling you.",
      "Ask what happened, when and how it felt - don't argue or defend.",
      "If it sounds like harassment or sexual misconduct, follow KB-037 immediately.",
    ],
    steps: [
      "Record the member's account in their words (TPL-150), with the date, class and trainer.",
      "Ask what they'd like: an apology, no hands-on adjustments, a different trainer, or no contact.",
      "Add a 'no hands-on' note to their profile if they want one.",
      "The Training Manager speaks to the trainer the same day, hears their account and restates the consent standard: ask first, explain, use minimal touch, accept a no.",
      "If the adjustment caused pain or injury, log it under KB-020 and check on the member.",
      "Anything that sounds like inappropriate touch goes to the Studio Director and HR/IC - don't investigate it at desk level (TPL-158).",
      "Update the member on the action taken within 2 working days.",
    ],
    diagnose: [
      ["Too forceful but appropriate", "Coaching on technique and consent."],
      ["Touched without being asked", "Restate the consent standard; consider consent cards in class."],
      ["Touch felt sexual or targeted", "Harassment process - KB-037."],
    ],
    say: [
      [
        "Listening",
        "Thank you for telling me - you should always feel comfortable in class. I've noted what happened, I'll make sure no one adjusts you without asking, and our Training Manager will follow up with you by Thursday.",
      ],
    ],
    dos: ["Believe and support the member.", "Act the same day.", "Make consent the default."],
    donts: ["Don't defend the trainer to the member.", "Don't ask the member to confront the trainer."],
    closeOut: ["Member's preferences recorded; trainer spoken to.", "Member updated; serious cases with HR."],
    prevention:
      "Use consent cards or a 'no hands-on' token in class, and train every trainer in consent-based adjustments.",
    escalation: "Escalate to the Studio Director immediately for repeated complaints or any allegation of inappropriate touch.",
    relatedTemplates: ["TPL-150", "TPL-158"],
    tags: ["hands-on adjustment", "consent", "touch", "trainer conduct", "member safety"],
  }),

  article({
    id: "KB-082",
    title: "Trainer Behaviour Complaint - Rude or Inappropriate Conduct",
    category: "Trainer Feedback",
    subcategory: "Conduct & Professionalism",
    summary:
      "A member reports that a trainer was rude, dismissive, commented on their body or weight, or behaved unprofessionally. Take it seriously, hear both sides, act fairly and keep the member informed.",
    glance: {
      priority: "P1",
      owner: "Training Manager (Studio Director / HR for serious conduct)",
      respond: "Within 2 hours",
      resolve: "Initial outcome within 3 working days",
    },
    firstFive: [
      "Acknowledge the member's experience and apologise, without judging the trainer.",
      "Record exactly what was said or done, when, and who else was there.",
      "If it involves harassment or discrimination, follow KB-037.",
    ],
    steps: [
      "Log the complaint (TPL-158) in the member's words, with the class and any witnesses.",
      "Ask what outcome they want and whether they're happy to be named to the trainer.",
      "The Training Manager hears the trainer's account within 48 hours.",
      "Check for patterns in earlier complaints and class feedback.",
      "Decide the action: a coaching conversation, a written warning, or the HR process for serious misconduct (TPL-091).",
      "Comments about bodies or weight: retrain on brand language - talk about what the body does and feels, never how it looks.",
      "Update the member on the outcome in general terms; disciplinary details stay confidential.",
    ],
    diagnose: [
      ["Comment about weight or appearance", "Brand-language breach - coaching, and HR if repeated."],
      ["Trainer snapped at a late member", "Coach on de-escalation and revisit the late-entry policy (KB-004)."],
      ["Witnesses support a serious allegation", "HR process."],
    ],
    say: [
      [
        "Response",
        "Thank you for raising this - that's not how we want anyone to feel. Our Training Manager is looking into it and will update you by Friday.",
      ],
    ],
    dos: ["Hear both sides.", "Look for patterns.", "Update the member."],
    donts: ["Don't promise a specific disciplinary outcome.", "Don't share the trainer's personal information."],
    closeOut: ["Both accounts recorded and action decided.", "Member updated."],
    prevention: "Teach brand-language and conduct standards in onboarding, with a yearly refresher.",
    escalation: "Escalate to the Studio Director and HR for discrimination, harassment or repeated complaints.",
    relatedTemplates: ["TPL-158", "TPL-091"],
    tags: ["trainer behaviour", "rude", "unprofessional", "body shaming", "conduct", "complaint"],
  }),

  article({
    id: "KB-083",
    title: "Trainer Distracted, on Their Phone or Disengaged",
    category: "Trainer Feedback",
    subcategory: "Conduct & Professionalism",
    summary:
      "Members say a trainer used their phone in class, seemed distracted, didn't know regulars' names or taught without energy. Check the context, coach on presence standards, and follow up.",
    glance: {
      priority: "P2 (P3 for engagement-only feedback)",
      owner: "Training Manager",
      respond: "Within 2 working days",
      resolve: "Coaching within 1 week",
    },
    firstFive: [
      "Get the details: class, trainer and what happened.",
      "Check whether the phone was used for the music or class app (fine) or for personal use.",
      "Thank the member.",
    ],
    steps: [
      "Log it (TPL-160 for phone use or distraction, TPL-161 for engagement).",
      "Clarify the context: running the playlist from a phone is normal; texting or calls are not.",
      "The Training Manager discusses presence standards with the trainer: phone for music only, eyes on the room, learn regulars' names.",
      "Observe a class if reports repeat (TPL-164).",
      "Grooming or dress-code concerns (TPL-159) go into the same conversation.",
      "Agree specific expectations and follow up in 2–4 weeks.",
      "Reply to the member.",
    ],
    diagnose: [
      ["Phone used for the playlist", "Allowed - suggest setting the playlist up before class."],
      ["Trainer took a call mid-class", "A clear breach - coaching, and record it."],
      ["Trainer doesn't know regulars' names", "Encourage reviewing the class list before class."],
    ],
    say: [
      [
        "Reply",
        "Thanks for the feedback. Trainers should be fully focused on you during class - we've raised it with the instructor and we'll keep an eye on it.",
      ],
    ],
    dos: ["Check the context.", "Coach with specific expectations.", "Follow up."],
    donts: ["Don't penalise phone use for music.", "Don't ignore repeated reports."],
    closeOut: ["Coaching recorded.", "Member updated."],
    prevention: "Set presence standards - phones in aeroplane mode except for music - and have trainers review class lists before class.",
    escalation: "Escalate to the Training Manager for repeat incidents, and to HR if it continues after a written warning.",
    relatedTemplates: ["TPL-160", "TPL-161", "TPL-159"],
    tags: ["trainer phone", "distracted", "engagement", "presence", "member names", "professionalism"],
  }),

  article({
    id: "KB-084",
    title: "Trainer Compliment - Logging & Recognition",
    category: "Trainer Feedback",
    subcategory: "Recognition & Development",
    summary:
      "A member praises a trainer. Capture it in their words, pass it on quickly, recognise the trainer and, with consent, use it as a testimonial - compliments deserve the same follow-through as complaints.",
    glance: {
      priority: "P3",
      owner: "Front Desk → Training Manager (Marketing for testimonials)",
      respond: "Within 1 working day",
      resolve: "Shared with the trainer within 1 week",
    },
    firstFive: [
      "Thank the member and capture their exact words.",
      "Ask whether they're happy for it to be shared with the trainer and used publicly.",
      "Note the class and date.",
    ],
    steps: [
      "Log it (TPL-162) with the member's words, the class and the trainer.",
      "Pass it to the trainer within a week, directly or in the team chat.",
      "The Training Manager adds it to the trainer's record for reviews and recognition (TPL-095).",
      "With consent, share it with Marketing as a testimonial (TPL-078).",
      "Thank the member and invite a public review if they'd like to leave one.",
      "If it also praises other staff (desk, housekeeping), pass it to them and their manager.",
      "Count compliments per trainer each month for recognition awards.",
    ],
    diagnose: [
      ["Member doesn't want to be named", "Share it anonymously."],
      ["Compliment mentions a specific improvement", "Tell the training team what worked."],
      ["Many compliments for one class", "Feature it in member communications."],
    ],
    say: [
      [
        "Thanking the member",
        "That's lovely to hear - I'll make sure Neha knows. Would you be happy for us to share your words on our page?",
      ],
    ],
    dos: ["Capture the exact words.", "Pass it on quickly.", "Ask before using it publicly."],
    donts: ["Don't sit on compliments.", "Don't publish without consent."],
    closeOut: ["Compliment logged and shared.", "Testimonial consent recorded if given."],
    prevention: "Make sharing compliments part of weekly huddles and monthly recognition.",
    escalation: "No escalation needed; pass outstanding feedback to the Studio Director for awards.",
    relatedTemplates: ["TPL-162", "TPL-095", "TPL-078"],
    tags: ["compliment", "praise", "recognition", "testimonial", "trainer feedback"],
  }),

  article({
    id: "KB-085",
    title: "Class Observation & Audit Feedback",
    category: "Trainer Feedback",
    subcategory: "Recognition & Development",
    summary:
      "Running a class observation or audit: use the standard scorecard, give balanced feedback within 48 hours, agree a development plan and re-observe - so trainers grow and every class meets the brand format.",
    glance: {
      priority: "P3",
      owner: "Training Manager / Master Trainer",
      respond: "Schedule within 1 week of the request",
      resolve: "Feedback within 48 hours of the observation",
    },
    firstFive: [
      "Choose the class and focus areas (cueing, safety, energy, brand format).",
      "Decide whether it's announced or unannounced, per policy.",
      "Bring the standard scorecard.",
    ],
    steps: [
      "Before observing, review the trainer's recent feedback and last scorecard so you can check progress on agreed points.",
      "Observe the whole class, including warm-up and cool-down, against the scorecard (TPL-164).",
      "Check brand-format standards: structure, timing, music, cueing, modifications, safety and engagement (TPL-153).",
      "Give feedback within 48 hours: two strengths and two priorities, with specific examples.",
      "Agree a development plan - workshops, shadowing, certifications (TPL-163).",
      "File the scorecard and plan in the trainer's record.",
      "Re-observe in 4–8 weeks to check progress.",
    ],
    diagnose: [
      ["Format deviates from the brand standard", "Re-train on the format, then re-observe."],
      ["Safety gaps", "Fix before the trainer's next class."],
      ["Excellent results", "Recognise it and consider them as a mentor."],
    ],
    say: [
      [
        "Feedback",
        "Your energy and music were brilliant today. Two things to work on: cue transitions a beat earlier, and offer the easier option in the thigh series. Let's check in again in six weeks.",
      ],
    ],
    dos: ["Use the same scorecard every time.", "Balance strengths and priorities.", "Follow up."],
    donts: ["Don't give feedback in front of members.", "Don't skip the re-observation."],
    closeOut: ["Scorecard and plan recorded.", "Re-observation scheduled."],
    prevention: "Observe every trainer at least once a quarter.",
    escalation: "Escalate to the Studio Director if safety issues remain after a re-observation.",
    relatedTemplates: ["TPL-164", "TPL-163", "TPL-153"],
    tags: ["class observation", "audit", "scorecard", "trainer development", "certification"],
  }),
];
