// Knowledge Base - Safety & Security: staff injuries, first-aid readiness,
// heat exhaustion, alarms and exits, trespassers and abusive behaviour, CCTV
// faults and footage requests, and after-hours breaches.
import { article, type KnowledgeArticle } from "./compose";

export const SAFETY_GUIDES: KnowledgeArticle[] = [
  article({
    id: "KB-136",
    title: "Staff Injury at Work",
    category: "Safety and Security",
    subcategory: "Medical & First Aid",
    summary:
      "A trainer or staff member is hurt at work - a strain while demonstrating, a fall, a cut or a lifting injury. Give first aid, get medical help if needed, cover their duties, and record it properly for insurance and prevention.",
    glance: {
      priority: "P1 (P0 for serious injuries - call 108 or 112)",
      owner: "Studio Operations Manager → HR",
      respond: "Immediately",
      resolve: "Report within 24 hours; follow-up until they're fit to return",
    },
    firstFive: [
      "Give first aid; for serious injuries call 108 or 112.",
      "Stop the activity and make the area safe.",
      "Arrange cover for their class or shift.",
    ],
    steps: [
      "Give first aid and decide: can they carry on, do they need a doctor, or an ambulance?",
      "Make the area safe (wet floor, broken equipment) and take faulty equipment out of use.",
      "Cover their class or shift (KB-067 or KB-157).",
      "Record it the same day (TPL-220): what happened, when, where, witnesses and first aid given.",
      "HR checks insurance or ESIC cover and helps with any claim (TPL-104).",
      "Agree a return-to-work plan based on medical advice, adjusting duties if needed.",
      "Find and fix the cause - equipment, flooring, training or workload.",
      "Check in with them during recovery.",
    ],
    diagnose: [
      ["Trainer strained a muscle demonstrating", "Rest and assess; teach with verbal cues for the rest of the week."],
      ["Fall on a wet floor", "Fix the hazard and review cleaning and signage."],
      ["Cut from broken equipment", "Take it out of use and replace it."],
    ],
    say: [
      [
        "To the staff member",
        "Please don't worry about your class - Riya is covering it. Let's get you checked by a doctor, and HR will help with the paperwork.",
      ],
    ],
    dos: ["Give first aid first.", "Record it the same day.", "Fix the cause."],
    donts: ["Don't let an injured trainer keep teaching.", "Don't skip the report because it seems minor."],
    closeOut: ["Report filed and insurance checked.", "Return-to-work plan agreed."],
    prevention: "Train staff in safe demonstrating and lifting, and fix hazards quickly. Member injuries follow KB-020 (TPL-077).",
    escalation: "Escalate to the Studio Director and HR for any injury that needs hospital treatment or time off.",
    relatedTemplates: ["TPL-220", "TPL-104", "TPL-077"],
    tags: ["staff injury", "workplace injury", "first aid", "insurance", "return to work"],
  }),

  article({
    id: "KB-137",
    title: "First Aid Kit & AED Checks",
    category: "Safety and Security",
    subcategory: "Medical & First Aid",
    summary:
      "Keeping first-aid kits and the AED ready to use: monthly checks, restocking after every use, battery and pad expiry dates, and a trained first-aider on every shift.",
    glance: {
      priority: "P2 (P1 if the AED isn't ready or the kit is empty)",
      owner: "Studio Operations Manager / Front Desk Lead",
      respond: "Restock within 24 hours of any use",
      resolve: "Monthly check done by the 5th of each month",
    },
    firstFive: [
      "Check the AED's status light shows it's ready.",
      "Check the first-aid kit against its contents list.",
      "Note anything expired or used.",
    ],
    steps: [
      "AED, monthly: status indicator showing ready, battery and pad expiry dates, adult pads present, and the unit clearly visible.",
      "Check every first-aid kit against the list: plasters, dressings, gloves, ice packs, antiseptic and a CPR face shield.",
      "Replace used or expired items within 24 hours of any use (TPL-221).",
      "Record each check on the log sheet with the date and your initials.",
      "Make sure at least one first-aid and CPR-trained person is on every shift, and book refreshers before certificates expire.",
      "Keep the emergency contact list and nearest hospital details posted by the desk.",
      "Run an emergency drill at least twice a year (TPL-108).",
    ],
    diagnose: [
      ["AED shows a warning", "Check the battery and pads, then call the supplier."],
      ["Ice packs used up", "Restock today."],
      ["No trained first-aider on the evening shift", "Fix the roster and book training."],
    ],
    say: [
      [
        "To the team",
        "Monthly check done: the AED is ready, I've replaced two expired dressings, and the next pad replacement is due in March.",
      ],
    ],
    dos: ["Check monthly.", "Restock after every use.", "Keep a trained first-aider on every shift."],
    donts: ["Don't lock the AED away.", "Don't ignore an AED warning."],
    closeOut: ["Check logged.", "Missing items ordered."],
    prevention: "Put expiry dates in the studio calendar and keep a spare AED battery and pads.",
    escalation: "Escalate to the Studio Operations Manager immediately if the AED isn't ready.",
    relatedTemplates: ["TPL-221", "TPL-108"],
    tags: ["first aid kit", "aed", "defibrillator", "safety checks", "cpr", "restock"],
  }),

  article({
    id: "KB-138",
    title: "Heat Exhaustion or Dehydration in Class",
    category: "Safety and Security",
    subcategory: "Medical & First Aid",
    summary:
      "A member feels dizzy, sick, faint or unusually exhausted from heat or dehydration in a hot or intense class. Stop, cool and hydrate them, watch for warning signs, and call for help if they don't improve.",
    glance: {
      priority: "P1 (P0 if they faint, become confused or stop sweating - call 108 or 112)",
      owner: "Trainer → Front Desk Lead / first-aider",
      respond: "Immediately",
      resolve: "Recovered or handed to medical care; report within 24 hours",
    },
    firstFive: [
      "Stop them exercising and help them sit or lie down somewhere cool.",
      "Give water or an electrolyte drink in small sips.",
      "Watch for warning signs - confusion, fainting, hot dry skin - and call 108 or 112 if you see them.",
    ],
    steps: [
      "Move them somewhere cooler - near the AC or outside the studio - and loosen tight clothing.",
      "Cool them with damp towels on the neck and wrists and a fan.",
      "Give sips of water or electrolytes if they're alert; nothing by mouth if they're drowsy.",
      "Stay with them and check how they are every few minutes.",
      "If they faint, become confused, vomit repeatedly or don't improve within 15–20 minutes, call 108 or 112 and follow KB-038.",
      "Don't let them drive home while still unwell - call a friend or a cab.",
      "Record it (TPL-219) and check the room temperature and class intensity (KB-075, TPL-157).",
      "Follow up with them the next day.",
    ],
    diagnose: [
      ["Dizzy but alert", "Cool, hydrate, rest and keep watching."],
      ["Confused or slurring", "Heat stroke risk - call 108 or 112."],
      ["Muscle cramps", "Rest, stretch gently and hydrate."],
    ],
    say: [
      [
        "To the member",
        "Let's take a break here where it's cooler. Sip this slowly - I'll stay with you, and we'll see how you feel in a few minutes.",
      ],
    ],
    dos: ["Stop and cool them immediately.", "Watch for warning signs.", "Follow up the next day."],
    donts: ["Don't let them go back into class the same day.", "Don't leave them alone."],
    closeOut: ["Member recovered or handed to medical care.", "Report filed and room conditions checked."],
    prevention: "Keep rooms at standard temperatures, encourage water breaks, and remind members to eat and hydrate before class.",
    escalation: "Escalate to the Studio Operations Manager for any 108 or 112 call, and to Facilities if the room was too hot.",
    relatedTemplates: ["TPL-219", "TPL-157", "TPL-077"],
    tags: ["heat exhaustion", "dehydration", "dizziness", "overheating", "first aid", "hot room"],
  }),

  article({
    id: "KB-139",
    title: "Fire Alarm or Panic Button Fault",
    category: "Safety and Security",
    subcategory: "Fire & Emergency Preparedness",
    summary:
      "A fire alarm keeps going off, the panel shows a fault, a smoke detector beeps, or a panic button doesn't work. Never assume an alarm is false - check first - then get the system fixed quickly and keep the studio protected meanwhile.",
    glance: {
      priority: "P1 (P0 at any sign of fire - evacuate per KB-009)",
      owner: "Front Desk Lead → Facilities Manager → fire safety vendor",
      respond: "Immediately",
      resolve: "Repaired within 24 hours",
    },
    firstFive: [
      "Treat every alarm as real until you've checked - look for smoke, heat or a burning smell.",
      "If in any doubt, evacuate (KB-009).",
      "Note the zone or device shown on the panel.",
    ],
    steps: [
      "Alarm sounding: check the zone shown on the panel in person; at any sign of fire, evacuate and call 101.",
      "Confirmed false alarm: silence it as the panel instructions say, and note the zone and cause (steam, dust, aerosol).",
      "Panel fault light or a beeping detector: note the code and device; never disconnect detectors.",
      "Panic button not working: test it with the security provider and set up a backup alert (phone) meanwhile.",
      "Log it (TPL-223) with the zone, code and times, and call the fire safety vendor.",
      "Check the extinguishers and other fire equipment while you're at it (TPL-044).",
      "After the repair, test the alarm and panic button with the vendor and record it.",
      "Repeated false alarms in one zone: have the detector moved or fix the cause (steam room door, aerosols).",
    ],
    diagnose: [
      ["False alarms near the steam room", "Detector placement - vendor."],
      ["Detector chirping", "Battery or end of life - replace it."],
      ["Panic button gets no response", "Test with the provider; use phone alerts meanwhile."],
    ],
    say: [
      [
        "To members after a false alarm",
        "Thanks for your patience - steam near a detector set off the alarm, and we've checked every area. It's safe to carry on.",
      ],
    ],
    dos: ["Check every alarm in person.", "Log zones and codes.", "Test after a repair."],
    donts: ["Don't disconnect detectors.", "Don't ignore panel faults."],
    closeOut: ["System repaired and tested.", "Log updated."],
    prevention: "Have the fire system serviced quarterly and run evacuation drills twice a year (TPL-108).",
    escalation: "Escalate to the Facilities Manager immediately for panel faults or a panic button that doesn't work.",
    relatedTemplates: ["TPL-223", "TPL-044", "TPL-108"],
    tags: ["fire alarm", "panic button", "smoke detector", "false alarm", "fire safety"],
  }),

  article({
    id: "KB-140",
    title: "Emergency Exit Blocked or Locked",
    category: "Safety and Security",
    subcategory: "Fire & Emergency Preparedness",
    summary:
      "An emergency exit or escape route is blocked by boxes, bikes or furniture, locked during opening hours, or its sign or light is out. Clear it immediately - it's a life-safety issue - then find out why it happened.",
    glance: {
      priority: "P0 - clear it now",
      owner: "Whoever finds it → Front Desk Lead → Facilities Manager",
      respond: "Immediately",
      resolve: "Cleared immediately; cause fixed within 24 hours",
    },
    firstFive: [
      "Clear the obstruction or unlock the door now.",
      "Check the exit sign and emergency light work.",
      "Walk the route all the way outside.",
    ],
    steps: [
      "Clear or unlock the exit straight away, getting help for heavy items.",
      "Walk the whole route to the outside and make sure it's clear.",
      "Check exit signs and emergency lights, and report any fault (TPL-044).",
      "Log it (TPL-222) with photos, what was blocking it and who was told.",
      "Find out why: no storage space, deliveries left in the corridor, or a door locked for security.",
      "Fix the cause - storage, delivery rules, or proper panic hardware instead of locks.",
      "Add exit checks to the opening and closing checklist (KB-159).",
    ],
    diagnose: [
      ["Deliveries left in the corridor", "Set a delivery drop-off rule and find storage."],
      ["Exit locked to prevent theft", "Use panic hardware or an alarm - never a lock."],
      ["Exit light not working", "Repair or replace it today."],
    ],
    say: [["To the team", "Please keep the back corridor clear - it's our fire exit. Boxes go straight to the storeroom."]],
    dos: ["Clear it immediately.", "Check the whole route.", "Fix the cause."],
    donts: ["Don't lock exits during opening hours.", "Don't store anything on escape routes."],
    closeOut: ["Exit clear and signs working.", "Cause fixed and checklist updated."],
    prevention: "Check exits at every opening and closing, and keep storage well away from escape routes.",
    escalation: "Escalate to the Facilities Manager and Studio Director for repeated blockages or locked exits.",
    relatedTemplates: ["TPL-222", "TPL-044"],
    tags: ["emergency exit", "fire exit", "blocked exit", "life safety", "escape route"],
  }),

  article({
    id: "KB-141",
    title: "Suspicious Individual or Trespasser at the Studio",
    category: "Safety and Security",
    subcategory: "Personal Safety & Conduct",
    summary:
      "Someone without a booking is loitering, trying to get into staff or changing areas, following members, or refusing to leave. Stay calm, keep members safe, ask politely, and call building security or the police if needed.",
    glance: {
      priority: "P1 (P0 if anyone is threatened - call 112)",
      owner: "Front Desk Lead → Studio Operations Manager → building security / police",
      respond: "Immediately",
      resolve: "Resolved the same day; report within 24 hours",
    },
    firstFive: [
      "Approach politely and ask if you can help - don't confront.",
      "Keep members away from the person and keep changing areas secure.",
      "Alert a colleague and building security.",
    ],
    steps: [
      "Politely ask who they are and whether they have a booking (TPL-231 for unverified walk-ins).",
      "If they have no reason to be there, ask them to leave and offer to help at the desk instead.",
      "If they refuse or turn aggressive, don't argue - call building security, and 112 if anyone is in danger.",
      "Keep members and staff away, and secure changing rooms and staff areas.",
      "Note a description: appearance, clothing, which way they went, any vehicle.",
      "Log it (TPL-230) and save the CCTV footage (TPL-224).",
      "Warn the other studios and the building if relevant, and check on any members affected.",
    ],
    diagnose: [
      ["Walk-in wants to 'look around'", "Accompany them, and check ID if they want a trial."],
      ["Someone is following a member", "Keep the member inside, call security and offer an escort."],
      ["Photographers outside for a VIP", "See KB-090 and use a discreet exit."],
    ],
    say: [
      [
        "At the entrance",
        "Hi, can I help you? This area is for members with bookings - I'm happy to tell you about classes at the front desk.",
      ],
    ],
    dos: ["Stay calm and polite.", "Protect members first.", "Save the footage."],
    donts: ["Don't physically remove anyone.", "Don't leave members alone with the person."],
    closeOut: ["Report filed and footage saved.", "Affected members checked on."],
    prevention: "Keep entrances visible from the desk, check bookings at entry, and keep building security's number to hand.",
    escalation: "Escalate to the Studio Operations Manager immediately, and to the police for threats or repeat visits.",
    relatedTemplates: ["TPL-230", "TPL-231", "TPL-224"],
    tags: ["suspicious person", "trespasser", "security", "loitering", "intruder", "safety"],
  }),

  article({
    id: "KB-142",
    title: "Threatening or Abusive Member Behaviour",
    category: "Safety and Security",
    subcategory: "Personal Safety & Conduct",
    summary:
      "A member shouts, swears, threatens, or physically intimidates staff or other members. Stay safe, set a clear boundary, get help, and record it - staff never have to put up with abuse.",
    glance: {
      priority: "P1 (P0 for violence or a threat of violence - call 112)",
      owner: "Front Desk Lead → Studio Operations Manager → Studio Director",
      respond: "Immediately",
      resolve: "Decision on membership action within 3 working days",
    },
    firstFive: [
      "Stay calm, keep a safe distance and don't argue back.",
      "Get a colleague or manager to join you.",
      "If anyone is in danger, call 112 and move people away.",
    ],
    steps: [
      "Set a calm boundary: 'I want to help, but I can't continue while you're shouting.'",
      "If it continues, end the conversation and ask them to leave; a manager takes over.",
      "Violence or threats: move others away and call 112 and building security.",
      "Record exactly what was said and done, with witnesses (TPL-082; harassment goes on TPL-229 and follows KB-037).",
      "Save the CCTV footage (TPL-224).",
      "Check on the staff member affected and offer time out and support.",
      "The Studio Director decides the action - a warning, suspension, or ending the membership with a pro-rata refund under the terms.",
      "Note it on the member's profile so every studio knows.",
    ],
    diagnose: [
      ["Raised voice over a fee", "De-escalate (KB-088) and bring in a manager."],
      ["Threats or slurs", "End the interaction, record it, and leave the decision to the manager."],
      ["Physical contact", "Call 112 and security, and save the footage."],
    ],
    say: [
      [
        "Setting a boundary",
        "I want to help sort this out, but I can't continue while you're speaking to me like this. Let's take a minute, and my manager will join us.",
      ],
    ],
    dos: ["Put safety first.", "Record everything.", "Support the staff member."],
    donts: ["Don't argue back or match their tone.", "Don't handle a threat alone."],
    closeOut: ["Incident recorded and footage saved.", "Decision made and communicated."],
    prevention:
      "Train staff in de-escalation, make the conduct policy part of the membership terms, and display it at the desk.",
    escalation: "Escalate to the Studio Director for any threat or violence, and to the police where needed.",
    relatedTemplates: ["TPL-082", "TPL-229", "TPL-224"],
    tags: ["abusive member", "threatening behaviour", "aggression", "staff safety", "conduct", "violence"],
  }),

  article({
    id: "KB-143",
    title: "CCTV Camera Offline or Not Recording",
    category: "Safety and Security",
    subcategory: "CCTV, Access & Data Security",
    summary:
      "One or more CCTV cameras are offline, the recorder isn't recording, or footage is missing. Restore recording quickly - gaps leave the studio exposed - and check storage and retention.",
    glance: {
      priority: "P2 (P1 if every camera or the recorder is down)",
      owner: "Front Desk Lead → Facilities / IT → CCTV vendor",
      respond: "Within 2 hours",
      resolve: "Within 24 hours",
    },
    firstFive: [
      "Check which cameras are offline on the monitor or app.",
      "Check the recorder (NVR/DVR) is on and shows it's recording.",
      "Check power and network to the recorder.",
    ],
    steps: [
      "List the offline cameras - is it one camera, a group, or all of them?",
      "One camera: check its power (PoE switch port or adapter) and cable, and restart it if you can.",
      "All cameras: check the recorder's power, network connection and hard-disk status.",
      "Recorder not recording: check the disk isn't full or failed and the recording schedule is on.",
      "Log it (TPL-059) with the camera list and times; network faults go on TPL-049.",
      "Call the CCTV vendor if the basic checks don't fix it.",
      "After the fix, confirm every camera records and retention meets policy (e.g. 30 days).",
    ],
    diagnose: [
      ["One camera shows black", "Power or cable - check its PoE port."],
      ["Recorder shows 'HDD error'", "Disk failed or full - vendor."],
      ["Can't view remotely", "Network or app - IT."],
    ],
    say: [
      [
        "To the manager",
        "Cameras 3 and 4 went offline at 2 pm because the PoE switch lost power. They're back up and recording - the vendor will check the switch tomorrow.",
      ],
    ],
    dos: ["Check recording daily.", "Note the gap times.", "Test every camera after a fix."],
    donts: ["Don't unplug the recorder to 'reset' it without approval.", "Don't leave gaps unreported."],
    closeOut: ["All cameras recording and retention checked.", "Gap times recorded."],
    prevention: "Check camera status at opening every day and have the system serviced yearly.",
    escalation:
      "Escalate to the Facilities Manager if the recorder is down for over 24 hours or footage is needed for an incident (KB-144).",
    relatedTemplates: ["TPL-059", "TPL-049"],
    tags: ["cctv", "camera offline", "nvr", "recording", "security cameras"],
  }),

  article({
    id: "KB-144",
    title: "CCTV Footage Requests - Who Can See It and How",
    category: "Safety and Security",
    subcategory: "CCTV, Access & Data Security",
    summary:
      "A member, staff member, the police or an insurer asks for CCTV footage. Save it before it's overwritten, check who's allowed to see it, protect other people's privacy, and record every release.",
    glance: {
      priority: "P2 (P1 if the footage will be overwritten within 48 hours)",
      owner: "Studio Operations Manager (Legal / Data Protection lead for releases)",
      respond: "Within 24 hours - save the footage first",
      resolve: "Within 5 working days",
    },
    firstFive: [
      "Note the camera, date and time range requested.",
      "Export that footage now so it isn't overwritten.",
      "Ask why it's needed and who's asking.",
    ],
    steps: [
      "Export and store the clip securely (TPL-224) with the camera, date, time and a reference number.",
      "Members may view footage of an incident involving them with a manager present; copies need approval.",
      "Police: release it against a written request from the officer, with their name and station, and record it.",
      "Insurers or lawyers: release only with approval from Legal or the data protection lead.",
      "Blur or crop other people out where possible before sharing.",
      "Log every viewing and release - who, when, why and what was shared.",
      "For thefts and incidents, link the footage to the incident report (KB-147, TPL-226).",
    ],
    diagnose: [
      ["Member wants a copy for a locker theft", "View it with a manager; share it with the police on request."],
      ["Footage already overwritten", "Explain honestly and review the retention period."],
      ["Staff member wants footage of a colleague", "Only within a formal HR process, with approval."],
    ],
    say: [
      [
        "To the member",
        "I've saved the footage from 6 to 7 pm so it won't be overwritten. You can view it with our manager tomorrow, and we'll share it directly with the police if you file a report.",
      ],
    ],
    dos: ["Save footage quickly.", "Check authorisation.", "Log every release."],
    donts: ["Don't send footage over WhatsApp.", "Don't show footage to anyone without approval."],
    closeOut: ["Footage saved and release logged.", "Requester informed."],
    prevention: "Use a footage request form, and keep a retention period long enough for typical reporting delays.",
    escalation: "Escalate to Legal or the data protection lead for any external request other than the police.",
    relatedTemplates: ["TPL-224", "TPL-226"],
    tags: ["cctv footage", "footage request", "police", "privacy", "evidence"],
  }),

  article({
    id: "KB-145",
    title: "Studio Left Unlocked or After-Hours Breach",
    category: "Safety and Security",
    subcategory: "CCTV, Access & Data Security",
    summary:
      "The studio was found unlocked in the morning, the alarm went off after hours, or there are signs someone got in. Check it safely, secure it, look for loss or damage, and fix the closing process.",
    glance: {
      priority: "P1 (P0 if someone may still be inside - call 112)",
      owner: "Opening staff → Studio Operations Manager → security / police",
      respond: "Immediately",
      resolve: "Secured immediately; review within 2 working days",
    },
    firstFive: [
      "If you think someone is inside, don't go in - call 112 and building security.",
      "Otherwise, check the studio with a colleague.",
      "Photograph anything out of place before touching it.",
    ],
    steps: [
      "Check the studio with a colleague: doors, windows, cash, boutique stock, devices and equipment.",
      "If anything is missing or damaged, leave it untouched, call the police and save the CCTV footage (KB-144).",
      "Secure the studio: lock up, change access codes and collect spare keys if needed (TPL-106).",
      "Log it (TPL-225) with times, photos and what you found.",
      "Check the closing checklist and footage to see who closed and what happened (TPL-238).",
      "Fix the cause - a missed step, a faulty lock or alarm, or too many people holding keys.",
      "Remind every closer of the lock-up checklist and sign-off.",
    ],
    diagnose: [
      ["Door unlocked, nothing missing", "Closing checklist missed - retrain and add a sign-off."],
      ["Alarm triggered overnight", "Check the footage and reset the alarm with the provider."],
      ["Cash or stock missing", "Police report, footage and the insurer."],
    ],
    say: [
      [
        "To the manager",
        "Kwality House was unlocked when I arrived at 6. I checked it with Raj - nothing is missing, the cash is intact, and I've saved last night's footage.",
      ],
    ],
    dos: ["Check with a colleague.", "Save the footage.", "Fix the closing process."],
    donts: ["Don't go in alone if someone may be inside.", "Don't move anything before photographing it."],
    closeOut: ["Studio secured and report filed.", "Closing checklist updated."],
    prevention: "Use a signed closing checklist and an alarm with alerts, and limit who holds keys.",
    escalation: "Escalate to the Studio Operations Manager immediately, and to the police for any theft or damage.",
    relatedTemplates: ["TPL-225", "TPL-106", "TPL-238"],
    tags: ["unlocked studio", "after hours", "break-in", "security breach", "closing", "alarm"],
  }),
];
