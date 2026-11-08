// Knowledge Base — Class Experience: phones and filming, etiquette, music,
// temperature, first-timers, injury modifications and member suggestions.
import { article, type KnowledgeArticle } from "./compose";

export const CLASS_EXPERIENCE_GUIDES: KnowledgeArticle[] = [
  article({
    id: "KB-072",
    title: "Phone Use or Filming in Class — Privacy & Etiquette",
    category: "Class Experience",
    subcategory: "Arrivals, Etiquette & Privacy",
    summary:
      "A member is on their phone, filming or taking photos in class, or someone complains they were filmed. Protect other members' privacy, handle it quietly, and get footage of people who didn't consent removed.",
    glance: {
      priority: "P2 (P1 if someone was filmed without consent and it's been posted)",
      owner: "Trainer in class → Front Desk Lead → Studio Operations Manager",
      respond: "In the moment; complaints within 2 hours",
      resolve: "Same day",
    },
    firstFive: [
      "If it's happening now, the trainer quietly asks the member to put the phone away at the next transition.",
      "If someone says they were filmed, take it seriously: when, by whom, and where it was posted.",
      "Don't confront anyone in front of the class.",
    ],
    steps: [
      "In class: the trainer mentions the no-phones rule at the start; for a repeat, a quiet word at a transition, never mid-set.",
      "Filming or photos: ask the member to stop and delete footage showing other members; offer a photo at the mirror after class instead.",
      "Complaint of being filmed: record the date, class, who filmed and any link (TPL-175).",
      "If it was posted, ask the poster to remove it or crop out the complainant; Marketing can help report it to the platform (KB-095).",
      "Studio content: only Marketing-approved shoots with notices and consent forms (TPL-257) — never film members who haven't agreed.",
      "Repeated or deliberate filming of others after a warning is a conduct issue — escalate to the Studio Operations Manager.",
      "Tell the complainant what was done.",
    ],
    diagnose: [
      ["Member filming their own form", "Only after class and only if no one else is in frame."],
      ["Video posted showing other members", "Ask for removal within 24 hours; escalate if refused."],
      ["Trainer filming for social media", "Only with notice and consent — brief the trainer on TPL-257."],
    ],
    say: [
      [
        "Quiet word",
        "We keep phones away during class so everyone can relax without cameras around — you're very welcome to take a picture at the mirror after class.",
      ],
    ],
    dos: ["State the rule at the start of class.", "Handle it quietly.", "Act fast on posted content."],
    donts: ["Don't confront members in front of the class.", "Don't post studio content showing members without consent."],
    closeOut: ["Footage deleted or taken down; complainant updated.", "Repeat cases escalated."],
    prevention:
      "Put no-filming signs in studios and changing rooms, include the rule in the welcome briefing, and offer a designated photo spot.",
    escalation:
      "Escalate to the Studio Operations Manager if someone refuses to remove content, and to the Studio Director if a member's safety or privacy is seriously affected.",
    relatedTemplates: ["TPL-175", "TPL-257", "TPL-082"],
    tags: ["phone", "filming", "privacy", "photos", "etiquette", "consent"],
  }),

  article({
    id: "KB-073",
    title: "Member Hygiene or Etiquette Concern — Handling Discreetly",
    category: "Class Experience",
    subcategory: "Arrivals, Etiquette & Privacy",
    summary:
      "A member complains about another member's body odour, sweat left on equipment, strong perfume, loud talking or space-hogging. Fix the environment first, then speak privately and kindly, protecting everyone's dignity.",
    glance: {
      priority: "P3 (P2 if it's repeated or members are threatening to leave)",
      owner: "Front Desk Lead → Studio Operations Manager",
      respond: "Within 1 working day",
      resolve: "Within 1 week",
    },
    firstFive: [
      "Thank the person who raised it and promise discretion.",
      "Note the specifics — what, when, which class — without naming anyone in public.",
      "Check whether it's an environment issue (ventilation, towels, cleaning) you can fix first.",
    ],
    steps: [
      "Fix the environment first: towels for wiping equipment, sanitiser at every bike and barre, ventilation and the between-class reset (KB-104).",
      "Remind everyone of etiquette in general terms (signage, the pre-class briefing) before speaking to one person.",
      "If it continues, a senior staff member speaks privately with the member — kind, brief and focused on the shared space.",
      "Offer practical help: towel service, a locker for a fresh change, unscented products in the changing rooms.",
      "Space-hogging or loud talking: the trainer sets out spots and mats before class and asks for quiet once class starts.",
      "Never reveal who complained.",
      "Let the complainant know it's been addressed, without details about the other member.",
    ],
    diagnose: [
      ["Sweat left on bikes and mats", "A cleaning and towel issue — fix the reset and supplies."],
      ["Strong perfume bothering others", "A general scent-light reminder first, then a private word if needed."],
      ["Member upset after being spoken to", "Apologise for any embarrassment, explain it's about the shared space, and keep it private."],
    ],
    say: [
      [
        "Private word",
        "We want everyone to feel comfortable in class, so we're asking all members to wipe down bikes and keep fragrances light — I just wanted to mention it personally. Thank you so much.",
      ],
    ],
    dos: ["Fix the environment first.", "Speak privately and kindly.", "Protect the complainant's identity."],
    donts: ["Don't raise it in front of others.", "Don't make it personal or preachy."],
    closeOut: ["Environment fixed; private conversation held if needed.", "Complainant updated."],
    prevention: "Cover etiquette in the first-class briefing and keep friendly signage in studios and changing rooms.",
    escalation:
      "Escalate to the Studio Operations Manager if it continues after a private conversation; threatening behaviour follows KB-142.",
    relatedTemplates: ["TPL-176", "TPL-082", "TPL-038"],
    tags: ["hygiene", "etiquette", "body odour", "perfume", "member conduct", "discretion"],
  }),

  article({
    id: "KB-074",
    title: "Music Too Loud or Playlist Complaints",
    category: "Class Experience",
    subcategory: "Room, Music & Comfort",
    summary:
      "Members say the music is too loud, too quiet or explicit, or they can't hear the trainer over it. Measure and balance the volume, keep the mic above the music, apply the brand's music standards and give trainers consistent feedback.",
    glance: {
      priority: "P3 (P2 if the volume is painful or the trainer can't be heard)",
      owner: "Trainer → Training Manager (Facilities for system faults)",
      respond: "In class, or within 1 working day",
      resolve: "Within 1 week",
    },
    firstFive: [
      "If it's happening now, ask the trainer to lower the music at the next transition.",
      "Note the class, studio, trainer and exactly what the problem was.",
      "Check whether it's a system fault (distortion, crackling) rather than the trainer's choice.",
    ],
    steps: [
      "In class: the desk can signal the trainer to lower the volume between songs, not mid-set.",
      "Measure with a decibel app — keep PowerCycle below about 85 dB and Barre and mat lower.",
      "Trainer can't be heard: the mic should sit above the music, so rebalance mic gain and music (TPL-156); faulty mics follow KB-005.",
      "Explicit lyrics or style: remind trainers of the brand music guidelines (clean versions, tempo matched to the format).",
      "Log the feedback against the trainer and class (TPL-155) and share it at their next check-in.",
      "Mixed opinions in one class: set the volume for the room, not the loudest voice, and keep earplugs at the desk.",
      "Tell the member what's changing.",
    ],
    diagnose: [
      ["Music crackles when loud", "Speaker or amplifier fault — see KB-013."],
      ["Trainer's voice drowned out", "Mic gain too low or music too high — rebalance."],
      ["Complaints about one trainer only", "A coaching conversation through the Training Manager."],
    ],
    say: [
      [
        "Reply to a member",
        "Thanks for telling us. We've reminded the instructor of our volume guidelines and lowered the system limit, so the 7 am ride should feel much more comfortable.",
      ],
    ],
    dos: ["Measure the volume rather than guessing.", "Keep the mic above the music.", "Share feedback with trainers constructively."],
    donts: ["Don't interrupt a set to change the volume.", "Don't ignore repeated volume complaints."],
    closeOut: ["Volume or playlist adjusted and trainer briefed.", "Member updated."],
    prevention: "Set a maximum volume on each studio's amplifier and cover music standards in trainer onboarding.",
    escalation:
      "Escalate to the Training Manager if complaints continue after a coaching conversation, and to Facilities for equipment faults.",
    relatedTemplates: ["TPL-155", "TPL-156", "TPL-034"],
    tags: ["music", "volume", "playlist", "too loud", "cueing", "sound"],
  }),

  article({
    id: "KB-075",
    title: "Room Too Hot or Cold During Class",
    category: "Class Experience",
    subcategory: "Room, Music & Comfort",
    summary:
      "Members say the studio feels too hot, stuffy or cold during class. Check the real temperature, adjust settings for the format between classes, keep the class safe, and send faults to Facilities.",
    glance: {
      priority: "P2 (P1 if members feel faint or the AC has failed — see KB-006)",
      owner: "Front Desk → Facilities",
      respond: "Within 15 minutes during class",
      resolve: "Same day",
    },
    firstFive: [
      "Read the room thermometer and check the AC and fresh-air settings.",
      "Adjust the setpoint or fan between classes, or open the door at a transition if that's safe.",
      "Watch for members who look unwell — offer water and rest.",
    ],
    steps: [
      "Check against studio standards — roughly 22–24 °C for PowerCycle and Strength Lab, 24–26 °C for Barre and mat.",
      "Change setpoints and fan speed between classes; avoid big swings mid-class.",
      "Hot and stuffy with the AC running: check the fresh-air (TFA) unit and humidity (KB-109, KB-110).",
      "AC not cooling or showing an error: follow KB-006 and raise TPL-033.",
      "Too cold: raise the setpoint and point louvres away from mats and the front row.",
      "In a hot room the trainer eases intensity and adds water breaks; anyone dizzy follows KB-138.",
      "Log the complaint and readings (TPL-157); repeated issues go to Facilities for a balancing visit.",
    ],
    diagnose: [
      ["Front of the room cold, back hot", "Airflow balance — the HVAC vendor adjusts louvres and dampers."],
      ["Hot only during back-to-back classes", "The AC can't recover — add a 10-minute reset with doors open."],
      ["Thermostat fine, members still hot", "Humidity is high — check the TFA and dehumidification."],
    ],
    say: [
      [
        "In class",
        "It's warm in here today — we've turned the AC down and we'll take an extra water break. Go at your own pace.",
      ],
    ],
    dos: ["Check the thermometer before acting.", "Adjust between classes.", "Watch members for heat stress."],
    donts: ["Don't keep pushing intensity in an overheated room.", "Don't let anyone prop open fire exits."],
    closeOut: ["Temperature back in range and readings logged.", "Faults raised to Facilities."],
    prevention: "Keep a thermometer in every room, set seasonal setpoints, and service the AC before summer and the monsoon.",
    escalation: "Escalate to Facilities at once if the AC fails at peak hours; if anyone feels unwell, follow KB-138.",
    relatedTemplates: ["TPL-157", "TPL-033", "TPL-178"],
    tags: ["temperature", "too hot", "too cold", "ac", "stuffy", "comfort"],
  }),

  article({
    id: "KB-076",
    title: "First-Timer Experience — Intro Class Onboarding",
    category: "Class Experience",
    subcategory: "Beginners & Modifications",
    summary:
      "Making a first class great: book the right intro format, collect the waiver and health information, give a set-up briefing, tell the trainer, and follow up within 24 hours so newcomers come back.",
    glance: {
      priority: "P3",
      owner: "Front Desk / Sales with the trainer",
      respond: "Confirm within 2 hours of booking",
      resolve: "Follow-up within 24 hours of the class",
    },
    firstFive: [
      "Check the newcomer's booking, offer eligibility (TPL-122) and contact details.",
      "Send a pre-class message: arrive 15 minutes early, what to wear, grip socks and water.",
      "Flag the newcomer to the trainer before class.",
    ],
    steps: [
      "Recommend and book a beginner-friendly class — an intro Barre or a foundation PowerCycle ride.",
      "Send arrival details: address, parking or valet, arrival time, clothing and grip socks.",
      "On arrival, collect the waiver and health questions (injuries, pregnancy, conditions) and flag anything relevant to the trainer (TPL-080).",
      "Give a quick tour: lockers, changing rooms, water and the studio layout.",
      "PowerCycle: set up the bike with them before class (KB-023). Barre: show where to stand and which props to take.",
      "The trainer greets them by name, offers modifications and checks in after class.",
      "Within 24 hours, follow up: ask how it went and share the newcomer offer or a next-step plan.",
      "Log the feedback (TPL-078 for compliments; problems as tickets).",
    ],
    diagnose: [
      ["Newcomer left early or upset", "Call within 24 hours, ask what happened and offer another try."],
      ["Newcomer booked an advanced class", "Suggest switching to a beginner class before the day."],
      ["Health flag on the waiver", "Brief the trainer and follow KB-077 or KB-047."],
    ],
    say: [
      [
        "Follow-up",
        "Hi Priya, thanks for coming to your first Barre class yesterday! How are you feeling? Your intro offer is valid for 7 more days — shall I book your next class?",
      ],
    ],
    dos: ["Brief the trainer on every newcomer.", "Help with set-up personally.", "Follow up within 24 hours."],
    donts: ["Don't let a newcomer walk into an advanced class unprepared.", "Don't skip the waiver."],
    closeOut: ["Waiver on file and trainer briefed.", "Follow-up sent within 24 hours."],
    prevention: "Automate the pre-arrival message and track how many newcomers return, by class and trainer.",
    escalation: "Escalate to the Training Manager if newcomer feedback points to a trainer or class problem.",
    relatedTemplates: ["TPL-122", "TPL-080", "TPL-078"],
    tags: ["first timer", "newcomer", "intro class", "onboarding", "beginner", "trial class"],
  }),

  article({
    id: "KB-077",
    title: "Injury or Medical Condition — Building a Modification Plan",
    category: "Class Experience",
    subcategory: "Beginners & Modifications",
    summary:
      "A member with an injury, surgery recovery or condition such as back pain, knee problems or high blood pressure wants to keep training safely. Gather the facts, agree modifications with the Training team, share them with every trainer, and review as they recover.",
    glance: {
      priority: "P2",
      owner: "Training Manager with the member's trainers",
      respond: "Within 1 working day",
      resolve: "Plan shared within 3 working days",
    },
    firstFive: [
      "Ask what the injury or condition is, what their doctor or physio advised, and what hurts.",
      "Check whether they need medical clearance first (recent surgery, heart conditions).",
      "With their consent, note it on the profile so trainers see it.",
    ],
    steps: [
      "Record the condition, its date, any restrictions from the doctor or physio, and movements that cause pain.",
      "Recent surgery, chest pain or a heart condition: ask for written medical clearance before classes.",
      "The Training Manager drafts modifications per format — for example no deep knee bends at the barre, seated riding only, or avoiding spinal flexion.",
      "Share the plan with the trainers who teach them, and add a short note to the profile with consent (TPL-171).",
      "The trainer checks in before each class and offers the modifications without drawing attention.",
      "Review the plan every 4–6 weeks or when their doctor's advice changes.",
      "If symptoms get worse, they pause and see their doctor; offer a medical freeze (KB-007).",
    ],
    diagnose: [
      ["Pain during class", "Stop the movement, offer the modification or rest, and log it."],
      ["Trainer didn't know about the condition", "The note wasn't shared — share it and brief all their trainers."],
      ["Member won't use modifications", "Explain the risk and record the conversation."],
    ],
    say: [
      [
        "Setting it up",
        "Thanks for telling us about your knee. Our Training Manager will put together modifications for Barre and PowerCycle and share them with your instructors, so you'll have options in every class.",
      ],
    ],
    dos: ["Follow medical advice.", "Share the plan with every trainer.", "Review it regularly."],
    donts: ["Don't diagnose or prescribe treatment.", "Don't announce a member's condition in class."],
    closeOut: ["Modification plan shared and noted on the profile.", "Review date set."],
    prevention: "Ask about injuries in the waiver and at every newcomer check-in, and train trainers on common modifications.",
    escalation:
      "Escalate to the Training Manager if a trainer isn't comfortable with the plan; stop classes if clearance is missing for a high-risk condition.",
    relatedTemplates: ["TPL-171", "TPL-080", "TPL-149"],
    tags: ["injury", "modification", "medical condition", "back pain", "knee", "safe training"],
  }),

  article({
    id: "KB-078",
    title: "Member Suggestions — Closing the Feedback Loop",
    category: "Class Experience",
    subcategory: "Feedback & Hosted Classes",
    summary:
      "Members suggest a new class time, format, theme, amenity or change. Log every suggestion, route it to the owner, give an honest answer, and tell members when their idea goes live.",
    glance: {
      priority: "P3",
      owner: "Front Desk → the owning team (Scheduling, Training, Facilities, Marketing)",
      respond: "Acknowledge within 1 working day",
      resolve: "Answer within 2 weeks",
    },
    firstFive: [
      "Thank the member and write down the suggestion in their words.",
      "Ask what would make it work for them (time, frequency, studio).",
      "Tell them when they'll hear back.",
    ],
    steps: [
      "Log it (TPL-079) and tag the owner: class times to Scheduling (TPL-138), formats to Training (TPL-154), amenities to Facilities.",
      "Group similar suggestions — an idea many members share carries more weight.",
      "The owner reviews monthly against data (attendance, waitlists, capacity) and decides: yes, not now, or no.",
      "Reply to the member with the decision and the reason.",
      "If it goes ahead, tell everyone who suggested it and announce it generally.",
      "Each month, share a short 'you asked, we did' update on the app, WhatsApp and the studio board.",
      "Record decisions so the desk answers repeat questions consistently.",
    ],
    diagnose: [
      ["The same suggestion keeps coming up", "Take it to the owner with the count."],
      ["Suggestion conflicts with brand standards", "Explain politely why we can't do it."],
      ["Member feels ignored", "Apologise and give a clear answer with a date."],
    ],
    say: [
      [
        "Closing the loop",
        "You asked for a later Barre class on Thursdays — from next month there's a new 8:30 pm class at Supreme HQ. Thanks for the idea!",
      ],
    ],
    dos: ["Log every suggestion.", "Answer honestly.", "Tell members when their idea goes live."],
    donts: ["Don't promise a change before the owner decides.", "Don't let suggestions vanish without a reply."],
    closeOut: ["Suggestion logged and answered.", "Implemented ideas announced."],
    prevention: "Review suggestions monthly and share a regular 'you asked, we did' update with members.",
    escalation: "Escalate to the Studio Director when a popular suggestion needs investment or a policy change.",
    relatedTemplates: ["TPL-079", "TPL-154", "TPL-138"],
    tags: ["suggestion", "feedback", "new class", "member ideas", "you asked we did"],
  }),
];
