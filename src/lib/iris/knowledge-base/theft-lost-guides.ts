// Knowledge Base - Theft & Lost Items: running lost property, thefts from bags
// and changing rooms, boutique shrinkage, valet delays and parking disputes.
import { article, type KnowledgeArticle } from "./compose";

export const THEFT_LOST_GUIDES: KnowledgeArticle[] = [
  article({
    id: "KB-146",
    title: "Lost & Found - Storage, Handover & Disposal",
    category: "Theft and Lost Items",
    subcategory: "Lost & Found",
    summary:
      "Running lost property properly: log every item the day it's found, lock up valuables, return items only to the verified owner, and donate or dispose of unclaimed items on a fixed schedule.",
    glance: {
      priority: "P3 (P2 for valuables - phones, jewellery, wallets, keys)",
      owner: "Front Desk Lead",
      respond: "Logged within the same shift",
      resolve: "Returned on claim; unclaimed items cleared after 30 days",
    },
    firstFive: [
      "Log the item: what, where, when and who found it.",
      "Put valuables in the locked drawer or safe.",
      "Check that class's bookings to find the likely owner.",
    ],
    steps: [
      "Log every item in the lost-property register (TPL-081) with a photo, location, date and finder.",
      "Valuables (phones, wallets, jewellery, keys) go in the safe; everything else goes in bins labelled by week.",
      "Try to find the owner: check the class roster and message the members who were there.",
      "When returning an item, ask the owner to describe it, check ID, and record who collected it and when.",
      "Someone collecting for a friend: confirm with the owner by phone or WhatsApp first.",
      "Clothing and bottles unclaimed after 30 days are donated or disposed of; valuables are kept for 90 days, then handled per policy.",
      "Clear the bins monthly and note what was donated.",
    ],
    diagnose: [
      ["Member says it was handed in but it's not in the register", "Check the bins and the CCTV (TPL-224); see KB-015."],
      ["Two people claim the same item", "Ask each for details only the owner would know."],
      ["Cash found", "Count it with a witness, log the amount and keep it in the safe."],
    ],
    say: [["Message", "Hi! A blue water bottle was left after the 7 am Barre class - is it yours? It's at the Kwality House desk."]],
    dos: ["Log every item.", "Verify the owner.", "Clear on a schedule."],
    donts: ["Don't hand items over without checking.", "Don't keep lost property for personal use."],
    closeOut: ["Item logged and returned or stored.", "Collection recorded."],
    prevention:
      "Remind members to take their belongings at the end of class, and sweep studios and changing rooms after every class.",
    escalation: "Escalate to the Studio Operations Manager for missing valuables or ownership disputes.",
    relatedTemplates: ["TPL-081", "TPL-224"],
    tags: ["lost and found", "lost property", "register", "valuables", "return", "donation"],
  }),

  article({
    id: "KB-147",
    title: "Theft From Bags or the Changing Room",
    category: "Theft and Lost Items",
    subcategory: "Theft & Lockers",
    summary:
      "A member reports cash, a phone, jewellery or other items taken from their bag, the changing room or an open shelf. Support them, secure the area, save the footage, help with a police report and tighten security.",
    glance: {
      priority: "P1",
      owner: "Front Desk Lead → Studio Operations Manager",
      respond: "Immediately",
      resolve: "Report filed the same day; follow-up within 3 working days",
    },
    firstFive: [
      "Listen to and support the member - they're likely to be upset.",
      "Note what's missing, where it was, and the time window.",
      "Save the CCTV footage for that window before it's overwritten.",
    ],
    steps: [
      "Take the details: items, value, where they were left, the time window and who else was around.",
      "Search nearby with the member - things are sometimes misplaced or picked up by mistake.",
      "Save footage from cameras covering the area (TPL-224), but don't hand it to the member directly (KB-144).",
      "Log the theft (TPL-226), help the member file a police report, and give them the incident number.",
      "If staff involvement is suspected, the manager handles it confidentially with HR.",
      "Insurance: help with the paperwork if the studio's or the member's policy applies (TPL-104).",
      "Close the gap: locker reminders, signage, and no open shelves for valuables (lockers follow KB-036).",
      "Follow up with the member within 3 working days.",
    ],
    diagnose: [
      ["Phone taken from an open shelf", "Push locker use and add signage."],
      ["Several thefts in a week", "Alert all studios, review CCTV coverage and ask local police for patrols."],
      ["Item turns up later", "Update the report and tell the police."],
    ],
    say: [
      [
        "To the member",
        "I'm so sorry this happened. I've saved the camera footage, and I'll help you file a police report right now. Here's the incident number for your records.",
      ],
    ],
    dos: ["Support the member.", "Save footage quickly.", "Help with the police report."],
    donts: ["Don't accuse anyone without evidence.", "Don't promise compensation the policy doesn't cover."],
    closeOut: ["Report filed and footage saved.", "Member followed up."],
    prevention:
      "Encourage locker use, keep valuables signage visible, and make sure CCTV covers entrances - never inside changing rooms.",
    escalation:
      "Escalate to the Studio Operations Manager immediately, and to the Studio Director for repeat thefts or suspected staff involvement.",
    relatedTemplates: ["TPL-226", "TPL-224", "TPL-104"],
    tags: ["theft", "stolen", "changing room", "bags", "police report", "security"],
  }),

  article({
    id: "KB-148",
    title: "Boutique Stock Theft or Shrinkage",
    category: "Theft and Lost Items",
    subcategory: "Theft & Lockers",
    summary:
      "Boutique counts are short, items are missing from display, or theft is suspected. Recount and reconcile first, check records and footage, and tighten controls without accusing anyone too early.",
    glance: {
      priority: "P2 (P1 for high-value losses or suspected staff theft)",
      owner: "Front Desk Lead → Studio Operations Manager → Finance",
      respond: "Within 1 working day",
      resolve: "Within 1 week",
    },
    firstFive: [
      "Recount the items in question with a second person.",
      "Check sales, exchanges and transfers between studios for the period.",
      "Note the value and when the item was last counted.",
    ],
    steps: [
      "Recount with a witness and record both counts.",
      "Reconcile against POS sales, exchanges, damaged write-offs and transfers to other studios (TPL-236).",
      "If it's still short, save footage covering the display and the desk (TPL-224).",
      "Log it (TPL-227) with the item, quantity, value and your reconciliation.",
      "Suspected member theft: the manager decides next steps, involving the police for significant amounts.",
      "Suspected staff theft: the manager and HR handle it confidentially - no public accusations.",
      "Tighten controls: weekly counts, secure displays and no unrecorded sales.",
    ],
    diagnose: [
      ["Short in one size only", "Check exchanges and size swaps."],
      ["Shortfall matches unrecorded sales", "Every sale goes through the POS (KB-100)."],
      ["High-value items missing", "Footage, police and the insurer."],
    ],
    say: [
      [
        "To the team",
        "We're two pairs of grip socks short this week - please make sure every sale and exchange goes through the POS.",
      ],
    ],
    dos: ["Recount with a witness.", "Reconcile the records first.", "Handle suspicions confidentially."],
    donts: ["Don't accuse anyone publicly.", "Don't adjust counts without recording why."],
    closeOut: ["Reconciliation recorded and the loss written off or recovered.", "Controls updated."],
    prevention: "Count weekly, display high-value items securely, and record every sale and exchange.",
    escalation: "Escalate to Finance for write-offs, and to HR if staff involvement is suspected.",
    relatedTemplates: ["TPL-227", "TPL-236", "TPL-224"],
    tags: ["boutique", "shrinkage", "stock theft", "inventory", "count discrepancy", "retail"],
  }),

  article({
    id: "KB-149",
    title: "Valet Delay or Lost Car Key",
    category: "Theft and Lost Items",
    subcategory: "Valet & Parking",
    summary:
      "A member waits too long for their car, or the valet has misplaced their key. Keep the member informed, escalate to the valet vendor, offer alternatives, and record it so the vendor improves.",
    glance: {
      priority: "P2 (P1 if a key is lost or the member is stranded)",
      owner: "Front Desk → Studio Operations Manager → valet vendor",
      respond: "Within 10 minutes",
      resolve: "Same day",
    },
    firstFive: [
      "Call the valet supervisor for an exact ETA or the key's whereabouts.",
      "Keep the member comfortable - a seat and water - and give regular updates.",
      "Note the ticket number, the car and the times.",
    ],
    steps: [
      "Give the valet supervisor the ticket number and ask for an honest ETA.",
      "Lost key: the vendor searches the key box and checks with every attendant, including whether it went to someone else.",
      "Offer alternatives: a cab at the vendor's cost for long delays, or someone bringing the spare key.",
      "Log it (TPL-228) with times, the ticket and the outcome; vendor performance issues go on TPL-102.",
      "Any damage to the car follows KB-012.",
      "Get the vendor's written explanation and corrective action.",
      "Follow up with the member the next day.",
    ],
    diagnose: [
      ["Delays at class changeover", "Vendor staffing - ask for more attendants at peak times."],
      ["Key handed to the wrong person", "Serious - involve the vendor, and the police if the car has gone."],
      ["Repeated delays", "Review the vendor contract (KB-049)."],
    ],
    say: [
      [
        "To the member",
        "I'm sorry for the wait - the valet supervisor says your car will be here in 5 minutes. Can I get you some water while you wait?",
      ],
    ],
    dos: ["Get an honest ETA.", "Keep the member updated.", "Record the times."],
    donts: ["Don't blame the member's ticket.", "Don't leave them waiting without news."],
    closeOut: ["Car returned or an alternative arranged.", "Vendor's explanation recorded."],
    prevention: "Agree peak staffing and key-control procedures with the valet vendor, and review them monthly.",
    escalation: "Escalate to the Studio Operations Manager for lost keys or delays over 30 minutes.",
    relatedTemplates: ["TPL-228", "TPL-102"],
    tags: ["valet", "car key", "valet delay", "parking", "vendor", "lost key"],
  }),

  article({
    id: "KB-150",
    title: "Parking Disputes & Access Issues",
    category: "Theft and Lost Items",
    subcategory: "Valet & Parking",
    summary:
      "Members can't find parking, are blocked in, clash with neighbours or the building over spaces, or valet isn't available. Know each studio's parking rules, help members with alternatives, and work with the building to keep the peace.",
    glance: {
      priority: "P3 (P2 if members or neighbours are blocked in)",
      owner: "Front Desk → Studio Operations Manager",
      respond: "Within 30 minutes",
      resolve: "Same day",
    },
    firstFive: [
      "Check this studio's parking rules - valet, building spaces, street parking.",
      "If a car is blocking someone, find the owner through the class roster.",
      "Stay neutral in any dispute.",
    ],
    steps: [
      "Blocked car: find the owner quickly (class roster, a discreet announcement) and ask them to move it.",
      "Disputes over building spaces: follow the society's rules and never promise members spaces we don't control (TPL-241).",
      "No valet: tell members before they set off (booking reminder or WhatsApp) and suggest nearby paid parking.",
      "Neighbours complaining about members' parking: remind members of the rules; if relations are strained, handle it like KB-108.",
      "Log recurring problems (TPL-241) and valet issues (TPL-228).",
      "Keep a parking guide for each studio at the desk and on the website.",
      "Review with the building or valet vendor if problems repeat.",
    ],
    diagnose: [
      ["Member's car blocking the society gate", "The owner moves it immediately; apologise to the society."],
      ["Member fined for street parking", "Explain we can't refund fines and share the parking guide."],
      ["No valet on a holiday", "Tell members in advance."],
    ],
    say: [
      [
        "To members",
        "Parking tip for Supreme HQ: valet runs from 6 am to 9 pm. On Sundays, please use the paid lot two buildings down.",
      ],
    ],
    dos: ["Know each studio's rules.", "Tell members in advance.", "Stay neutral."],
    donts: ["Don't promise spaces you don't control.", "Don't argue with the society or neighbours."],
    closeOut: ["Dispute resolved and parking guide updated.", "Recurring issues logged."],
    prevention: "Include a parking guide in booking confirmations and keep good relations with the society.",
    escalation: "Escalate to the Studio Operations Manager for repeated disputes or society notices.",
    relatedTemplates: ["TPL-241", "TPL-228"],
    tags: ["parking", "blocked car", "society", "valet", "neighbours", "access"],
  }),
];
