// Knowledge Base — Repair & Maintenance: fresh air and humidity, headset mics,
// lighting and backup power, drains and hot water, Stages SC3 deep dives and
// Strength Lab equipment. KB-010 remains the SC3 overview; KB-116–118 go deeper.
import { article, type KnowledgeArticle } from "./compose";

export const REPAIR_MAINTENANCE_GUIDES: KnowledgeArticle[] = [
  article({
    id: "KB-109",
    title: "Fresh Air (TFA) Unit Fault",
    category: "Repair and Maintenance",
    subcategory: "AC & Ventilation",
    summary:
      "The treated fresh air (TFA) unit has stopped, is noisy or keeps tripping, so the studio feels stuffy, humid or stale even with the AC running. Check the basics, keep classes safe, and get the HVAC vendor in quickly.",
    glance: {
      priority: "P1 at peak hours (P2 otherwise)",
      owner: "Front Desk → Facilities Manager → HVAC vendor",
      respond: "Within 30 minutes",
      resolve: "Within 24 hours",
    },
    firstFive: [
      "Check the TFA controller: is it on, in auto mode, and showing a fault?",
      "Check the MCB for the TFA unit.",
      "Open the doors between classes to air the room.",
    ],
    steps: [
      "Note the controller's power status, mode and any fault codes.",
      "If the MCB has tripped, reset it once; if it trips again, leave it off and call the vendor.",
      "Air the room between classes and ease class intensity if it's stuffy (KB-075).",
      "Raise it to Facilities (TPL-177) with fault codes, photos and the rooms affected.",
      "The HVAC vendor checks the fan belt, motor, filters, dampers and controls.",
      "If the unit will be down for a while, reduce capacity in that room.",
      "After the fix, check air quality (with a CO₂ monitor if you have one) and member comfort.",
      "Update the maintenance log and check filter-change dates (TPL-047).",
    ],
    diagnose: [
      ["Unit running but no airflow", "Fan belt or damper — vendor visit."],
      ["Unit trips the MCB", "Electrical fault — leave it off and call the vendor."],
      ["Loud squealing", "Belt or bearing — switch off and call."],
      ["Musty smell from the vents", "Filters or drain pan need cleaning — see KB-110."],
    ],
    say: [
      [
        "In class",
        "We're fixing the fresh-air system today, so we'll keep the doors open between classes and take an extra water break.",
      ],
    ],
    dos: ["Note fault codes.", "Reset once only.", "Air the room."],
    donts: ["Don't keep resetting a unit that trips.", "Don't run full classes in a stuffy room."],
    closeOut: ["Unit repaired and air quality checked.", "Maintenance log updated."],
    prevention: "Service the TFA quarterly, change filters on schedule and monitor CO₂ in busy rooms.",
    escalation: "Escalate to the Facilities Manager if it can't be fixed within 24 hours or members feel unwell.",
    relatedTemplates: ["TPL-177", "TPL-047", "TPL-178"],
    tags: ["tfa", "fresh air", "ventilation", "stuffy", "hvac", "air quality"],
  }),

  article({
    id: "KB-110",
    title: "Studio Humidity, Odour or Stuffiness",
    category: "Repair and Maintenance",
    subcategory: "AC & Ventilation",
    summary:
      "The studio feels humid, smells musty or stale, or the air feels heavy — especially in the monsoon. Find the source (HVAC, damp, drains, cleaning), dry and air the space, and fix the cause rather than masking it.",
    glance: {
      priority: "P2 (P1 for visible mould or repeated complaints)",
      owner: "Facilities Manager",
      respond: "Within 4 hours",
      resolve: "Within 1 week",
    },
    firstFive: [
      "Check humidity on a hygrometer — aim for 40–60%.",
      "Track down the source: vents, drains, mats, carpets or walls.",
      "Air the room and run dehumidifiers if you have them.",
    ],
    steps: [
      "Measure humidity and temperature in the room and note the time of day.",
      "Check the AC and fresh-air unit are working (KB-109) — poor fresh air causes stuffiness.",
      "Look for damp, seepage or mould on walls and ceilings and under mats (KB-033).",
      "Check drains and traps — a dry trap lets sewer smells in; pour water in to refill it.",
      "Deep-clean mats, props and soft furnishings, and dry them fully.",
      "Run dehumidifiers through the monsoon and air the room between classes.",
      "Log it (TPL-178) and ask the HVAC vendor to check dehumidification and filters (TPL-047).",
      "For visible mould, book a specialist clean and fix the moisture source.",
    ],
    diagnose: [
      ["Sewer smell near the washroom", "Dry trap or blocked vent — refill the trap and call the plumber."],
      ["Musty smell from mats", "Deep-clean and dry them; replace old mats."],
      ["Humid all day", "Check the AC's dehumidification and the fresh-air unit."],
    ],
    say: [
      [
        "Reply",
        "Thanks for flagging the smell — we found a dry drain trap and fixed it, and the room has been deep-cleaned and aired.",
      ],
    ],
    dos: ["Measure humidity.", "Find the source.", "Dry everything fully."],
    donts: ["Don't mask smells with fragrance.", "Don't ignore visible mould."],
    closeOut: ["Source found and fixed.", "Humidity back in range."],
    prevention: "Use hygrometers and dehumidifiers in the monsoon, clean mats weekly and keep drain traps topped up.",
    escalation: "Escalate to the Facilities Manager for mould, or smells that return after cleaning.",
    relatedTemplates: ["TPL-178", "TPL-047", "TPL-038"],
    tags: ["humidity", "odour", "smell", "mould", "monsoon", "air quality"],
  }),

  article({
    id: "KB-111",
    title: "Headset Mic Dropping Out or Trainer Device Won't Connect",
    category: "Repair and Maintenance",
    subcategory: "Audio & Microphones",
    summary:
      "The trainer's headset mic cuts out, crackles or loses signal mid-class, or their phone won't connect to the studio audio. Get class going on a backup fast, then sort out batteries, frequencies and pairing properly.",
    glance: {
      priority: "P1 during class (P2 otherwise)",
      owner: "Trainer / Front Desk → Facilities (AV vendor)",
      respond: "Within 2 minutes in class",
      resolve: "Same day",
    },
    firstFive: [
      "Swap to the spare headset with fresh batteries.",
      "If the phone won't connect, use the studio's backup device or the aux cable.",
      "Keep the class moving — cue loudly if you have to.",
    ],
    steps: [
      "Change the transmitter batteries first — low batteries cause most dropouts.",
      "Check the mic is plugged firmly into the transmitter and the antenna isn't damaged.",
      "Check the receiver channel matches the transmitter and no other room uses the same frequency.",
      "Phone won't connect: forget and re-pair the Bluetooth, or use the aux cable or backup device (TPL-181).",
      "Crackling through the speakers follows KB-013; a mic that doesn't work at all follows KB-005.",
      "Log the fault (TPL-179) with the headset ID and room, and take faulty kit out of service.",
      "Keep charged spare batteries and a spare headset at the desk.",
    ],
    diagnose: [
      ["Drops out in one part of the room", "Range or antenna — reposition the receiver."],
      ["Two rooms interfering", "Move one pair to a different channel."],
      ["Crackles when the trainer moves", "Damaged mic cable — replace the headset."],
    ],
    say: [["In class", "Give me ten seconds to switch mics — keep riding at this pace!"]],
    dos: ["Change batteries first.", "Keep spares charged.", "Take faulty kit out of use."],
    donts: ["Don't stop class for a long fix.", "Don't put a faulty headset back in the drawer."],
    closeOut: ["Backup in use and faulty kit tagged.", "Fault logged with the headset ID."],
    prevention: "Charge batteries daily, label headsets by room, and test each mic before the first class.",
    escalation: "Escalate to Facilities if the spares fail too, or interference continues after a channel change.",
    relatedTemplates: ["TPL-179", "TPL-181", "TPL-034"],
    tags: ["headset mic", "microphone", "dropout", "bluetooth", "audio", "trainer device"],
  }),

  article({
    id: "KB-112",
    title: "Lighting or Dimmer Fault in the Studio",
    category: "Repair and Maintenance",
    subcategory: "Electrical & Lighting",
    summary:
      "Studio lights flicker, won't dim or brighten, scenes won't change, or a section has gone dark. Keep the room safe to use, check switches and controllers, and get an electrician for anything beyond a simple reset.",
    glance: {
      priority: "P2 (P1 if it's too dark to exercise safely or there's a burning smell)",
      owner: "Front Desk → Facilities Manager → electrician",
      respond: "Within 30 minutes",
      resolve: "Within 48 hours",
    },
    firstFive: [
      "Check the room is bright enough to exercise safely; move the class if it isn't.",
      "Check the switch, dimmer panel and MCB.",
      "For a burning smell or sparks, switch off at the MCB and call Facilities.",
    ],
    steps: [
      "Check the dimmer or scene controller has power and is on the right setting.",
      "Check the MCB for the lighting circuit and reset it once if it tripped.",
      "Flickering LEDs on a dimmer usually mean a driver fault — note which fittings flicker.",
      "Log it (TPL-040 for failures, TPL-186 for ambient or dimmer faults) with photos and the fittings affected.",
      "Call the electrician for drivers, dimmers and wiring — don't open fittings yourself (TPL-037).",
      "If one section is dark, use the rest of the room and keep walkways lit.",
      "Test every scene and the full dimming range after the repair.",
    ],
    diagnose: [
      ["All lights out in one room", "Tripped MCB — reset once; if it trips again, call the electrician."],
      ["Flickers only when dimmed", "LED driver or incompatible dimmer — electrician."],
      ["Scene buttons do nothing", "Controller fault — check its power and reset it."],
    ],
    say: [
      [
        "In class",
        "We've got a lighting fault at the back today, so we've moved you a little further forward where it's brighter.",
      ],
    ],
    dos: ["Keep the room safe to use.", "Reset once only.", "Log the affected fittings."],
    donts: ["Don't open light fittings.", "Don't run a class in a dark room."],
    closeOut: ["Lights fixed and scenes tested.", "Fault logged."],
    prevention: "Include lighting in monthly checks and keep spare LED drivers and lamps.",
    escalation:
      "Escalate to the Facilities Manager for burning smells, repeated tripping or a whole-room outage (see KB-034).",
    relatedTemplates: ["TPL-040", "TPL-186", "TPL-037"],
    tags: ["lighting", "dimmer", "flickering", "led", "electrical", "studio lights"],
  }),

  article({
    id: "KB-113",
    title: "Inverter or UPS Backup Not Working During a Power Cut",
    category: "Repair and Maintenance",
    subcategory: "Electrical & Lighting",
    summary:
      "The power has gone and the inverter or UPS hasn't kicked in, or it runs out far sooner than it should. Keep people safe in the dark, protect equipment, and get the backup repaired before the next outage.",
    glance: {
      priority: "P1 (P0 if members are in a dark studio)",
      owner: "Front Desk → Facilities Manager → inverter/UPS vendor",
      respond: "Immediately",
      resolve: "Repair within 24–48 hours",
    },
    firstFive: [
      "Turn on torches or phone lights and keep members still until there's light.",
      "Check whether just the studio or the whole building has lost power.",
      "Switch off sensitive equipment so it isn't damaged when power returns.",
    ],
    steps: [
      "Keep members safe: stop the class, use torches and guide people away from bikes and weights (KB-034).",
      "Check the inverter or UPS display for errors and battery level, and that it's switched on.",
      "Check the changeover switch and the inverter's MCB.",
      "If the battery drained quickly, note how long it lasted and what was running.",
      "Log it (TPL-185) with times, display messages and the loads that were on.",
      "Book the vendor to test the batteries and changeover.",
      "Keep the backup for essentials — lights, router, POS and emergency lighting, never the AC.",
      "After the repair, test the backup with a planned switch-off.",
    ],
    diagnose: [
      ["Inverter beeps and shuts off", "Overloaded — cut the load."],
      ["Backup lasts 10 minutes instead of an hour", "Batteries are worn — replace them."],
      ["No changeover at all", "Changeover switch or inverter fault — vendor."],
    ],
    say: [
      [
        "In the studio",
        "We've lost power for a moment — please stay where you are and hold still on your bike. We'll have lights on in a minute.",
      ],
    ],
    dos: ["Keep members still in the dark.", "Cut the load to essentials.", "Test the backup monthly."],
    donts: ["Don't put the AC on backup power.", "Don't restart equipment until power is stable."],
    closeOut: ["Backup repaired and tested.", "Outage logged."],
    prevention: "Test the backup monthly, replace batteries on schedule, and label which sockets run on backup.",
    escalation:
      "Escalate to the Facilities Manager if the backup fails twice, or if a battery swells or leaks. If the studio must close, use TPL-109.",
    relatedTemplates: ["TPL-185", "TPL-037", "TPL-109"],
    tags: ["inverter", "ups", "power cut", "backup power", "batteries", "emergency lighting"],
  }),

  article({
    id: "KB-114",
    title: "Blocked Drain, Overflow or Toilet Blockage",
    category: "Repair and Maintenance",
    subcategory: "Plumbing & Water",
    summary:
      "A shower drain, basin, floor trap or toilet is blocked or overflowing. Stop the water, keep people away from the wet area, clean up safely, and call a plumber for anything a plunger won't clear.",
    glance: {
      priority: "P1 (P0 if sewage is overflowing into the studio)",
      owner: "Front Desk / Housekeeping → Facilities Manager → plumber",
      respond: "Within 15 minutes",
      resolve: "Same day",
    },
    firstFive: [
      "Stop using the fixture and turn off its water supply if water is still running.",
      "Put out wet-floor signs and close the area.",
      "Move mats, towels and anything electrical away from the water.",
    ],
    steps: [
      "Close the area, put out signs and stop the water at the isolation valve.",
      "Use a plunger for a simple blockage, and clear hair from shower drain covers.",
      "Don't use harsh drain chemicals — they damage pipes and are a hazard.",
      "Mop and disinfect; sewage needs gloves and a full disinfectant clean.",
      "Log it (TPL-036) with photos and the fixture.",
      "Call the plumber if plunging fails, several drains are slow, or the floor trap smells.",
      "If the building's main line is blocked, raise it with the society (KB-107).",
      "Reopen only when it drains freely and the area is clean and dry.",
    ],
    diagnose: [
      ["Shower draining slowly", "Hair in the trap — clean the cover and trap."],
      ["Several drains backing up", "Main line blockage — plumber and the society."],
      ["Toilet overflowing", "Close the valve behind the toilet, then plunge."],
    ],
    say: [
      [
        "At the desk",
        "One shower is out of use while we clear a blocked drain — the others are fine, and we'll have it back later today.",
      ],
    ],
    dos: ["Stop the water first.", "Sign the wet area.", "Disinfect after any sewage."],
    donts: ["Don't pour drain chemicals in.", "Don't reopen until it drains freely."],
    closeOut: ["Drain clear and area disinfected.", "Fixture back in use."],
    prevention: "Fit hair catchers, clean drain covers daily, and have the plumber jet the lines yearly.",
    escalation:
      "Escalate to the Facilities Manager for sewage overflows or blockages across several fixtures; leaks into ceilings follow KB-033.",
    relatedTemplates: ["TPL-036", "TPL-038", "TPL-184"],
    tags: ["blocked drain", "overflow", "toilet", "plumbing", "shower drain", "sewage"],
  }),

  article({
    id: "KB-115",
    title: "No Hot Water or Low Shower Pressure",
    category: "Repair and Maintenance",
    subcategory: "Plumbing & Water",
    summary:
      "The showers run cold or the water pressure is weak. Check the geyser or heat pump and the supply, keep members informed, and get it fixed before the next peak.",
    glance: {
      priority: "P2 (P1 at peak hours with every shower affected)",
      owner: "Front Desk → Facilities Manager → plumber / electrician",
      respond: "Within 30 minutes",
      resolve: "Within 24 hours",
    },
    firstFive: [
      "Check whether every shower or just one is affected.",
      "Check the geyser or heat pump is on and its MCB hasn't tripped.",
      "Tell members at check-in.",
    ],
    steps: [
      "Check the geyser or heat pump: power, thermostat setting and indicator lights.",
      "Check the water heater's MCB and reset it once if it tripped.",
      "Low pressure: check the building tank and pressure pump, and ask the society about supply problems (KB-107).",
      "Only one shower affected: descale the shower head and check its mixer valve.",
      "Log it (TPL-182) with the showers affected and what you've checked.",
      "Call the plumber or electrician as needed — don't open the geyser (TPL-036, TPL-037).",
      "After the fix, test hot water and pressure at every shower.",
    ],
    diagnose: [
      ["Lukewarm at peak times", "The heater can't keep up — check its capacity or stagger use."],
      ["Water heater MCB keeps tripping", "Element fault — electrician."],
      ["Weak flow from one shower head", "Limescale — descale the head."],
    ],
    say: [
      [
        "At check-in",
        "Just a heads-up — the hot water is being fixed this morning, so the showers may be cool. We'll let you know as soon as it's back.",
      ],
    ],
    dos: ["Check every shower.", "Reset once only.", "Tell members early."],
    donts: ["Don't open the geyser.", "Don't leave a tripping heater switched on."],
    closeOut: ["Hot water and pressure restored.", "Fault logged."],
    prevention: "Descale shower heads monthly and service water heaters before winter.",
    escalation: "Escalate to the Facilities Manager if the heater trips repeatedly or the building supply is the cause.",
    relatedTemplates: ["TPL-182", "TPL-036", "TPL-037"],
    tags: ["hot water", "shower pressure", "geyser", "heat pump", "showers", "plumbing"],
  }),

  article({
    id: "KB-116",
    title: "SC3 Console Blank or Power Meter Not Reading",
    category: "Repair and Maintenance",
    subcategory: "PowerCycle Bikes",
    summary:
      "A Stages SC3 console stays blank, or the SPM2 power meter shows zero watts, jumps around or won't pair. Move the rider, then work through power, batteries, pairing and the zero reset — a deeper version of the console steps in KB-010.",
    glance: {
      priority: "P2 (P1 if several bikes fail before a class)",
      owner: "PowerCycle trainer / Front Desk → PowerCycle lead → Stages service technician",
      respond: "Before the bike's next class",
      resolve: "Field fix the same day; technician within 72 hours",
    },
    firstFive: [
      "Move the rider to a working bike and block the faulty one in Momence (KB-064).",
      "Pedal for 10 seconds to wake the console.",
      "Check whether neighbouring bikes show the same fault.",
    ],
    steps: [
      "Console blank: check the power wire in the channel under the handlebar is connected, then replace the console batteries.",
      "Still blank: re-seat the console's 3 mm hex screws; if it stays dead, the SIC2 console needs replacing (TPL-191).",
      "Zero watts or the meter won't pair: replace the SPM2's AA batteries using the battery spacer — never tape them.",
      "Re-pair the meter using the 5-digit ANT+ ID shown on the console.",
      "Numbers look wrong: run the zero reset with no weight on the pedals — the ADC should read 790–990.",
      "If the ADC is still outside that range after 3 attempts, the crank arm needs re-seating at 52–57 N·m — book the technician (TPL-192).",
      "Several bikes dropping out together: look for interference such as a new wireless device nearby, and tell the PowerCycle lead.",
      "Log the bike number, symptom, readings and parts used, and test-ride for 2 minutes after any fix.",
    ],
    diagnose: [
      ["Console blank even after pedalling", "Power wire or console batteries — check, then replace."],
      ["Cadence shows but watts are zero", "SPM2 batteries or pairing."],
      ["Watts far too high or low", "Zero reset; if the ADC is out of range, call the technician."],
    ],
    say: [
      [
        "At the bike",
        "Your console isn't reading today, so I've moved you to bike 12 — it's already set to your height.",
      ],
    ],
    dos: ["Move riders before class starts.", "Use the battery spacer in the SPM2.", "Record readings and parts used."],
    donts: ["Don't open the crank or power meter housing.", "Don't leave a faulty bike bookable."],
    closeOut: ["Bike fixed and test-ridden, or blocked with a technician visit booked.", "Repair log updated."],
    prevention:
      "Replace SPM2 batteries quarterly and console batteries on schedule, and check every console on the opening walk-through.",
    escalation:
      "Escalate to the PowerCycle lead if more than two bikes are affected, and to the vendor as a warranty issue if the same bike fails again within 30 days.",
    relatedTemplates: ["TPL-191", "TPL-192", "TPL-134"],
    tags: ["powercycle", "stages sc3", "console", "power meter", "spm2", "pairing"],
  }),

  article({
    id: "KB-117",
    title: "Pedal, Seat or Handlebar Fault — Safe Field Fix",
    category: "Repair and Maintenance",
    subcategory: "PowerCycle Bikes",
    summary:
      "A PowerCycle pedal is loose, clicking or has come off, the saddle slips, or the handlebar sinks mid-class. These are safety faults: stop the ride, fix them with the right tools and torque, or retire the bike until the technician comes.",
    glance: {
      priority: "P1 — safety fault",
      owner: "PowerCycle trainer → PowerCycle lead / Facilities → Stages service technician",
      respond: "Immediately — stop the ride",
      resolve: "Field fix the same day; technician within 72 hours",
    },
    firstFive: [
      "Stop the rider and move them to another bike.",
      "Tag the bike OUT OF ORDER and block it in Momence.",
      "Note the bike number and exactly what moved or clicked.",
    ],
    steps: [
      "Nobody keeps riding a bike with a pedal, saddle or handlebar fault — not even to finish the song.",
      "Loose pedal: refit with a 15 mm pedal wrench at 42 N·m — the right pedal tightens clockwise; the left (CR-L) is reverse-threaded and tightens anti-clockwise.",
      "If a pedal binds or won't thread smoothly, stop — it may be cross-threaded and the crank may need replacing (TPL-193).",
      "Still clicking with every stroke once the pedal is tight: suspect the crank arm — re-seating at 52–57 N·m is a technician job.",
      "Handlebar sinking: push the FitLoc lever fully down until it clicks and check the post's insertion line isn't showing; if it still slips, the FitLoc needs replacing (TPL-194).",
      "Saddle slipping or rotating: tighten the 13 mm saddle clamp, and replace the clamp if it's stripped.",
      "Test-ride for 2 minutes, standing and seated, before the bike goes back into service.",
      "Log the fix with torque values and parts, and set follow-up checks at 5 and 10 days.",
    ],
    diagnose: [
      ["Click on every pedal stroke", "Loose pedal or crank arm — check the torque."],
      ["Handlebar drops during class", "FitLoc not engaged, or worn."],
      ["Pedal came off", "Out of use; check the threads for damage before refitting."],
      ["Saddle tilts under load", "Saddle clamp loose or stripped."],
    ],
    say: [
      [
        "Mid-class",
        "Hop off for me — let's move you to bike 14. This one needs a check before anyone rides it again. Thanks for telling me.",
      ],
    ],
    dos: ["Stop the ride straight away.", "Use a torque wrench.", "Remember the left pedal is reverse-threaded."],
    donts: ["Don't force a binding pedal.", "Don't return a bike to service without a test ride."],
    closeOut: [
      "Bike fixed and test-ridden, or blocked with a technician booked.",
      "Torque values and parts logged.",
      "Follow-up checks set.",
    ],
    prevention:
      "Check pedals, FitLoc and saddle on every opening walk-through, and pedal torque monthly with a torque wrench.",
    escalation:
      "Escalate to the Studio Operations Manager immediately if a rider was hurt (log it under KB-020), and to the vendor if the same bike fails again within 30 days.",
    relatedTemplates: ["TPL-193", "TPL-194", "TPL-035"],
    tags: ["powercycle", "pedal", "fitloc", "saddle", "handlebar", "bike safety"],
  }),

  article({
    id: "KB-118",
    title: "Resistance, Brake or Flywheel Noise on a PowerCycle Bike",
    category: "Repair and Maintenance",
    subcategory: "PowerCycle Bikes",
    summary:
      "The resistance knob does nothing, the emergency brake won't stop the flywheel, or the bike squeals, grinds, scrapes or wobbles. Take it out of use, do the safe checks, and leave brake and belt work to the technician.",
    glance: {
      priority: "P1 for brake or flywheel faults (P2 for a wobble only)",
      owner: "PowerCycle trainer → PowerCycle lead → Stages service technician",
      respond: "Before the bike's next class",
      resolve: "Technician within 72 hours",
    },
    firstFive: [
      "Test the emergency brake: pressing down on the resistance knob must stop the flywheel.",
      "If it doesn't stop, or there's grinding or scraping, tag and block the bike.",
      "Note the bike number and the sound or behaviour.",
    ],
    steps: [
      "Brake doesn't stop the flywheel: the bike comes out of use immediately (TPL-195).",
      "Resistance knob does nothing: look under the shroud for a detached or broken brake cable; if the cable is intact, the magnetic brake gap needs the technician.",
      "Squealing, slipping, grinding or scraping from the flywheel area: out of use — belt tension and flywheel faults are technician-only (TPL-196).",
      "Wobbling: adjust the four levelling feet (14 mm nut) until all touch the floor, then tighten the M10 stabiliser bolts.",
      "Log the symptom, a short recording of the noise if you can, and what you checked.",
      "Book the technician and keep the bike blocked in Momence until it's fixed (TPL-207 for the service visit).",
      "After the repair, test resistance across the full range and the emergency stop.",
    ],
    diagnose: [
      ["Grinding or scraping", "Brake or flywheel housing misaligned — technician."],
      ["Rhythmic squeak", "Belt — technician."],
      ["Rocks from side to side", "Levelling feet and stabiliser bolts."],
    ],
    say: [
      [
        "At the bike",
        "I'm taking this bike out for a check because the resistance isn't working properly — let's get you set up on bike 6.",
      ],
    ],
    dos: ["Test every brake on the opening walk-through.", "Record the noise.", "Keep the bike blocked until it's fixed."],
    donts: ["Don't adjust belt tension or the brake gap yourself.", "Don't let anyone ride a bike whose brake won't stop the flywheel."],
    closeOut: ["Repaired by the technician and tested, or still blocked.", "Repair log updated."],
    prevention: "Service belts and brakes on the Stages schedule and test every bike's emergency stop daily.",
    escalation:
      "Escalate to the Studio Operations Manager if more than one bike has a brake fault, and to the vendor for repeats within 30 days.",
    relatedTemplates: ["TPL-195", "TPL-196", "TPL-207"],
    tags: ["powercycle", "resistance", "brake", "flywheel", "belt noise", "wobble"],
  }),

  article({
    id: "KB-119",
    title: "Strength Lab Rack, Cable Machine or Bench Fault",
    category: "Repair and Maintenance",
    subcategory: "Barre, Floor & Strength Equipment",
    summary:
      "A rack, cable machine, bench or attachment in the Strength Lab is damaged, frayed, wobbly or won't lock. Take it out of use straight away, check what's safe, and get it repaired or replaced — cables and pins are never patched up.",
    glance: {
      priority: "P1 (P0 if a cable is frayed or a pin won't lock)",
      owner: "Trainer / Front Desk → Facilities Manager → equipment vendor",
      respond: "Immediately",
      resolve: "Repair within 72 hours",
    },
    firstFive: [
      "Stop use and clear people away from the equipment.",
      "Tag it OUT OF ORDER and safely unload any weight stack or plates.",
      "Photograph the damage.",
    ],
    steps: [
      "Inspect for frayed or kinked cables, cracked pulleys, bent pins, loose bolts, torn upholstery and wobbling frames.",
      "Frayed cable or bent selector pin: out of use until replaced — no temporary fixes.",
      "Loose bolts on benches or racks: tighten them only if it's a simple bolt and you have the right tool; otherwise call the vendor.",
      "Torn upholstery: cover the tear, or remove the bench if foam or staples are exposed.",
      "Damaged or missing dumbbells and kettlebells: take damaged ones out and log missing items (TPL-201).",
      "Log it (TPL-200) with photos and the equipment ID; damage caused by a member follows KB-019.",
      "Book the vendor, keep the equipment tagged, and adjust class plans to work around it.",
      "After the repair, test it under load before it goes back into use.",
    ],
    diagnose: [
      ["Cable fraying at a pulley", "Replace the cable — out of use until then."],
      ["Selector pin won't seat fully", "Bent pin or stack — out of use."],
      ["Bench wobbles", "Tighten the bolts or level the feet."],
    ],
    say: [
      [
        "To the class",
        "This cable machine is out today while we replace a part — we'll do the dumbbell variation instead.",
      ],
    ],
    dos: ["Tag faulty equipment immediately.", "Inspect weekly.", "Test under load after a repair."],
    donts: ["Don't patch cables or pins.", "Don't leave damaged weights in the rack."],
    closeOut: ["Repaired and load-tested, or tagged with a vendor visit booked.", "Logged with photos."],
    prevention: "Run a weekly Strength Lab inspection checklist and follow the vendor's service schedule (TPL-207).",
    escalation:
      "Escalate to the Facilities Manager immediately if equipment failed during use or someone was hurt (KB-020).",
    relatedTemplates: ["TPL-200", "TPL-201", "TPL-207"],
    tags: ["strength lab", "cable machine", "rack", "bench", "weights", "equipment safety"],
  }),
];
