// Knowledge Base - facilities, audio, HVAC, power, plumbing, hygiene, equipment and vendors.
import { article, type KnowledgeArticle } from "./compose";

export const FACILITIES_EQUIPMENT_ARTICLES: KnowledgeArticle[] = [
  article({
    id: "KB-005",
    title: "Studio Microphone Not Functioning",
    category: "Repair and Maintenance",
    summary:
      "Getting a headset or wireless mic working before or during class: batteries, mute and channel, receiver and cables, the backup mic, and the recurrence follow-up if it fails again.",
    glance: {
      priority: "P2 (P0 if no working mic and a class starts within 30 minutes)",
      owner: "Front Desk on shift → Facilities Manager → AV vendor (AudioTech Solutions)",
      respond: "Immediately if a class is running; otherwise within 1 hour",
      resolve: "Backup mic in use within 5 minutes; repair within 3 days",
    },
    firstFive: [
      "Hand the trainer the backup mic so the class isn't held up.",
      "Check the obvious: battery level, mute switch, power LED.",
      "Check the receiver shows signal (RF light) when the trainer speaks.",
    ],
    steps: [
      "Give the trainer the charged backup mic from the equipment cupboard so the class can continue.",
      "Check the faulty mic's batteries - replace with fresh AAs (or charge it) even if the indicator looks fine.",
      "Check the mute switch on the bodypack and that the bodypack and receiver are on the same channel / frequency.",
      "Look at the receiver: no RF light means no signal (re-sync the pair); RF but no audio means check the mixer.",
      "Check cables: headset connector firmly in the bodypack, and the receiver output (XLR) firmly in the mixer.",
      "On the mixer, make sure the mic channel isn't muted and the gain/fader is up.",
      "If audio drops when the trainer moves, check for interference (another mic on the same frequency, bodypack antenna folded) and try another frequency.",
      "Test the mic on a different receiver to tell a faulty mic from a faulty receiver.",
      "Label the faulty unit, take it out of rotation, and log the symptoms and what you tried.",
      "Raise the repair with the AV vendor (AudioTech Solutions) if hardware failure is confirmed.",
      "Create recurrence checks at 5 and 10 days, assigned to the reporter, to confirm the fix held.",
      "Confirm the repaired or replacement mic works before the next class.",
    ],
    diagnose: [
      ["No power light on the bodypack", "Batteries or charging - replace / charge, then re-test."],
      ["Power on, no RF light on the receiver", "Channel mismatch - re-sync the bodypack and receiver."],
      ["RF light on, no sound", "Mixer channel muted / gain down, or the XLR cable - check the mixer chain."],
      ["Sound cuts in and out", "Interference or a damaged headset cable - change frequency, swap the headset."],
      ["Crackling only when the trainer moves", "Headset cable or connector damaged - replace the headset element."],
    ],
    say: [
      ["Trainer mid-class", "Here's the backup mic - it's charged and synced. I'll sort out the other one after class."],
    ],
    dos: [
      "Keep a charged, synced backup mic for every studio.",
      "Keep spare batteries at the front desk.",
      "Log every failure with the unit number.",
    ],
    donts: [
      "Don't make the class wait while you troubleshoot - swap first.",
      "Don't put a faulty unit back in the cupboard unlabelled.",
    ],
    closeOut: [
      "Faulty unit labelled and logged.",
      "Vendor repair raised if hardware is faulty.",
      "Recurrence checks created at 5 and 10 days.",
    ],
    prevention:
      "Test all microphones 15 minutes before the first class each day, change batteries on a fixed schedule, and keep one charged backup mic per studio.",
    escalation:
      "If no backup mic is available and classes are affected, escalate to the Facilities Manager immediately as P0.",
    relatedTemplates: ["TPL-179", "TPL-034", "TPL-156"],
    tags: ["microphone", "mic", "audio", "headset", "wireless"],
  }),

  article({
    id: "KB-006",
    title: "Studio AC Red Light Blinking & Not Functioning",
    category: "Repair and Maintenance",
    summary:
      "An AC indoor unit showing a red / blinking light has gone into fault. Record the fault code, try one safe reset, keep members comfortable, and get the HVAC vendor out with the right information.",
    glance: {
      priority: "P1 (P0 if the studio exceeds 28°C during classes)",
      owner: "Facilities Manager → HVAC vendor",
      respond: "Within 15 minutes during class hours",
      resolve: "Vendor visit within 24 hours",
    },
    firstFive: [
      "Note the blink pattern / fault code on the display before touching anything.",
      "Check the room temperature and how many classes are coming up.",
      "Make sure the TFA (fresh air) unit is running - the AC works with it.",
    ],
    steps: [
      "Record the fault code or count the red-light blinks (e.g. 3 blinks, pause) - the vendor needs this.",
      "Check the thermostat or remote: Cool mode, set point 18–22°C, fan on.",
      "Check the TFA (Treated Fresh Air) system is running; if it has tripped, the AC can struggle or fault.",
      "Do one safe reset: switch the unit off at the remote, then off at its MCB/isolator for 5 minutes, then back on.",
      "If the red light returns after the reset, it's a hardware or gas fault - stop resetting and call the HVAC vendor with the fault code.",
      "Check for water dripping from the indoor unit (blocked drain) and put a bucket and wet-floor sign down if needed.",
      "If classes are running: open doors where safe, use portable fans, and tell members and the trainer what's happening.",
      "If the room exceeds 28°C, reduce intensity, move the class to another room, or cancel - member safety first.",
      "Message members booked in the next classes if the AC won't be fixed before they start, and offer a free cancellation.",
      "Log the downtime, readings and actions; record the vendor's diagnosis and parts used.",
      "If the AC was down more than 24 hours, offer affected members a class credit.",
    ],
    diagnose: [
      ["Red light returns immediately after reset", "Hardware, sensor or gas fault - vendor visit; don't keep resetting."],
      ["Unit running but blowing warm air", "Possible low gas or outdoor unit fault - check the outdoor unit is running; call the vendor."],
      ["Water dripping from the indoor unit", "Blocked drain line - bucket and sign, switch off if it's heavy, vendor to clear the drain."],
      ["Several units faulted at once", "Check the power supply / phase and the main HVAC panel - electrical issue, call the electrician too."],
      ["Room stuffy but cool", "TFA / fresh-air problem rather than AC - see TPL-177 / TPL-178."],
    ],
    say: [
      ["Members in class", "Apologies - one of our AC units has developed a fault and the technician is on the way. We've set up fans; please hydrate and take it at your own pace today."],
      ["Booked members", "Heads-up: the AC in Studio 1 at Kwality House is being repaired, so the room may be warmer than usual this evening. If you'd prefer to skip, you can cancel without a late-cancel charge."],
    ],
    dos: [
      "Write down the fault code before resetting.",
      "Tell members before they find out by sweating.",
      "Waive late-cancel fees for affected classes.",
    ],
    donts: [
      "Don't open AC panels or touch wiring.",
      "Don't reset the unit repeatedly - it can damage the compressor.",
      "Don't run high-intensity classes in a room above 28°C.",
    ],
    closeOut: [
      "Fault code, downtime and vendor diagnosis recorded.",
      "Room temperature back to 18–22°C confirmed after the fix.",
      "Affected members credited if downtime exceeded 24 hours.",
    ],
    prevention:
      "Schedule quarterly HVAC servicing (filters, drain lines, gas pressure), check AC and TFA function on the opening walkthrough, and keep the vendor's escalation contacts at the front desk.",
    escalation:
      "Escalate to the Studio Director if the AC is non-functional for more than 48 hours, if multiple complaints are received, or if classes have to be cancelled.",
    relatedTemplates: ["TPL-033", "TPL-177", "TPL-157", "TPL-178"],
    tags: ["ac", "hvac", "air conditioning", "temperature", "fault code", "tfa"],
  }),

  article({
    id: "KB-010",
    title: "PowerCycle Bike Malfunction - SC3 Troubleshooting",
    category: "Repair and Maintenance",
    summary:
      "Fixing or safely retiring a faulty Stages SC3 bike: console and SPM2 power meter, pedals (the left pedal is reverse-threaded), FitLoc and saddle clamp, resistance and brake, belt and flywheel noise, and stability.",
    glance: {
      priority: "P1 for safety faults (pedal, FitLoc, brake, flywheel noise); P2 for console / power",
      owner: "PowerCycle lead / Facilities → Stages service technician",
      respond: "Before the bike's next class",
      resolve: "Field fixes same day; technician within 72 hours",
    },
    firstFive: [
      "Decide: is it safe to ride? If the fault involves pedals, FitLoc, saddle, brake, belt or flywheel noise - no.",
      "Take unsafe bikes out of rotation now: OUT OF ORDER tag and block the bike in Momence.",
      "Note the bike number and the exact symptom.",
    ],
    steps: [
      "Tag the bike OUT OF ORDER and block its spot in Momence if there's any safety doubt.",
      "Console blank: check the power wire in the channel under the handlebar, replace the console batteries, and re-seat the 3 mm hex screws; if still dead, the SIC2 console needs replacing.",
      "No watts / power meter not pairing: replace the SPM2's AA batteries (use the battery spacer - don't tape them), then re-pair using the 5-digit ANT+ ID on the console.",
      "Zero reset failing: run it with no weight on the pedals; the ADC should read 790–990. If it's outside that range after 3 attempts, the crank arm needs re-seating at 52–57 N·m.",
      "Pedal loose or detached: stop using the bike. Refit with a 15 mm pedal wrench at 42 N·m - the right pedal tightens clockwise; the left (CR-L) is reverse-threaded and tightens ANTI-clockwise. Never force a pedal that binds - it may be cross-threaded.",
      "Handlebar dropping: push the FitLoc lever fully down until it clicks and check the post insertion line isn't visible; if it still slips, the FitLoc needs replacement.",
      "Saddle slipping: tighten the 13 mm saddle clamp; replace the clamp if it's stripped.",
      "Resistance knob does nothing or the brake doesn't stop the flywheel: check the brake cable under the shroud; if intact, the magnetic brake gap needs a technician. The bike stays out of use.",
      "Belt squeal, slipping, grinding or scraping from the flywheel: take the bike out of use - belt tension and flywheel faults are technician-only.",
      "Wobbling: adjust the 4 levelling feet (14 mm nut) until all touch the floor; tighten the M10 stabiliser bolts.",
      "Log the bike number, symptom, what you did and parts used; raise the technician visit for anything you couldn't fix.",
      "Create follow-up checks at 5 and 10 days for the original reporter to confirm the fix held.",
    ],
    diagnose: [
      ["Clicking with each pedal stroke", "Loose pedal or crank arm - stop riding, check pedal torque (42 N·m) and crank arm (52–57 N·m)."],
      ["Grinding or scraping noise", "Brake pad / flywheel housing misalignment - out of use, technician only."],
      ["Watts stuck at zero", "SPM2 batteries or pairing - replace batteries, re-pair."],
      ["Handlebar sinks during class", "FitLoc not engaged or worn - re-lock; replace if it slips again."],
      ["Bike rocks side to side", "Levelling feet - adjust all four, tighten stabiliser bolts."],
    ],
    say: [
      ["Rider mid-class", "Let's move you to bike 14 - this one needs a check before anyone rides it again. Thanks for flagging it."],
    ],
    dos: [
      "Check pedal torque monthly with a torque wrench.",
      "Use the battery spacer in the SPM2.",
      "Record every repair against the bike number.",
    ],
    donts: [
      "Don't ride or let anyone ride a bike with a pedal, FitLoc, brake or flywheel fault.",
      "Don't force a pedal thread - remember the left pedal is reverse-threaded.",
      "Don't adjust belt tension yourself.",
    ],
    closeOut: [
      "Bike fixed and test-ridden, or blocked in Momence with technician visit booked.",
      "Repair log updated with parts used.",
      "5- and 10-day recurrence checks created.",
    ],
    prevention:
      "Inspect all bikes on the opening walkthrough (pedals, FitLoc, saddle, brake), check pedal torque (42 N·m) monthly, replace SPM2 batteries quarterly, and service belts and brakes on the Stages schedule.",
    escalation:
      "If several bikes are affected, a bike is unsafe to ride, or a rider was hurt, remove the bike(s) from service immediately and escalate to the Studio Operations Manager. Recurring faults on the same bike within 30 days go to the vendor as a warranty issue.",
    relatedTemplates: ["TPL-191", "TPL-192", "TPL-193", "TPL-194", "TPL-195", "TPL-196", "TPL-035"],
    tags: ["powercycle", "stages sc3", "bike", "pedal", "spm2", "fitloc", "console"],
  }),

  article({
    id: "KB-013",
    title: "Sound System Failure - Studio Audio Troubleshooting",
    category: "Repair and Maintenance",
    summary:
      "Restoring studio audio quickly by working along the signal chain - source device, cable or Bluetooth, mixer, amplifier, speakers - and keeping the class going while you do.",
    glance: {
      priority: "P0 if a class is starting within 30 minutes; P2 otherwise",
      owner: "Front Desk on shift → Facilities Manager → AV vendor (AudioTech Solutions)",
      respond: "Immediately",
      resolve: "Working audio before the next class; vendor within 24 hours",
    },
    firstFive: [
      "Find the scope: one speaker, one studio, or every studio?",
      "Check the source: is the trainer's device actually playing and connected?",
      "If a class is starting, set up the backup speaker first.",
    ],
    steps: [
      "Identify the scope - one speaker, a whole studio, or the whole building.",
      "Check the source device is playing, its volume is up, and it's not connected to another speaker by Bluetooth.",
      "Test with a known-good source (a phone with a 3.5 mm cable) to separate source problems from system problems.",
      "Mixer: correct input selected, channel not muted, gain and master fader up.",
      "Amplifier: power LED on; if a protect / fault LED is lit, switch the amp off, wait 30 seconds, switch on.",
      "One speaker silent: check its cable at the amplifier and the speaker end.",
      "Whole building silent: check the AV rack's power socket and MCB.",
      "If audio isn't back within 5 minutes and a class is waiting, use the backup Bluetooth speaker for this class only.",
      "Contact the AV vendor (AudioTech Solutions) with the symptom and what you've ruled out.",
      "Log the failure with time, symptom, cause and resolution.",
    ],
    diagnose: [
      ["No sound anywhere, amp lights off", "Power - check the AV rack socket and MCB."],
      ["Amp in protect mode", "Overheating or a shorted speaker cable - power-cycle, check speaker wiring, call the vendor if it repeats."],
      ["Works with a phone but not the trainer's iPad", "Source problem - Bluetooth paired elsewhere, volume limit, or a faulty adapter (TPL-181)."],
      ["Static or crackling", "Loose cable or a failing speaker driver (TPL-180)."],
      ["One speaker out", "Speaker cable or terminal - re-seat both ends."],
    ],
    say: [
      ["Class waiting", "We're having a sound issue - we'll use our portable speaker today so we can start on time. Thanks for bearing with us."],
    ],
    dos: [
      "Work the chain in order: source → cable → mixer → amp → speaker.",
      "Keep the backup speaker charged.",
      "Write down what you ruled out for the vendor.",
    ],
    donts: [
      "Don't open the amplifier or rewire speakers yourself.",
      "Don't crank the gain to compensate - it damages speakers.",
    ],
    closeOut: [
      "Audio restored and tested in every affected studio.",
      "Cause and fix recorded.",
      "Vendor ticket raised if hardware failed.",
    ],
    prevention:
      "Test the sound system 15 minutes before the first class each day, check cable connections on the opening walkthrough, and keep the backup speaker charged.",
    escalation:
      "If the sound system is non-functional and a class starts within 30 minutes, escalate to the Facilities Manager immediately as P0.",
    relatedTemplates: ["TPL-034", "TPL-180", "TPL-181"],
    tags: ["sound system", "audio", "speakers", "amplifier", "mixer", "bluetooth"],
  }),

  article({
    id: "KB-019",
    title: "Studio Equipment Damage - Member Caused",
    category: "Repair and Maintenance",
    summary:
      "When a member damages equipment: make it safe, find out what happened respectfully, decide between accident and negligence fairly, and route the repair and any cost recovery correctly.",
    glance: {
      priority: "P2 (P1 if the equipment is unsafe or a person was hurt)",
      owner: "Studio Operations Manager (Studio Director for cost recovery)",
      respond: "Immediately - make it safe",
      resolve: "Repair quote within 24 hours",
    },
    firstFive: [
      "Check nobody is hurt.",
      "If the equipment is unsafe, take it off the floor and tag it OUT OF ORDER.",
      "Photograph the damage before anything is moved or repaired.",
    ],
    steps: [
      "Check for injuries first; follow the first aid protocol if anyone is hurt.",
      "If the equipment is unsafe, tag it OUT OF ORDER and remove it from the studio floor.",
      "Photograph the damage and note the equipment, serial or asset number, time and class.",
      "Confirm what happened with the trainer and any witnesses.",
      "Speak to the member privately after class - never in front of others - and ask for their account.",
      "Decide whether it was normal-use wear or an accident (no charge) or clear negligence or misuse (e.g. dropping weights from height, forcing a mechanism).",
      "For accidents, don't charge the member; route the repair through the normal budget or insurance.",
      "For negligence, discuss cost recovery with the Studio Director before saying anything to the member about money.",
      "Log the incident with photos and asset details.",
      "Get a repair or replacement quote from the vendor within 24 hours.",
      "If the cost exceeds ₹5,000, the Studio Director decides on cost recovery.",
      "Arrange the repair or replacement and return the equipment to service only after it's checked.",
    ],
    diagnose: [
      ["Normal wear (old band snapped, worn strap)", "No member responsibility - replace and review the inspection schedule."],
      ["Accident in normal use", "No charge; thank the member for reporting it."],
      ["Clear misuse against trainer instruction", "Document witnesses; Studio Director decides on recovery."],
      ["Damage hurt someone", "Injury protocol first; incident report; check insurance (TPL-104)."],
    ],
    say: [
      ["Talking to the member", "Thanks for staying back. Are you OK? Can you tell me what happened with the bike? We just need to understand it so we can get it fixed."],
    ],
    dos: [
      "Photograph before moving anything.",
      "Talk to the member privately and calmly.",
      "Treat honest accidents generously.",
    ],
    donts: [
      "Don't accuse or ask for money on the spot.",
      "Don't put damaged equipment back in use without a check.",
    ],
    closeOut: [
      "Incident logged with photos and asset number.",
      "Repair or replacement arranged.",
      "Cost-recovery decision recorded (if any).",
    ],
    prevention:
      "Display equipment usage guidelines in the studio, have trainers correct misuse proactively, and inspect bands, straps and weights weekly.",
    escalation:
      "If the member disputes responsibility, refuses to give details, or the repair exceeds ₹5,000, escalate to the Studio Director.",
    relatedTemplates: ["TPL-035", "TPL-203", "TPL-201", "TPL-104"],
    tags: ["equipment damage", "member", "repair", "cost recovery", "incident"],
  }),

  article({
    id: "KB-033",
    title: "Water Leak, Seepage or Plumbing Failure",
    category: "Repair and Maintenance",
    summary:
      "Containing a leak, overflowing toilet, burst pipe or ceiling seepage fast: isolate the water, protect people, floors and electrics, and get the plumber or building management involved with good evidence.",
    glance: {
      priority: "P1 (P0 if water is near electrics or on the studio floor during class)",
      owner: "Facilities Manager → plumber / building management",
      respond: "Within 15 minutes",
      resolve: "Contained immediately; repaired within 24–48 hours",
    },
    firstFive: [
      "Keep people away from the wet area and put wet-floor signs down.",
      "If water is near sockets, equipment or lights, switch off that circuit at the DB if it's safe to do so.",
      "Find and close the nearest isolation valve for the leaking fixture.",
    ],
    steps: [
      "Cordon off the area with wet-floor signs; move members away.",
      "If water is reaching electrical points, switch off that circuit at the distribution board - never touch wet electrics.",
      "Close the isolation valve for the fixture (under the basin, behind the toilet, or the washroom main).",
      "Contain the water: buckets under drips, towels and a wet vac on floors; protect wooden studio floors immediately.",
      "Photograph the source, the damage and any ceiling stains, with time stamps.",
      "Ceiling seepage: inform building or society management at once - the source is often the floor above or a common pipe.",
      "Call the plumber with clear details: fixture, symptom, valve status, photos.",
      "If a studio or washroom is unusable, block affected classes and inform booked members.",
      "After the repair, dry the area fully and check for damp, odour or mould; note any floor or wall damage for repair.",
      "Log the incident, vendor visit, cause and cost; consider insurance for significant damage.",
    ],
    diagnose: [
      ["Toilet overflowing", "Close the valve behind the toilet; don't flush again; plunger or plumber."],
      ["Steady drip from the ceiling", "Bucket and cordon; building management to inspect the floor above."],
      ["Water spreading on the studio floor", "Stop classes in that room, dry immediately - wooden floors warp within hours."],
      ["Low pressure or no hot water", "Not an emergency - check the geyser MCB and raise TPL-182."],
      ["Drain backing up", "Stop use of that drain; plumber to clear; check for hair or debris traps."],
    ],
    say: [
      ["Members nearby", "Please mind this area - we have a leak and the plumber is on the way. The other washroom is available just down the corridor."],
    ],
    dos: [
      "Isolate the water first, then clean up.",
      "Protect electrics and wooden floors.",
      "Photograph everything for the vendor, building and insurance.",
    ],
    donts: [
      "Don't touch sockets or equipment standing in water.",
      "Don't leave a leak running overnight with just a bucket.",
    ],
    closeOut: [
      "Leak fixed and the area fully dried.",
      "Damage noted and repair tickets raised (floor, ceiling, paint).",
      "Building management informed for common-area causes.",
    ],
    prevention:
      "Know where every isolation valve is (label them), inspect washrooms and under-sink pipes monthly, clear drain traps weekly, and check the roof and terrace drains before the monsoon.",
    escalation:
      "Escalate to the Studio Director if a studio must close, if water reached electrical systems, or if the building doesn't respond within 24 hours to a seepage complaint.",
    relatedTemplates: ["TPL-036", "TPL-184", "TPL-182", "TPL-183"],
    tags: ["plumbing", "leak", "seepage", "water", "washroom", "ceiling"],
  }),

  article({
    id: "KB-034",
    title: "Power Outage & Electrical Faults - Safe Response",
    category: "Repair and Maintenance",
    summary:
      "What to do when power fails, a breaker keeps tripping, or there's a burning smell or sparking: safety first, check backup power, keep classes and members safe, and get a qualified electrician.",
    glance: {
      priority: "P0 for sparking, burning smell or no backup during classes; P1 otherwise",
      owner: "Facilities Manager → electrician / building management",
      respond: "Immediately",
      resolve: "Safe state immediately; repair the same day",
    },
    firstFive: [
      "Burning smell, smoke or sparks: switch off the circuit if it's safe, move people away, and be ready to evacuate (KB-009).",
      "Check whether it's just us (our MCB / DB) or the whole building (lift and corridor lights).",
      "Check the inverter / DG backup has picked up emergency lighting and essentials.",
    ],
    steps: [
      "If there's smoke, burning smell or sparking, switch off the affected circuit or the main if safe, move people away, and evacuate if it doesn't stop.",
      "Check the building: if the corridor and lift are also out, it's a grid or building outage - call building management for an estimate.",
      "If only our studio is out, check the distribution board for tripped MCBs or RCCB/ELCB.",
      "Reset a tripped breaker once. If it trips again immediately, leave it off - there's a fault - and unplug devices on that circuit.",
      "Confirm the inverter or DG backup is running emergency lights, front desk, router and the AC where supported.",
      "During a class: stop high-intensity work and bike sprints in the dark; open blinds or use emergency lighting; move members to safety if it's dark.",
      "If power won't be back within 30 minutes, decide with the Studio Operations Manager whether to cancel upcoming classes and notify members.",
      "Call the electrician with the details: what tripped, what was plugged in, any smell or noise.",
      "After restoration, check the AC, sound, lights and bikes' consoles before the next class.",
      "Log the outage duration, cause and actions.",
    ],
    diagnose: [
      ["Whole building dark", "Grid or building issue - get an ETA from building management, run on backup."],
      ["One breaker trips repeatedly", "Faulty appliance or wiring on that circuit - leave it off, unplug devices, call the electrician."],
      ["RCCB / ELCB tripped", "Possible earth leakage (often water or a damaged cable) - don't keep resetting; electrician."],
      ["Backup didn't start", "Inverter / DG fault - P0 if classes are running (TPL-185)."],
      ["Flickering lights", "Loose connection or failing fitting - raise TPL-040; electrician to inspect."],
    ],
    say: [
      ["Class in progress", "We've lost power - please stop where you are and stay on your mat or bike. Emergency lights are on; we'll update you in two minutes."],
    ],
    dos: [
      "Treat burning smells and sparks as emergencies.",
      "Reset a breaker at most once.",
      "Check equipment after power returns.",
    ],
    donts: [
      "Don't open electrical panels beyond the DB switches.",
      "Don't use water near electrical faults.",
      "Don't run classes in darkness.",
    ],
    closeOut: [
      "Power restored and equipment checked.",
      "Cause identified by the electrician and recorded.",
      "Backup system tested if it failed.",
    ],
    prevention:
      "Service the inverter or DG quarterly, test emergency lighting monthly, label the DB circuits, and avoid overloading sockets with heaters, steamers or chargers.",
    escalation:
      "Escalate to the Studio Director immediately for any fire risk, if backup power fails during classes, or if the outage forces class cancellations.",
    relatedTemplates: ["TPL-037", "TPL-185", "TPL-040", "TPL-186"],
    tags: ["power outage", "electrical", "breaker", "inverter", "dg", "lighting"],
  }),

  article({
    id: "KB-035",
    title: "Changing Room Hygiene, Towels & Showers - Service Recovery",
    category: "Studio Amenities and Facilities",
    summary:
      "When members report a dirty changing room, no towels, no hot water or empty toiletries: fix it within the hour, recover the member, and trace why the checklist or supply chain failed.",
    glance: {
      priority: "P2 (P1 if it's affecting a busy class block)",
      owner: "Studio Operations / housekeeping supervisor",
      respond: "Within 15 minutes",
      resolve: "Fixed within the hour; cause addressed within 48 hours",
    },
    firstFive: [
      "Go and look yourself - confirm what the member saw.",
      "Get housekeeping on it immediately (or do the urgent part yourself).",
      "Check the next class change-over time so it's fixed before the rush.",
    ],
    steps: [
      "Inspect the changing room and note exactly what's wrong (floor, toilets, bins, mirrors, smell, supplies).",
      "Call housekeeping to clean now; if no one is available, do the urgent bits (bins, wet floor, toilet paper) yourself.",
      "Towels short: use the reserve stock, ask the laundry vendor for an urgent delivery, and tell members at the desk before they change.",
      "No hot water: check the geyser switch / MCB and the heater timer; if it's not a quick fix, raise a plumbing ticket and warn members.",
      "Restock toiletries (shampoo, body wash, sanitary products, tissues) and note anything running low.",
      "Thank the member who reported it and offer proportionate recovery (an apology, a complimentary class for a serious lapse).",
      "Check the cleaning checklist for that slot - was it skipped, rushed, or understaffed?",
      "Fix the cause: adjust the cleaning schedule around peak change-overs, add a mid-day deep clean, or raise a vendor issue.",
      "Log the lapse with photos and the cause.",
    ],
    diagnose: [
      ["Checklist signed but room dirty", "Supervision gap - spot-check with the housekeeping supervisor."],
      ["Towels short every evening", "Laundry cycle or par level too low - raise par stock and vendor pickup frequency (TPL-187)."],
      ["Smell persists after cleaning", "Drain trap or ventilation issue - plumber or exhaust check."],
      ["Pests seen", "Pest control same day (TPL-043); remove food sources."],
    ],
    say: [
      ["Member who reported it", "Thank you for telling us - you shouldn't have found it like that. It's being cleaned right now, and I've asked for a check before every class change-over from today."],
    ],
    dos: [
      "Check peak change-over times first.",
      "Keep reserve towels and toiletries on site.",
      "Thank members for reporting.",
    ],
    donts: [
      "Don't wait for the scheduled clean if members are using the room.",
      "Don't argue about whether it was 'that bad'.",
    ],
    closeOut: [
      "Room cleaned and restocked, with photos.",
      "Cause identified (schedule, staffing, vendor).",
      "Recovery offered where warranted.",
    ],
    prevention:
      "Schedule cleans 15 minutes before each peak change-over, keep a signed checklist on the door with supervisor spot-checks, set par levels for towels and toiletries, and run a weekly deep clean.",
    escalation:
      "Escalate to the Studio Operations Manager if the same lapse happens twice in a week or if a vendor (laundry, housekeeping) misses service.",
    relatedTemplates: ["TPL-188", "TPL-187", "TPL-182", "TPL-038", "TPL-234", "TPL-043"],
    tags: ["hygiene", "changing room", "towels", "showers", "housekeeping", "toiletries"],
  }),

  article({
    id: "KB-045",
    title: "Barre, Mirror or Floor Hazard on the Studio Floor",
    category: "Repair and Maintenance",
    summary:
      "A loose barre, cracked mirror or damaged / slippery floor patch is a fall and injury risk. Make the spot unusable immediately, protect the class, and get a repair booked with a safe interim plan.",
    glance: {
      priority: "P1 - injury risk",
      owner: "Facilities Manager → carpenter / glazier / flooring vendor",
      respond: "Immediately",
      resolve: "Area made safe now; repair within 48 hours",
    },
    firstFive: [
      "Stop anyone using that barre section, mirror area or floor patch.",
      "Mark it off (tape, cones, sign) and adjust the class layout.",
      "Photograph the hazard.",
    ],
    steps: [
      "Stop use of the affected spot immediately and tell the trainer.",
      "Mark the area with tape or cones and an OUT OF USE sign; move mats and spots away.",
      "Loose barre: check whether the brackets or wall anchors have pulled out - don't lean or load it at all.",
      "Cracked or loose mirror: keep people at least 1 m away; if a piece could fall, tape it across and arrange urgent removal.",
      "Floor: dry and clean slippery patches (sweat, spilled water, polish residue); for lifted boards or splinters, cover and cordon.",
      "Block affected spots in Momence if capacity must be reduced until it's fixed.",
      "Photograph the hazard and note its exact location.",
      "Book the right vendor (carpenter or fabricator for barres, glazier for mirrors, flooring vendor for boards) with photos.",
      "After the repair, test it (load the barre, check the mirror is secure, walk the floor) before reopening the spot.",
      "Log the hazard, actions, vendor and cost.",
    ],
    diagnose: [
      ["Barre moves when pressed", "Anchors failing - out of use until re-fixed; check the neighbouring brackets too."],
      ["Hairline crack in a mirror", "Tape it, keep people clear, replace - cracks spread with vibration."],
      ["Floor slippery after cleaning", "Wrong cleaning product or residue - re-mop with plain water; check what product was used."],
      ["Board lifted or splintered", "Cover, cordon, flooring vendor; check for moisture underneath."],
    ],
    say: [
      ["Class briefing", "Quick note - this section of the barre is closed for repair, so we've spread the spots out a little more today. Please use the barre on the mirror side."],
    ],
    dos: [
      "Make it physically impossible to use the hazard.",
      "Test repairs before reopening.",
      "Check neighbouring sections for the same problem.",
    ],
    donts: [
      "Don't rely on a verbal warning alone.",
      "Don't attempt to re-anchor barres or remove mirror glass yourself.",
    ],
    closeOut: [
      "Repair done and tested.",
      "Spots unblocked in Momence.",
      "Hazard and repair recorded with photos.",
    ],
    prevention:
      "Include barres, mirrors and floors in the weekly safety walkthrough, use the approved floor-cleaning product only, and schedule an annual fixings check for barres and mirrors.",
    escalation:
      "Escalate to the Studio Director immediately if someone was injured, or if the hazard forces a studio closure or a significant capacity reduction.",
    relatedTemplates: ["TPL-197", "TPL-198", "TPL-199", "TPL-035"],
    tags: ["barre", "mirror", "floor", "hazard", "slip", "safety"],
  }),

  article({
    id: "KB-049",
    title: "Vendor No-Show, Poor Service or AMC Escalation",
    category: "Internal Operations & Admin",
    summary:
      "Getting a vendor (HVAC, AV, housekeeping, laundry, pest control, equipment) to deliver what the contract or AMC promises: evidence, a structured escalation ladder, and decisions on penalties or replacement.",
    glance: {
      priority: "P2 (P1 if the missed service affects classes or safety)",
      owner: "Studio Operations Manager",
      respond: "Within 4 hours of the missed service",
      resolve: "Vendor commitment within 24 hours; service within the SLA",
    },
    firstFive: [
      "Check the contract or AMC: what was promised (response time, visits, scope)?",
      "Collect the facts: booking time, promised visit, actual events, impact.",
      "Call the vendor's escalation contact, not just the technician.",
    ],
    steps: [
      "Pull the contract or AMC terms: scope, response time, number of visits, penalties.",
      "Record what happened: when the service was requested, what was promised, what actually happened, and the impact on classes or members.",
      "Call the vendor's service coordinator and get a committed visit time; confirm it in writing (email or WhatsApp).",
      "If the commitment is missed, escalate to the vendor's manager or owner the same day.",
      "Arrange an interim workaround if classes are affected (backup equipment, an alternative vendor for one-off work).",
      "Track all incidents for that vendor in IRIS so patterns are visible.",
      "Apply contractual penalties or withhold payment for undelivered services where the contract allows (with Finance).",
      "For repeat failures (3 in a quarter), get quotes from alternative vendors and recommend a replacement.",
      "Before AMC renewal, review the vendor's service history and negotiate based on the record.",
    ],
    diagnose: [
      ["Technician didn't show", "Escalate to the coordinator; ask for a same-day slot; log the no-show."],
      ["Visited but problem returned within 7 days", "Treat as the same incident - the repeat visit is free under most AMCs."],
      ["Vendor disputes scope", "Check the AMC wording; involve Finance before agreeing extra charges."],
      ["Invoice for work not done", "Hold payment and raise TPL-233."],
    ],
    say: [
      ["Escalating to the vendor manager", "Your technician was booked for 10 am yesterday and didn't come; our AC is still down and we've cancelled two classes. I need a technician here by 2 pm today and written confirmation of the fix."],
    ],
    dos: [
      "Get commitments in writing.",
      "Keep a per-vendor incident history.",
      "Use the history at renewal time.",
    ],
    donts: [
      "Don't pay invoices for services not delivered.",
      "Don't let a missed visit roll over without escalation.",
    ],
    closeOut: [
      "Service delivered and verified on site.",
      "Incident recorded against the vendor.",
      "Penalties, credits or replacement decision recorded.",
    ],
    prevention:
      "Keep all AMCs and escalation contacts in one place, set renewal reminders 60 days ahead, and review vendor performance quarterly.",
    escalation:
      "Escalate to the Studio Director when a vendor failure forces class cancellations, creates a safety risk, or the vendor misses service 3 times in a quarter.",
    relatedTemplates: ["TPL-102", "TPL-232", "TPL-233", "TPL-207"],
    tags: ["vendor", "amc", "contract", "service", "escalation"],
  }),
];
