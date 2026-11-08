// Knowledge Base - emergencies, injuries, harassment, theft, closures and data security.
import { article, type KnowledgeArticle } from "./compose";

export const SAFETY_SECURITY_ARTICLES: KnowledgeArticle[] = [
  article({
    id: "KB-009",
    title: "Studio Emergency Protocol",
    category: "Safety and Security",
    summary:
      "The first-response protocol for any studio emergency - medical, fire, security threat or electrical - with the numbers to call, who does what, and the reporting that must follow.",
    glance: {
      priority: "P0 - always",
      owner: "Senior staff member on site → Studio Director",
      respond: "Immediately",
      resolve: "Incident report within 24 hours; team debrief within 48 hours",
    },
    firstFive: [
      "Make sure you are safe, then assess what kind of emergency it is.",
      "Call for help early: 112 (all emergencies), 108 (ambulance), 101 (fire), 100 (police).",
      "Assign one person to meet emergency services at the building entrance.",
    ],
    steps: [
      "ASSESS: what is happening, is anyone in immediate danger, and is it safe to approach?",
      "MEDICAL: call 108 or 112, start first aid, fetch the first aid kit (and AED if available), and send someone to wait at the entrance for the ambulance (see KB-038).",
      "FIRE or SMOKE: raise the alarm, evacuate everyone by the nearest safe exit (no lifts), call 101, and gather at the assembly point.",
      "SECURITY THREAT: keep members away from the entrance, lock the studio door if safe, call 100, and do not confront the person.",
      "ELECTRICAL (sparks, burning smell, shock): switch off the main supply only if safe, keep everyone away, and don't touch a person who is still in contact with electricity.",
      "Account for everyone at the assembly point using the Momence class list and the staff roster.",
      "Notify the Studio Director and Operations Manager as soon as the immediate response is under way.",
      "Don't let anyone re-enter until emergency services or the building declare it safe.",
      "Write down the timeline while it's fresh: times, people involved, actions taken, services called.",
      "Complete the incident report within 24 hours, including any injuries.",
      "Contact affected members within 24 hours to check on their wellbeing.",
      "Hold a team debrief within 48 hours and agree improvements.",
    ],
    diagnose: [
      ["Unresponsive person", "Call 108/112, check breathing, start CPR if trained, use the AED."],
      ["Smoke smell, no visible fire", "Find the source safely; switch off suspect equipment; evacuate if unsure."],
      ["Aggressive person at the entrance", "Keep distance and members away; call 100; don't argue."],
      ["Gas smell", "No switches or flames; open windows; evacuate; call the building and the gas emergency line."],
    ],
    say: [
      ["Evacuation", "Everyone, please stop and follow me to the exit now - leave your belongings. We're going to the assembly point outside the main gate."],
      ["Calling emergency services", "This is Physique 57, Supreme HQ, Bandra - first floor. A member has collapsed and isn't responding. Our staff member will meet you at the main entrance."],
    ],
    dos: [
      "Know the exits, assembly point, first aid kit, AED and fire extinguisher locations.",
      "Call emergency services early - you can always cancel.",
      "Keep a record of the timeline.",
    ],
    donts: [
      "Don't use lifts during a fire.",
      "Don't move an injured person unless they're in immediate danger.",
      "Don't post or share anything about the incident on social media.",
    ],
    closeOut: [
      "Incident report submitted within 24 hours.",
      "Studio Director informed (India Director within 1 hour for serious incidents).",
      "Member wellbeing follow-ups done.",
      "Debrief held and actions assigned.",
    ],
    prevention:
      "Run emergency drills quarterly, brief new staff on exits, kit locations and emergency numbers in their first shift, check fire equipment monthly, and keep exits clear at all times.",
    escalation:
      "ALL emergencies are escalated to the Studio Director immediately. Serious incidents (hospitalisation, fire, police involvement) require India Director notification within 1 hour.",
    relatedTemplates: ["TPL-219", "TPL-077", "TPL-223", "TPL-222", "TPL-108"],
    tags: ["emergency", "fire", "medical", "evacuation", "security", "112"],
  }),

  article({
    id: "KB-012",
    title: "Valet Car Damage Incident",
    category: "Theft and Lost Items",
    summary:
      "When a member reports damage to (or items missing from) their car after valet parking: document properly, involve the valet company and their insurance, and look after the member throughout.",
    glance: {
      priority: "P1 - high member impact",
      owner: "Studio Operations Manager → valet company",
      respond: "Immediately, while the member is on site",
      resolve: "Valet company response within 48 hours",
    },
    firstFive: [
      "Express genuine concern and stay with the member.",
      "Photograph the damage with the member present.",
      "Identify the valet on duty and the parking ticket number.",
    ],
    steps: [
      "Acknowledge the incident and express concern - don't argue about whether it happened here.",
      "Photograph the damage together with the member: close-ups and a wide shot with the number plate.",
      "Record the date, time of handover and return, parking ticket number, valet on duty and parking location.",
      "Ask the valet supervisor for their account and check any CCTV covering the drop-off and parking area.",
      "File an incident report within 1 hour and notify the Studio Operations Manager and the valet company.",
      "Give the member the valet company's incident and insurance contact, and a reference number.",
      "Offer a complimentary class as a goodwill gesture (this is not an admission of liability).",
      "Follow up within 24 hours and again after the valet company responds.",
      "Review valet staffing at that time - a single valet covering a busy class change-over is a risk; raise it with management.",
      "Log the incident and inform the insurance team if the studio may be liable.",
    ],
    diagnose: [
      ["Clear damage visible on CCTV", "Share footage with the valet company (with management approval)."],
      ["Items missing from the car", "Treat as theft - police complaint advised; follow the same evidence steps (TPL-228)."],
      ["Damage noticed days later", "Still log it; check the handover photos if the valet takes them."],
      ["Repeat incidents with the same vendor", "Escalate the contract review to the Studio Director."],
    ],
    say: [
      ["With the member", "I'm really sorry this happened. Let's take photos together now and I'll get the valet supervisor over. I'll make sure the valet company contacts you today, and I'll personally follow up tomorrow."],
    ],
    dos: [
      "Document with the member present.",
      "Keep the member updated until it's closed.",
      "Preserve the CCTV footage immediately.",
    ],
    donts: [
      "Don't admit liability or promise compensation on the spot.",
      "Don't share CCTV footage without management approval.",
    ],
    closeOut: [
      "Incident report filed with photos and ticket number.",
      "Valet company response recorded.",
      "Member informed of the outcome.",
    ],
    prevention:
      "Require the valet company to photograph cars at handover, keep adequate valet staffing at class change-overs, review the valet service quarterly, and post the valet terms at the drop-off point.",
    escalation:
      "If the member demands compensation, threatens legal action, or the valet company doesn't respond within 48 hours, escalate to the Studio Director (and legal if needed).",
    relatedTemplates: ["TPL-228", "TPL-224", "TPL-104"],
    tags: ["valet", "car damage", "parking", "incident", "insurance"],
  }),

  article({
    id: "KB-015",
    title: "Lost Item - Member's Personal Belonging",
    category: "Theft and Lost Items",
    summary:
      "Finding and returning lost items: a quick search of likely spots, a proper lost-and-found log, CCTV checks for valuables, and clear updates to the member.",
    glance: {
      priority: "P3 (P1 if high-value or likely stolen)",
      owner: "Front Desk → Studio Operations Manager for valuables",
      respond: "Within 30 minutes",
      resolve: "Update to the member within 24 hours",
    },
    firstFive: [
      "Get the item description, where and when it was last seen.",
      "Check the locker they used, under benches, the studio floor and the lost-and-found bin.",
      "Ask the trainer and housekeeping if anything was handed in.",
    ],
    steps: [
      "Gather details: item, colour or brand, distinctive marks, last-seen location and time.",
      "Check the member's locker (items fall behind or under), benches, the studio floor, cubbies and the lost-and-found bin.",
      "Ask the trainer, housekeeping and the next class's members if anything was found.",
      "Log the report in the lost-and-found register with the member's contact details.",
      "For valuables (jewellery, phones, wallets, watches), review CCTV of the locker and cubby area for the time window - front desk lead or manager only.",
      "If footage shows someone else taking the item, escalate to the Studio Director - treat it as theft (TPL-226).",
      "Update the member within 24 hours whether it's found or not.",
      "Return found items only after verifying ownership (description or proof); record who collected it.",
      "Keep unclaimed items for 30 days, then donate or dispose of them per policy (valuables go to the manager).",
    ],
    diagnose: [
      ["Item found in lost-and-found", "Verify ownership and hand it back; record the collection."],
      ["Valuable item, not found", "CCTV review; inform the manager; advise a police complaint if stolen."],
      ["Locker was left open", "Remind the member gently about locks; still search and log."],
      ["Several items missing the same day", "Possible theft pattern - escalate immediately."],
    ],
    say: [
      ["Not found yet", "We've checked the lockers, the studio and our lost-and-found and logged everything. I'll review the camera footage for the locker area and update you by tomorrow afternoon."],
    ],
    dos: [
      "Log every report, even small items.",
      "Verify ownership before returning.",
      "Update the member even when there's no news.",
    ],
    donts: [
      "Don't show CCTV to members directly.",
      "Don't accuse anyone based on assumptions.",
    ],
    closeOut: [
      "Item returned (with signature) or member informed it wasn't found.",
      "CCTV outcome recorded for valuables.",
    ],
    prevention:
      "Remind members to lock lockers and keep valuables at the desk, provide a valuables tray at reception, and keep lockers in good working order.",
    escalation:
      "If the item is high-value (over ₹10,000) or appears stolen, escalate to the Studio Director and review CCTV with management.",
    relatedTemplates: ["TPL-081", "TPL-224", "TPL-226"],
    tags: ["lost item", "lost and found", "belongings", "cctv", "locker"],
  }),

  article({
    id: "KB-020",
    title: "First Aid Incident - Member Injury During Class",
    category: "Safety and Security",
    summary:
      "Responding when a member is hurt in class: stop, assess, give the right first aid or call an ambulance, document properly, and follow up with care.",
    glance: {
      priority: "P0 for major injuries; P1 for minor injuries needing first aid",
      owner: "Trainer and senior staff on site → Studio Director",
      respond: "Immediately",
      resolve: "Incident report within 24 hours; member follow-up within 24 hours",
    },
    firstFive: [
      "Stop the exercise and make the area safe.",
      "Assess: minor (cut, bruise, cramp) or major (suspected fracture, head injury, severe pain, unconsciousness)?",
      "Major: call 108 / 112 immediately and don't move the member.",
    ],
    steps: [
      "Stop the class activity around the injured member and ensure they're safe.",
      "Assess the injury and ask what happened and where it hurts.",
      "Minor injuries: clean and dress cuts, apply an ice pack for sprains (wrapped, 15–20 minutes), and rest with the injured limb raised.",
      "Major injuries: call 108 / 112 immediately; don't move the member if a head, neck or spine injury is suspected; keep them warm and still.",
      "Send someone to the entrance to guide the ambulance.",
      "Let the rest of the class continue only if it's safe and appropriate; otherwise pause it.",
      "Notify the Studio Director and Operations Manager.",
      "Contact the member's emergency contact if they ask, or if they can't communicate.",
      "Document the incident: time, class, trainer, what happened, first aid given, witnesses.",
      "Photograph any equipment involved and take it out of use if it contributed.",
      "Complete the formal incident report within 24 hours.",
      "Follow up with the member within 24 hours and before their next class (medical clearance if needed).",
    ],
    diagnose: [
      ["Head injury, even if they feel fine", "No more exercise today; watch for confusion, vomiting or headache; advise medical review."],
      ["Ankle or knee twisted, can't bear weight", "Ice, elevate, no weight-bearing; medical review for a possible fracture."],
      ["Cramp", "Stop, gentle stretch, hydrate; monitor."],
      ["Equipment caused the injury", "Take it out of service and raise an equipment ticket."],
    ],
    say: [
      ["To the member", "Stay still for me - help is right here. Can you tell me where it hurts? We've called for help and someone will be with you the whole time."],
    ],
    dos: [
      "Keep first aid within your training.",
      "Record exactly what happened and what was done.",
      "Follow up personally.",
    ],
    donts: [
      "Don't give medication.",
      "Don't move someone with a suspected spinal injury.",
      "Don't speculate about fault with the member or other members.",
    ],
    closeOut: [
      "Incident report submitted.",
      "Equipment checked or removed if involved.",
      "Follow-up call made and next-class clearance noted.",
    ],
    prevention:
      "Keep all staff first-aid trained, check equipment before each class, restock the first aid kit monthly, and encourage members to share injuries before class.",
    escalation:
      "ALL major injuries must be escalated to the Studio Director immediately. Serious injuries (ambulance, hospitalisation) require India Director notification within 1 hour.",
    relatedTemplates: ["TPL-077", "TPL-221", "TPL-220"],
    tags: ["injury", "first aid", "incident", "ambulance", "member safety"],
  }),

  article({
    id: "KB-024",
    title: "Studio Closing - Emergency or Maintenance",
    category: "Safety and Security",
    summary:
      "Closing a studio safely for an emergency, maintenance or an external event: who decides, how to cancel classes so credits return, how to tell members, and the checks before reopening.",
    glance: {
      priority: "P0 for emergency closures; P2 for planned closures",
      owner: "Studio Director decides → Operations executes",
      respond: "Immediately for emergencies; 48 hours' notice for planned work",
      resolve: "Members notified within 30 minutes of the decision",
    },
    firstFive: [
      "Make the studio safe and get people out if needed.",
      "Call the Studio Director - they make the official closure call.",
      "Estimate the duration: hours, a day, or several days.",
    ],
    steps: [
      "Identify the reason: emergency (flood, fire, electrical), maintenance (HVAC, flooring, pest control), or external (bandh, government order, building works).",
      "Estimate the duration and get the Studio Director's decision.",
      "Cancel (don't delete) all affected classes in Momence so credits return automatically.",
      "Notify affected members by WhatsApp broadcast and email: reason, duration, and alternatives (other studios, online options).",
      "Offer rebooking at the nearest open studio and add recovery credits for short-notice cancellations.",
      "Update the phone greeting, Google Business hours and social media.",
      "Put a closure notice on the entrance with a contact number.",
      "Emergencies: call the relevant vendors (electrician, plumber, restoration) immediately; inform building management.",
      "Planned closures: notify members at least 48 hours ahead and schedule the vendor work to minimise peak-time impact.",
      "Keep a closure log: timestamps, decisions, vendor contacts, costs.",
      "Before reopening, do a full safety walkthrough: floors, electrics, AC, sound, lights, bikes and equipment.",
      "Announce the reopening through the same channels.",
    ],
    diagnose: [
      ["Closure under 2 hours", "Cancel affected classes only; consider moving classes to another room or studio."],
      ["Full-day closure", "Cancel the day, broadcast, redirect to the nearest studio."],
      ["Multi-day closure", "India Director informed; consider membership extensions for affected members."],
      ["External shutdown (bandh)", "Follow official advice; waive late-cancel fees for the day."],
    ],
    say: [
      ["Broadcast", "Today's classes at Kwality House are cancelled from 4 pm due to a power failure in the building. Your credits have been returned. The Supreme HQ studio is open as usual if you'd like to rebook - just reply here."],
    ],
    dos: [
      "Cancel classes so credits return automatically.",
      "Use every channel members check.",
      "Walk the studio before reopening.",
    ],
    donts: [
      "Don't announce a closure before the Studio Director confirms it.",
      "Don't reopen without the safety walkthrough.",
    ],
    closeOut: [
      "All affected classes cancelled and credits verified.",
      "Members notified of the closure and the reopening.",
      "Closure log completed.",
    ],
    prevention:
      "Keep vendor contacts for all critical systems at the desk, run a quarterly drill that includes the closure process, and plan maintenance in low-demand windows.",
    escalation:
      "Multi-day closures or closures affecting more than 200 members require India Director notification within 2 hours.",
    relatedTemplates: ["TPL-109", "TPL-239", "TPL-240", "TPL-066"],
    tags: ["closure", "studio closed", "maintenance", "emergency", "cancellation"],
  }),

  article({
    id: "KB-036",
    title: "Locker Jammed, Lost Key or Locker Theft",
    category: "Theft and Lost Items",
    summary:
      "Opening a jammed or locked locker safely, handling lost keys and forgotten codes with ownership checks, and responding properly when a member reports theft from a locker.",
    glance: {
      priority: "P2 for jammed / lost keys; P1 for theft",
      owner: "Front Desk → Studio Operations Manager (theft)",
      respond: "Within 15 minutes",
      resolve: "Locker opened immediately; theft report the same day",
    },
    firstFive: [
      "Verify the person asking is the locker's user before opening anything.",
      "For theft: don't touch the locker - preserve it for checks.",
      "Note the locker number and the time.",
    ],
    steps: [
      "Confirm who is using the locker: ask what's inside, and check their booking for the class time.",
      "Jammed locker: try the master key or the manager override code; don't force the door.",
      "Lost key or forgotten code: open with the master key in front of the member and a second staff member; record it in the locker log.",
      "If the lock or door is damaged, take the locker out of use (tag it) and raise a repair (TPL-039).",
      "Theft reported: keep the locker as it is, note what's missing, and check for signs of forcing.",
      "Review CCTV of the locker area for the time window (manager only) and preserve the footage.",
      "Log the theft with the member's details and items; advise a police complaint for valuables (FIR / e-FIR).",
      "Inform the Studio Operations Manager and check for other reports that day.",
      "Follow up with the member within 24 hours with the outcome of the review.",
    ],
    diagnose: [
      ["Code lock won't accept the right code", "Battery or mechanism fault - master override, then repair."],
      ["Key snapped in the lock", "Don't force it; locksmith; tag the locker out of use."],
      ["Locker forced open", "Theft - preserve, CCTV, escalate."],
      ["Several thefts in a short period", "Pattern - security review, notify members, police involvement."],
    ],
    say: [
      ["Theft report", "I'm so sorry. Let's not touch the locker for now. I'll note everything that's missing and our manager will review the cameras straight away. I'd also recommend filing a police complaint - we'll give you whatever details you need."],
    ],
    dos: [
      "Open lockers only with a second staff member present.",
      "Preserve CCTV footage immediately for thefts.",
      "Keep the locker log up to date.",
    ],
    donts: [
      "Don't open a locker for someone you can't verify.",
      "Don't speculate about who took items.",
    ],
    closeOut: [
      "Locker log updated (opened by whom, witnessed by whom).",
      "Damaged locker tagged and repair raised.",
      "Theft report filed and member updated.",
    ],
    prevention:
      "Check locker locks and batteries weekly, keep master keys secured with a sign-out log, remind members not to store valuables, and keep CCTV coverage of the locker area.",
    escalation:
      "Escalate to the Studio Director for any theft, a forced locker, or more than one theft report in a week.",
    relatedTemplates: ["TPL-039", "TPL-226", "TPL-224", "TPL-081"],
    tags: ["locker", "theft", "lost key", "jammed", "master key", "cctv"],
  }),

  article({
    id: "KB-037",
    title: "Harassment or Inappropriate Behaviour Report",
    category: "Safety and Security",
    summary:
      "What to do when a member or staff member reports harassment, unwanted contact or inappropriate behaviour: make them safe, listen and record their words, escalate immediately, and protect confidentiality.",
    glance: {
      priority: "P0 - always",
      owner: "Studio Director and HR (Internal Committee for sexual harassment involving staff)",
      respond: "Immediately",
      resolve: "Escalated the same hour; formal process led by HR",
    },
    firstFive: [
      "Move the person reporting to a private, safe space.",
      "If anyone is in immediate danger, separate the people involved and call 100 / 112 if needed.",
      "Tell them you're glad they told you and that it will be taken seriously.",
    ],
    steps: [
      "Make sure the person reporting is safe; separate them from the person they're reporting.",
      "Listen without interrupting, judging or questioning their account.",
      "Write down what they say in their own words: what happened, when, where, who was involved, and any witnesses.",
      "Explain what happens next: you must pass it to the Studio Director and HR, and it will be handled confidentially.",
      "Escalate to the Studio Director and HR immediately (within the hour).",
      "Complaints of sexual harassment involving staff go to the Internal Committee under the POSH Act - HR manages this; don't run your own inquiry.",
      "Preserve evidence: CCTV for the time and place, messages, and the class list.",
      "If the person reported is a member, management decides on interim steps (e.g. pausing their bookings) - don't confront them yourself.",
      "If the person reported is staff, HR decides interim steps (e.g. schedule changes) to protect the person reporting.",
      "Share details strictly on a need-to-know basis; never discuss it with other members or staff.",
      "Check on the person who reported (with HR's guidance) and tell them who their contact is.",
    ],
    diagnose: [
      ["Unwanted touching or comments by a trainer", "Studio Director + HR now; trainer's hands-on adjustments paused pending review."],
      ["Member filming others without consent", "Ask them to stop and delete in your presence where possible; management review (TPL-175)."],
      ["Member harassing staff", "Protect the staff member; management decides on membership action."],
      ["Threats or stalking", "Police (100 / 112); security measures; management immediately."],
    ],
    say: [
      ["Receiving the report", "Thank you for telling me - I believe you, and I'm going to make sure this is handled properly. I need to share it with our Studio Director and HR so they can act, and it will be kept confidential."],
    ],
    dos: [
      "Record their words, not your interpretation.",
      "Escalate immediately.",
      "Keep it confidential.",
    ],
    donts: [
      "Don't investigate, confront or mediate yourself.",
      "Don't promise a particular outcome.",
      "Don't ask why they didn't report it sooner.",
    ],
    closeOut: [
      "Report recorded and escalated within the hour.",
      "Evidence preserved.",
      "Ticket restricted to the people handling it.",
    ],
    prevention:
      "Display the code of conduct, train all staff on consent and respectful behaviour, publicise how to report concerns confidentially, and keep the Internal Committee details visible to staff.",
    escalation:
      "Every report goes to the Studio Director and HR immediately. Sexual harassment complaints involving staff must reach the Internal Committee. Threats or violence: police first.",
    relatedTemplates: ["TPL-229", "TPL-082", "TPL-158", "TPL-175"],
    tags: ["harassment", "posh", "conduct", "safety", "confidential", "complaint"],
  }),

  article({
    id: "KB-038",
    title: "Medical Emergency - Fainting, Dizziness or Chest Pain",
    category: "Safety and Security",
    summary:
      "Recognising and responding to fainting, dizziness, breathlessness or chest pain in class: stop, position, call 108 / 112 early, use the AED if needed, and hand over clearly to paramedics.",
    glance: {
      priority: "P0 - always",
      owner: "Trainer and senior staff on site → Studio Director",
      respond: "Immediately",
      resolve: "Ambulance called within 2 minutes when red-flag symptoms appear",
    },
    firstFive: [
      "Stop the member exercising; help them sit or lie down safely.",
      "Red flags (chest pain, breathlessness, confusion, fainting, pain spreading to the arm or jaw): call 108 / 112 now.",
      "Send for the first aid kit and AED, and someone to meet the ambulance.",
    ],
    steps: [
      "Stop the member exercising and help them sit or lie down on the floor; clear space around them.",
      "Feeling faint or dizzy: lie them down and raise their legs if there's no injury; loosen tight clothing; give small sips of water once they're fully alert.",
      "Chest pain, breathlessness, pain spreading to the arm, jaw or back, sweating or confusion: call 108 / 112 immediately - don't wait to see if it passes.",
      "If they are unresponsive and not breathing normally: call 108 / 112, start CPR if trained, and use the AED as soon as it arrives (follow its voice prompts).",
      "If they're conscious and have their own medication (e.g. an asthma inhaler), help them take it - don't give medication yourself.",
      "Keep the class away and calm; another staff member manages the room.",
      "Note the time symptoms started and everything that was done.",
      "Brief the paramedics: what happened, symptoms, time, actions taken, any medication.",
      "Contact the member's emergency contact.",
      "Notify the Studio Director, and complete the incident report within 24 hours.",
      "Follow up with the member; require medical clearance before they return to class.",
    ],
    diagnose: [
      ["Brief light-headedness after standing quickly, recovers fast", "Sit them down, hydrate, end their session; follow up - still log it."],
      ["Fainted and came round", "Ambulance advised; keep them lying down; don't let them leave alone."],
      ["Chest pain or breathlessness", "108 / 112 now; keep them at rest, sitting upright if that's easier."],
      ["Low blood sugar signs (shaky, sweaty, known diabetic)", "Sugary drink or food if they can swallow; call 108 if no improvement in 10 minutes."],
    ],
    say: [
      ["To the member", "You're OK, I'm right here. Let's get you lying down. Help is on the way - just breathe slowly with me."],
      ["To the class", "Please give us some space and move to the back of the room - my colleague will look after you."],
    ],
    dos: [
      "Call early - red flags mean an ambulance, every time.",
      "Know where the AED is and check it monthly.",
      "Write down times.",
    ],
    donts: [
      "Don't let the member continue the class or drive themselves home.",
      "Don't give food or water to someone who isn't fully alert.",
      "Don't give medication.",
    ],
    closeOut: [
      "Incident report submitted.",
      "Emergency contact and Studio Director informed.",
      "Medical clearance requirement noted on the profile.",
    ],
    prevention:
      "Keep staff CPR and AED trained, check the AED and first aid kit monthly (TPL-221), encourage members to declare heart conditions and medication in the intake form, and remind members to hydrate and eat before class.",
    escalation:
      "Every medical emergency goes to the Studio Director immediately; hospitalisation requires India Director notification within 1 hour.",
    relatedTemplates: ["TPL-219", "TPL-077", "TPL-221"],
    tags: ["medical emergency", "fainting", "chest pain", "cpr", "aed", "ambulance"],
  }),

  article({
    id: "KB-039",
    title: "Suspected Phishing, Account Compromise or Data Breach",
    category: "Safety and Security",
    summary:
      "If someone clicked a suspicious link, shared a password or OTP, or member data may have leaked: contain it in the first hour (passwords, sessions, access), preserve evidence, and escalate for the breach decision.",
    glance: {
      priority: "P0 - act within the hour",
      owner: "IT → Studio Director (with leadership for breach decisions)",
      respond: "Immediately",
      resolve: "Contained within 1 hour; review within 24 hours",
    },
    firstFive: [
      "Don't delete the suspicious email or message - it's evidence.",
      "Change the affected password from a clean device and sign out all sessions.",
      "Tell IT immediately - speed matters more than certainty.",
    ],
    steps: [
      "Record what happened: the message, the link clicked, what was entered (password, OTP, card details), the time and the device.",
      "Change the password of the affected account (email, Momence, Google Workspace, payment dashboard) from a different, clean device.",
      "Sign out all other sessions and enable two-factor authentication if it isn't on.",
      "If an OTP or bank or card details were shared, call the bank to block the card or account, and report fraud to the national cyber-crime helpline 1930 / cybercrime.gov.in.",
      "Check for damage: forwarding rules in email, unknown logins, new admin users in Momence, changed bank details in the payment gateway.",
      "Disconnect the device from Wi-Fi if malware is suspected, and have IT scan or reset it.",
      "If member data (names, phone numbers, payment details) may be exposed, escalate to the Studio Director for the breach assessment and any notification decision.",
      "Warn the team about the phishing message (a screenshot without the clickable link).",
      "Preserve evidence: headers, screenshots, login logs.",
      "Review within 24 hours: how it happened and what control prevents it next time.",
    ],
    diagnose: [
      ["Clicked a link but entered nothing", "Run a device scan and watch for odd behaviour; report it to IT anyway."],
      ["Entered a password", "Change it now, sign out sessions, check forwarding rules and recent logins."],
      ["Shared an OTP or card details", "Call the bank immediately; 1930 helpline; change passwords."],
      ["Member data downloaded or exported unexpectedly", "Breach assessment with the Studio Director now."],
      ["Fake 'CEO' asking for payments or gift cards", "Don't pay; verify by phone on a known number; report it."],
    ],
    say: [
      ["Staff member who clicked", "Thank you for telling us straight away - that's exactly the right thing to do. Let's change your password from my laptop now and IT will check your device."],
    ],
    dos: [
      "Report immediately, even if unsure.",
      "Use 2FA on every admin account.",
      "Verify payment requests by phone.",
    ],
    donts: [
      "Don't blame the person who reported - it discourages reporting.",
      "Don't forward the phishing email with live links.",
      "Don't wipe the device before IT has looked at it.",
    ],
    closeOut: [
      "Passwords changed and sessions revoked.",
      "Damage check done (forwarding rules, admins, bank details).",
      "Breach decision recorded by management (if data was involved).",
    ],
    prevention:
      "Enforce 2FA on email, Momence and payment dashboards, give each person their own login (no shared passwords), run phishing awareness training twice a year, and remove access on the day someone leaves (KB-046).",
    escalation:
      "Escalate to the Studio Director immediately if member or payment data may be exposed, money was lost, or an admin account was compromised.",
    relatedTemplates: ["TPL-218", "TPL-216", "TPL-061", "TPL-053"],
    tags: ["phishing", "data breach", "security", "password", "otp", "fraud"],
  }),
];
