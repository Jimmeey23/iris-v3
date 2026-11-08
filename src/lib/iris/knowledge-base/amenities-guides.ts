// Knowledge Base — Studio Amenities & Facilities: steam room, towels and
// laundry, pests, between-class resets, drinking water, consumables, and
// disruptions or complaints involving the building and neighbours.
import { article, type KnowledgeArticle } from "./compose";

export const AMENITIES_GUIDES: KnowledgeArticle[] = [
  article({
    id: "KB-101",
    title: "Steam Room Not Heating or Unsafe",
    category: "Studio Amenities and Facilities",
    subcategory: "Changing Rooms & Showers",
    summary:
      "The steam room isn't heating, leaks steam or water, smells of burning, or its timer or controls have failed. Close it safely, check the basics, get the vendor in, and keep members informed.",
    glance: {
      priority: "P2 (P0 for a burning smell, sparks or anyone unwell inside)",
      owner: "Front Desk → Facilities Manager → steam vendor",
      respond: "Within 30 minutes",
      resolve: "Within 48 hours",
    },
    firstFive: [
      "If anyone feels faint, help them out, sit them down and give water (KB-138).",
      "For a burning smell or sparks, switch off the steam generator at its isolator and close the room.",
      "Put up the 'temporarily closed' sign.",
    ],
    steps: [
      "Close the room with the branded closed sign and tell the desk so members are told at check-in.",
      "Check the basics: power to the generator (isolator and MCB), the water supply valve, and the control panel for error codes.",
      "Note the symptoms: no steam, weak steam, water pooling, an error code, a damaged door seal or a timer that won't stop.",
      "Raise it to Facilities (TPL-183) with photos and the error code; electrical faults also go on TPL-037 and leaks on TPL-036.",
      "Don't open the generator casing or keep resetting it — book the steam vendor under the AMC.",
      "Make sure the drain is clear and the floor dry before reopening.",
      "After the repair, run a full cycle and test the temperature, timer and emergency stop before reopening.",
      "Log the outage and the fix; repeat faults feed into the AMC review (KB-152).",
    ],
    diagnose: [
      ["No steam and an error on the panel", "Note the code, power-cycle once at the isolator, then call the vendor."],
      ["Steam works but water pools on the floor", "Close it — slip risk — and have the drain and nozzle checked."],
      ["Burning or electrical smell", "Isolate the power, close the room and call Facilities now."],
      ["Too hot, or the timer won't stop", "Switch off at the isolator and keep it closed until serviced."],
    ],
    say: [
      [
        "At the desk",
        "The steam room is closed today while our technician repairs it — sorry about that. The showers and changing rooms are open as normal.",
      ],
    ],
    dos: ["Close it at the first sign of a fault.", "Isolate the power for any burning smell.", "Test fully before reopening."],
    donts: ["Don't open the generator yourself.", "Don't reopen with water pooling on the floor."],
    closeOut: ["Repaired, tested and reopened.", "Outage and fix logged."],
    prevention:
      "Descale the generator on the vendor's schedule (more often with hard water), and check the drain, door seal and emergency stop weekly.",
    escalation:
      "Escalate to the Facilities Manager immediately for electrical smells or sparks, and if the vendor can't attend within 48 hours.",
    relatedTemplates: ["TPL-183", "TPL-037", "TPL-036"],
    tags: ["steam room", "steam generator", "changing rooms", "amenities", "slip risk"],
  }),

  article({
    id: "KB-102",
    title: "Towel Shortage or Laundry Delay",
    category: "Studio Amenities and Facilities",
    subcategory: "Housekeeping & Hygiene",
    summary:
      "Clean towels have run out or the laundry vendor is late, so members can't shower or wipe down. Stretch what you have, arrange a backup delivery, and fix the par levels and vendor schedule.",
    glance: {
      priority: "P2 (P1 at peak hours with no towels left)",
      owner: "Front Desk Lead → Facilities / Operations",
      respond: "Within 30 minutes",
      resolve: "Same day",
    },
    firstFive: [
      "Count the clean towels left and check the classes coming up.",
      "Call the laundry vendor for a delivery time.",
      "Let members know at check-in if towels are limited.",
    ],
    steps: [
      "Count clean stock against the par level (for example, three times the day's peak bookings).",
      "Keep towels for showers first, and ask members to bring their own sweat towel while stock is low.",
      "Get the vendor's ETA; if it's after the next peak, arrange a backup (a second vendor or an emergency wash).",
      "Log the shortage (TPL-187) with counts, times and the vendor's reason.",
      "Check for losses — towels taken home, damaged, or miscounted on delivery.",
      "If the vendor is repeatedly late or short, raise it (TPL-102) and apply the service terms (KB-049).",
      "Review par levels each quarter against bookings.",
    ],
    diagnose: [
      ["Delivery count is short", "Count on delivery and sign only for what arrived."],
      ["Towels smell or are stained", "Reject the batch and ask for a rewash (TPL-188)."],
      ["Towels keep disappearing", "Count them out and back in every day."],
    ],
    say: [
      [
        "At check-in",
        "We're low on towels this morning while our laundry delivery arrives — I've kept one aside for your shower. Fresh stock will be here by 11.",
      ],
    ],
    dos: ["Keep a par level.", "Count every delivery.", "Tell members early."],
    donts: ["Don't hand out unwashed towels.", "Don't sign for a delivery without counting it."],
    closeOut: ["Stock back to par.", "Vendor issue logged."],
    prevention: "Set par levels per studio, count towels in and out daily, and keep a backup vendor on file.",
    escalation: "Escalate to the Facilities Manager if the vendor misses two deliveries in a month.",
    relatedTemplates: ["TPL-187", "TPL-102", "TPL-188"],
    tags: ["towels", "laundry", "shortage", "laundry vendor", "changing room", "housekeeping"],
  }),

  article({
    id: "KB-103",
    title: "Pest Sighting — Cockroaches, Rodents or Insects",
    category: "Studio Amenities and Facilities",
    subcategory: "Housekeeping & Hygiene",
    summary:
      "Someone spots cockroaches, rats, mosquitoes, ants or other pests in the studio. Act quickly and discreetly, close the area if needed, get pest control in, and remove the cause.",
    glance: {
      priority: "P1 (P0 for rodents in food or changing areas during opening hours)",
      owner: "Front Desk → Facilities Manager → pest control vendor",
      respond: "Within 1 hour",
      resolve: "Treatment within 24–48 hours",
    },
    firstFive: [
      "Thank the person who reported it and apologise.",
      "Note where and what was seen, with a photo if possible.",
      "Close or cordon off the area if it's a changing room, pantry or studio floor.",
    ],
    steps: [
      "Remove food and standing water nearby and clean the area.",
      "Log the sighting (TPL-043) with the location, time, type of pest and photos.",
      "Book pest control within 24–48 hours — sooner for rodents.",
      "Check the chemicals and timing: treat after hours and air the space before members return.",
      "Find the cause: food waste, drains, gaps under doors, damp, or the building's common areas.",
      "Seal entry points, fix leaks and tighten housekeeping (TPL-038).",
      "If pests are coming from the building, raise it with the society (KB-107).",
      "Follow up with the person who reported it.",
    ],
    diagnose: [
      ["Cockroaches near drains", "Gel treatment and drain covers."],
      ["Rodent droppings", "Urgent visit, traps, and sealing entry points."],
      ["Mosquitoes in the monsoon", "Check for stagnant water and the fogging schedule."],
    ],
    say: [
      [
        "Reply",
        "Thank you for letting us know — I'm sorry you saw that. Pest control is coming tonight after closing, and the changing room will be deep cleaned before we open tomorrow.",
      ],
    ],
    dos: ["Act the same day.", "Treat after hours.", "Remove the cause."],
    donts: ["Don't spray chemicals during classes.", "Don't ignore a single sighting."],
    closeOut: ["Treatment done and area cleaned.", "Cause fixed and reporter updated."],
    prevention: "Schedule monthly pest control, keep food out of studio areas, and fit drain covers.",
    escalation:
      "Escalate to the Facilities Manager for rodents or repeat sightings, and to the building society for infestations in common areas.",
    relatedTemplates: ["TPL-043", "TPL-038", "TPL-102"],
    tags: ["pest", "cockroach", "rodent", "mosquito", "pest control", "hygiene"],
  }),

  article({
    id: "KB-104",
    title: "Between-Class Reset Lapses — Studio Not Ready",
    category: "Studio Amenities and Facilities",
    subcategory: "Housekeeping & Hygiene",
    summary:
      "The studio wasn't reset between classes — sweaty bikes, props left out, mats not wiped, rubbish on the floor or a stale room. Fix it before the next class starts, then tighten the reset routine.",
    glance: {
      priority: "P2 (P1 if members are waiting to go in)",
      owner: "Front Desk / Housekeeping → Studio Operations Manager",
      respond: "Immediately",
      resolve: "Before the next class starts",
    },
    firstFive: [
      "Hold entry for a minute or two if needed and reset the room.",
      "Wipe bikes, barres and mats, and clear props and rubbish.",
      "Air the room and bring the AC back to its setpoint.",
    ],
    steps: [
      "Reset now: wipe high-touch surfaces, put props away, clear rubbish and check the floor is dry.",
      "Count props (bands, balls, weights) and log anything missing (TPL-205).",
      "Check the room is aired and the temperature is back to standard.",
      "Find out why it was missed: back-to-back classes, no housekeeping cover, or unclear ownership.",
      "Log the lapse (TPL-038, or TPL-188 for changing rooms) with times.",
      "Agree who owns each task — trainers put props away, housekeeping wipes down and checks.",
      "Put a reset checklist on the studio door, signed after every class.",
    ],
    diagnose: [
      ["Only 5 minutes between classes", "Build a buffer into the schedule (see KB-079)."],
      ["Housekeeping not on shift", "Fix the roster and name a backup."],
      ["Props always missing", "Count props at every reset."],
    ],
    say: [["At the studio door", "Give us two minutes to get the room fresh for you — we'll still start on time."]],
    dos: ["Reset before members enter.", "Assign ownership.", "Use a checklist."],
    donts: ["Don't let members into an unwiped room.", "Don't skip the props count."],
    closeOut: ["Room reset and checklist signed.", "Lapse logged and cause fixed."],
    prevention: "Keep a 10-minute buffer between classes and a reset checklist on every studio door.",
    escalation: "Escalate to the Studio Operations Manager if lapses repeat within a week.",
    relatedTemplates: ["TPL-038", "TPL-188", "TPL-205"],
    tags: ["studio reset", "cleaning", "between classes", "hygiene", "props", "housekeeping"],
  }),

  article({
    id: "KB-105",
    title: "Water Dispenser Not Working or Water Quality Concern",
    category: "Studio Amenities and Facilities",
    subcategory: "Lounge, Pantry & Supplies",
    summary:
      "The water dispenser isn't cooling, isn't dispensing or is leaking, or members report an odd taste or smell. Provide safe water straight away, stop using a suspect unit, and get it serviced or the water tested.",
    glance: {
      priority: "P2 (P1 if there's no drinking water during classes or the quality is in doubt)",
      owner: "Front Desk → Facilities / Operations",
      respond: "Within 30 minutes",
      resolve: "Within 24 hours",
    },
    firstFive: [
      "Put out sealed bottled water if the dispenser is down.",
      "If the taste or smell is off, stop using it and tape it off.",
      "Check the power, water supply and filter indicator.",
    ],
    steps: [
      "Provide an alternative straight away — sealed bottles or jars from pantry stock (TPL-235).",
      "Check the basics: power, the supply valve, how the bottle is seated on bottle-fed units, and the filter indicator.",
      "Leaking: switch off, isolate the supply and dry the floor so no one slips.",
      "Odd taste, smell or colour: stop using it, label it out of order, and ask the vendor to test the water and change the filters.",
      "Log it (TPL-045) with photos and the last service date.",
      "Book a service visit under the AMC; vendor delays go on TPL-102.",
      "Check the vendor's report, and a water test if required, before using the unit again.",
    ],
    diagnose: [
      ["Not cooling", "Check the power and thermostat, then call the vendor."],
      ["Slow flow", "The filter is probably due for a change."],
      ["Odd taste after a filter change", "Flush the system as the vendor instructs."],
    ],
    say: [
      [
        "At the desk",
        "The water dispenser is being serviced today, so there's chilled bottled water at the desk — please help yourself.",
      ],
    ],
    dos: ["Offer safe water immediately.", "Stop using a suspect unit.", "Keep service records."],
    donts: ["Don't serve water you're unsure about.", "Don't leave a leak unattended."],
    closeOut: ["Unit serviced or replaced and records updated.", "Backup water kept out until the fix is confirmed."],
    prevention: "Change filters on schedule, service dispensers quarterly, and keep a stock of sealed bottles.",
    escalation:
      "Escalate to the Facilities Manager if members report feeling unwell or the unit is out for more than 24 hours.",
    relatedTemplates: ["TPL-045", "TPL-235", "TPL-102"],
    tags: ["water dispenser", "drinking water", "water quality", "filter", "amenities"],
  }),

  article({
    id: "KB-106",
    title: "Toiletries & Consumables Running Low",
    category: "Studio Amenities and Facilities",
    subcategory: "Lounge, Pantry & Supplies",
    summary:
      "Shampoo, body wash, hand soap, tissues or sanitary products are low or out. Restock from the storeroom now, buy locally if it's empty, and set par levels so it doesn't happen again.",
    glance: {
      priority: "P3 (P2 if a basic — soap, toilet paper, sanitary products — is out)",
      owner: "Front Desk / Housekeeping → Operations",
      respond: "Within 1 hour",
      resolve: "Restocked the same day; purchase within 3 working days",
    },
    firstFive: [
      "Check the storeroom for stock.",
      "Refill dispensers and replace empties now.",
      "Note which items are running low.",
    ],
    steps: [
      "Restock from the storeroom immediately, basics first — soap, toilet paper, sanitary products.",
      "If the storeroom is empty, buy locally for the day (keep the receipt) and raise a restock (TPL-234).",
      "Check the other consumables while you're there: tissues, cotton buds, hair ties, hand towels.",
      "Check the vanity appliances too — broken hair dryers or straighteners go on TPL-189.",
      "Record weekly usage to set par levels for each studio (TPL-103).",
      "Keep the storeroom tidy with a minimum-stock list on the door.",
      "Review spend and member feedback on product quality monthly.",
    ],
    diagnose: [
      ["Running out every week", "Raise the par level."],
      ["Products going missing", "Switch to fixed dispensers instead of bottles."],
      ["Members dislike the products", "Review the brand with Operations."],
    ],
    say: [["At the desk", "Thanks for flagging that — I've just refilled the shampoo in the showers."]],
    dos: ["Restock basics first.", "Keep receipts for local purchases.", "Set par levels."],
    donts: ["Don't wait for the monthly order when basics run out.", "Don't refill a dispenser with a different product without relabelling it."],
    closeOut: ["Restocked and par levels updated.", "Purchase raised if needed."],
    prevention: "Count weekly against a minimum-stock list and reorder before you reach it.",
    escalation: "Escalate to Operations if an order is delayed beyond 3 working days.",
    relatedTemplates: ["TPL-234", "TPL-103", "TPL-189"],
    tags: ["toiletries", "consumables", "restock", "shampoo", "sanitary products", "supplies"],
  }),

  article({
    id: "KB-107",
    title: "Building or Society Services Disruption",
    category: "Studio Amenities and Facilities",
    subcategory: "Building & Neighbours",
    summary:
      "The building's lift, water supply, power, parking or common areas are disrupted by maintenance or a fault, and the studio is affected. Get the facts from the society, plan around it, and tell members early.",
    glance: {
      priority: "P2 (P1 if it stops classes or blocks access)",
      owner: "Studio Operations Manager → Facilities",
      respond: "Within 1 hour of hearing about it",
      resolve: "Workaround the same day; at least 24 hours' notice to members for planned work",
    },
    firstFive: [
      "Get the details from the building manager or society: what, when and for how long.",
      "Check which classes and amenities are affected.",
      "Decide whether classes can run.",
    ],
    steps: [
      "Log it (TPL-241) with the society's notice, the times and a contact person.",
      "Assess the impact: lift down (accessibility, deliveries), water cut (showers, toilets), power (backup), parking (valet).",
      "Plan workarounds: stored water, a signed stair route, valet at another spot, or moving classes.",
      "If classes can't run safely or comfortably, close or reschedule (TPL-109) following KB-024.",
      "Tell members early — WhatsApp and app notices for planned work, desk scripts on the day.",
      "Stay in touch with the society and confirm when services are back.",
      "Keep a record of repeated disruptions for discussions with the landlord or society.",
    ],
    diagnose: [
      ["Water cut announced for tomorrow", "Fill the storage tanks and warn members that showers may be limited."],
      ["Lift out for a week", "Signpost the stairs, help members with mobility needs and reschedule deliveries."],
      ["Parking closed", "Arrange alternative valet parking (KB-150)."],
    ],
    say: [
      [
        "Member message",
        "Heads-up: the building's water supply will be off on Saturday from 10 am to 2 pm. Classes run as usual, but showers will be limited — we'll have extra towels and wipes.",
      ],
    ],
    dos: ["Get the facts from the society.", "Plan workarounds.", "Tell members early."],
    donts: ["Don't assume classes can run without water or power.", "Don't let members find out on arrival."],
    closeOut: ["Services restored and members updated.", "Disruption logged."],
    prevention: "Ask the society to share planned maintenance a week ahead, and keep backup water and power plans ready.",
    escalation:
      "Escalate to the Studio Director if disruptions recur or affect safety, and to the landlord for lease issues.",
    relatedTemplates: ["TPL-241", "TPL-109", "TPL-239"],
    tags: ["building maintenance", "society", "water cut", "lift", "disruption", "landlord"],
  }),

  article({
    id: "KB-108",
    title: "Noise Complaint From Neighbours or the Society",
    category: "Studio Amenities and Facilities",
    subcategory: "Building & Neighbours",
    summary:
      "Neighbours, other tenants or the society complain about music, bass, dropped weights or footfall. Respond respectfully, measure and reduce the noise, agree quiet hours, and keep relations good.",
    glance: {
      priority: "P2 (P1 if the society threatens action or a formal notice arrives)",
      owner: "Studio Operations Manager → Studio Director",
      respond: "Within 4 hours",
      resolve: "Fixes agreed within 1 week",
    },
    firstFive: [
      "Thank the complainant and take details: the time, what they heard and where they are.",
      "Check which class was running and the volume settings.",
      "Turn down the volume or bass for the rest of the day.",
    ],
    steps: [
      "Log it (TPL-241) with the complainant, the times and the class involved.",
      "Measure the noise inside the studio and, if you can, on the neighbour's side; note the dB levels.",
      "Reduce it at source: a lower amplifier limit and less bass, rubber mats for weights, and a no-drop rule (TPL-155, TPL-034).",
      "Agree quiet hours with the society for early and late classes — for example, lower volume before 7 am and after 9 pm.",
      "Consider acoustic fixes — speaker isolation pads, door seals, panels — and get quotes if needed.",
      "Tell the complainant what you've changed and invite them to let you know if it continues.",
      "Keep a record of complaints and actions in case a formal notice follows.",
    ],
    diagnose: [
      ["Bass heard through the floor", "Speaker isolation pads and a bass cut."],
      ["Thuds from weights", "Thicker mats and a no-drop rule."],
      ["Complaints only about the 6 am class", "A quiet-hours volume limit."],
    ],
    say: [
      [
        "Reply to the neighbour",
        "Thank you for letting us know, and sorry for the disturbance. We've lowered the bass and set a volume limit for early classes — please call me directly if you still hear it.",
      ],
    ],
    dos: ["Respond respectfully.", "Measure and reduce at source.", "Keep a record."],
    donts: ["Don't argue with neighbours.", "Don't ignore complaints until a notice arrives."],
    closeOut: ["Fixes in place and complainant updated.", "Record kept."],
    prevention: "Set amplifier limits, use isolation pads and mats, and agree quiet hours with the society.",
    escalation: "Escalate to the Studio Director for formal notices or police complaints.",
    relatedTemplates: ["TPL-241", "TPL-155", "TPL-034"],
    tags: ["noise complaint", "neighbours", "society", "volume", "bass", "quiet hours"],
  }),
];
