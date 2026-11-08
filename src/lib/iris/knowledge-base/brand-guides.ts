// Knowledge Base — Brand Feedback: member broadcasts, creators and reposts,
// brand standards and collateral, festive campaigns, events and the boutique.
import { article, type KnowledgeArticle } from "./compose";

export const BRAND_GUIDES: KnowledgeArticle[] = [
  article({
    id: "KB-093",
    title: "Member Broadcast & Email Campaign Requests",
    category: "Brand Feedback",
    subcategory: "Member Communications",
    summary:
      "A studio wants to send members a WhatsApp broadcast, email or app notification — a schedule change, offer or event. Brief Marketing properly, target the right audience, respect opt-outs and approvals, and test before sending.",
    glance: {
      priority: "P3 (P1 for urgent operational notices such as closures)",
      owner: "Studio team → Marketing",
      respond: "Within 1 working day",
      resolve: "Scheduled within 3 working days (same day for urgent notices)",
    },
    firstFive: [
      "Decide whether it's an operational notice or a promotion.",
      "Define the audience: studio, membership type, active or lapsed.",
      "Draft the key message and the date it must go out.",
    ],
    steps: [
      "Raise the request (TPL-260 for WhatsApp, TPL-098 for email) with the purpose, audience, key message, call to action and send date.",
      "Operational notices (closures, cancellations) go to every affected member; promotions only to members who opted in.",
      "Marketing writes or polishes the copy in the brand voice and checks offers and dates with the studio.",
      "Approvals: the studio checks facts, Marketing checks brand, and the Studio Director approves any offer.",
      "Test-send to the team and check links, names, dates and prices.",
      "Send at a considerate time — not before 8 am or after 9 pm — and watch replies for 24 hours.",
      "Review the results: delivered, read, and bookings or redemptions.",
    ],
    diagnose: [
      ["Sent to members who opted out", "Stop the campaign, apologise and fix the list (KB-091)."],
      ["Wrong date or price in a sent message", "Send a short correction quickly (KB-042)."],
      ["Too many messages in one week", "Combine updates into a single message."],
    ],
    say: [
      [
        "Brief to Marketing",
        "We need a WhatsApp broadcast to active Kenkere House members by Thursday: Saturday's 8 am classes move to 9 am because of the building's water maintenance.",
      ],
    ],
    dos: ["Brief clearly with audience and date.", "Respect opt-outs.", "Test before sending."],
    donts: ["Don't send promotions to members who opted out.", "Don't send late at night."],
    closeOut: ["Campaign sent and replies handled.", "Results recorded."],
    prevention: "Keep a monthly communications calendar to avoid clashes and over-messaging.",
    escalation:
      "Escalate to the Marketing lead for errors in sent messages, and to the Studio Director for offers outside the agreed price list.",
    relatedTemplates: ["TPL-260", "TPL-098", "TPL-100"],
    tags: ["broadcast", "email campaign", "whatsapp broadcast", "member communication", "newsletter"],
  }),

  article({
    id: "KB-094",
    title: "Influencer or Creator Collaboration Requests",
    category: "Brand Feedback",
    subcategory: "Social Media & Creators",
    summary:
      "An influencer or creator asks for free classes or a collaboration, or a studio wants to invite one. Check fit and reach, agree deliverables in writing, follow advertising disclosure rules, and track the results.",
    glance: {
      priority: "P3",
      owner: "Marketing",
      respond: "Within 2 working days",
      resolve: "Decision within 1 week",
    },
    firstFive: [
      "Collect the creator's handle, audience size and location, and what they're asking for.",
      "Check that their content suits the brand.",
      "Don't promise free classes at the desk — refer them to Marketing.",
    ],
    steps: [
      "Log the request (TPL-259) with the handle, follower count, audience location and proposed deliverables.",
      "Marketing reviews fit: content quality, an audience in Mumbai or Bengaluru, shared values and no clashing brand deals.",
      "Agree in writing what we give (classes, products) and what they deliver (posts, stories, dates), plus usage rights (TPL-264).",
      "Disclosure: posts must be labelled as a collaboration or ad, as ASCI guidelines require.",
      "Book their class discreetly and protect other members' privacy — no filming members without consent (KB-095).",
      "Brief the desk and trainer before the visit so the experience runs smoothly.",
      "Review the content when it goes live and track reach, enquiries and sign-ups.",
    ],
    diagnose: [
      ["Creator turns up asking for a free class", "Politely refer them to Marketing."],
      ["Post shows members without consent", "Ask for an edit or removal."],
      ["No content after free classes", "Follow up once, and don't work with them again."],
    ],
    say: [
      [
        "Reply",
        "Thanks for reaching out! Our Marketing team handles collaborations — I've passed on your details and they'll get back to you within two working days.",
      ],
    ],
    dos: ["Agree deliverables in writing.", "Require disclosure.", "Track results."],
    donts: ["Don't give free classes without approval.", "Don't allow filming of members without consent."],
    closeOut: ["Agreement recorded and content delivered.", "Results tracked."],
    prevention: "Keep a standard creator brief and agreement template.",
    escalation: "Escalate to the Marketing lead for paid collaborations or creators with controversial content.",
    relatedTemplates: ["TPL-259", "TPL-264"],
    tags: ["influencer", "creator", "collaboration", "social media", "asci", "partnership"],
  }),

  article({
    id: "KB-095",
    title: "Member Content & Repost Permissions",
    category: "Brand Feedback",
    subcategory: "Social Media & Creators",
    summary:
      "A member tags the studio, or we want to reshare member posts, class photos or testimonials. Always get permission, credit the creator, and take content down quickly if anyone in it objects.",
    glance: {
      priority: "P3 (P1 if someone objects to content that shows them)",
      owner: "Marketing",
      respond: "Within 1 working day; objections within 2 hours",
      resolve: "Removals within 24 hours",
    },
    firstFive: [
      "Check who appears in the content and whether each person consented.",
      "Ask the creator for permission to repost.",
      "If someone objects, take it down first and discuss afterwards.",
    ],
    steps: [
      "Before reposting, ask the creator by DM and keep a screenshot of their yes.",
      "Check that everyone visible consented — blur or crop anyone who didn't.",
      "Credit the creator in the repost.",
      "Record every consent — who, what, when and where it will be used — in the consent log.",
      "Studio shoots: put up notices, collect consent forms and offer a camera-free zone (TPL-257).",
      "If someone asks for removal, take it down within 24 hours (sooner if you can) and confirm.",
      "Member posts showing others without consent: ask the creator to edit or remove them (see KB-072, TPL-175).",
    ],
    diagnose: [
      ["Member asks why they're in our post", "Take it down and apologise."],
      ["Testimonial still used after the member left", "Remove it on request."],
      ["Reposted without permission", "Ask for permission now, or remove it."],
    ],
    say: [
      [
        "Asking permission",
        "We love this! Could we reshare it on the studio's Instagram with credit to you? Reply 'yes' and we'll tag you.",
      ],
    ],
    dos: ["Ask before reposting.", "Credit the creator.", "Remove quickly on request."],
    donts: ["Don't repost without written consent.", "Don't feature members who didn't agree."],
    closeOut: ["Consent recorded, or content removed.", "Member confirmed."],
    prevention: "Keep a consent log and display a clear photo policy at every studio.",
    escalation: "Escalate to the Marketing lead if a removal request is disputed or involves a minor.",
    relatedTemplates: ["TPL-257", "TPL-175", "TPL-097"],
    tags: ["repost", "member content", "consent", "permission", "instagram", "photos"],
  }),

  article({
    id: "KB-096",
    title: "Off-Brand Material Spotted at a Studio",
    category: "Brand Feedback",
    subcategory: "Brand Standards & Collateral",
    summary:
      "Old posters, handwritten signs, wrong logos, outdated prices or off-brand décor are on display. Take down anything misleading, replace it with approved templates, and keep every studio consistent with brand standards.",
    glance: {
      priority: "P3 (P2 if it shows wrong prices or offers)",
      owner: "Studio Operations Manager → Marketing",
      respond: "Within 1 working day",
      resolve: "Replaced within 1 week",
    },
    firstFive: [
      "Photograph the material and note where it is.",
      "Remove anything showing wrong prices or expired offers straight away.",
      "Check whether an approved version exists.",
    ],
    steps: [
      "Log it (TPL-263) with photos, the location and why it's off-brand.",
      "Take down wrong prices, expired offers and damaged signs immediately.",
      "Replace them with approved templates from Marketing's brand folder, or request new ones (KB-097, TPL-107).",
      "Handwritten notices are for temporary operational messages only, on the branded template.",
      "Photograph the replacement once it's up and attach it to the ticket.",
      "Check décor, music and uniforms against the brand guidelines too.",
      "Do a monthly brand walk-through at each studio.",
    ],
    diagnose: [
      ["Old prices on display", "Remove them now; if a member relied on them, the Memberships Manager decides whether to honour the price."],
      ["Handwritten 'out of order' signs", "Use the printed branded template."],
      ["Different logos at different studios", "Ask Marketing for a full refresh."],
    ],
    say: [
      [
        "To the team",
        "Let's take down the handwritten timetable today — Marketing has a branded version we can print in A3.",
      ],
    ],
    dos: ["Remove wrong prices immediately.", "Use approved templates.", "Do monthly walk-throughs."],
    donts: ["Don't create your own designs.", "Don't leave expired offers up."],
    closeOut: ["Material replaced and photos logged.", "Next walk-through scheduled."],
    prevention: "Keep a printed brand kit at each studio and use a monthly brand checklist.",
    escalation: "Escalate to Marketing if replacements haven't arrived within a week.",
    relatedTemplates: ["TPL-263", "TPL-107", "TPL-262"],
    tags: ["brand standards", "off brand", "signage", "collateral", "posters", "consistency"],
  }),

  article({
    id: "KB-097",
    title: "Signage, Print & Brand Asset Requests",
    category: "Brand Feedback",
    subcategory: "Brand Standards & Collateral",
    summary:
      "A studio needs new signage, printed collateral such as flyers and timetables, or brand assets like logos and photos. Brief Marketing with sizes, quantities and deadlines, use approved vendors, and check proofs before anything is printed.",
    glance: {
      priority: "P3 (P2 for safety or operational signage)",
      owner: "Studio Operations Manager → Marketing",
      respond: "Within 2 working days",
      resolve: "Artwork within 5 working days; printing per the vendor's lead time",
    },
    firstFive: [
      "Decide what's needed, where it goes and by when.",
      "Measure the space and note the material (vinyl, foam board, acrylic).",
      "Check whether an approved design already exists.",
    ],
    steps: [
      "Raise the request (TPL-262 for print, TPL-107 for signage, TPL-101 for brand assets) with sizes, quantities, photos of the location and the deadline.",
      "Marketing designs from brand templates; the studio confirms operational text such as hours and rules.",
      "Check the proof carefully: spelling, prices, dates, phone numbers and logo placement.",
      "Confirm installation before printing — frames, adhesive, and any drilling permission from the building.",
      "Print through approved vendors against a quote; costs over the limit need approval.",
      "Install neatly, remove old versions and photograph the result for the brand folder.",
      "Safety signage (exits, wet floor, first aid) jumps the queue and must meet regulations.",
    ],
    diagnose: [
      ["Needed by tomorrow", "Print a temporary version from the brand folder's templates."],
      ["Typos spotted after printing", "Reprint — the proof step was skipped."],
      ["A partner asks for our logo", "Share only approved logo files with the usage rules."],
    ],
    say: [
      [
        "Brief",
        "We need two A2 timetable posters for Kenkere House by the 20th — the new schedule starts on the 22nd. Photos of the frames are attached.",
      ],
    ],
    dos: ["Give sizes and deadlines.", "Check proofs.", "Remove old versions."],
    donts: ["Don't print without approving a proof.", "Don't use unapproved logos."],
    closeOut: ["Installed and photographed.", "Old material removed."],
    prevention: "Keep a signage map for each studio listing every sign, its size and its file.",
    escalation: "Escalate to the Marketing lead if a launch or safety-signage deadline is at risk.",
    relatedTemplates: ["TPL-262", "TPL-107", "TPL-101"],
    tags: ["signage", "print", "collateral", "brand assets", "logo", "posters"],
  }),

  article({
    id: "KB-098",
    title: "Festive Campaign Launch Checklist",
    category: "Brand Feedback",
    subcategory: "Campaigns, Events & Boutique",
    summary:
      "Launching a festive or seasonal campaign — Diwali, New Year, an anniversary: lock the offer, dates and terms, align the studios, test every code and link, and brief the front desk before it goes live.",
    glance: {
      priority: "P2 (P1 in launch week)",
      owner: "Marketing with Memberships and the studio teams",
      respond: "Start planning 4–6 weeks ahead",
      resolve: "Everything tested 48 hours before launch",
    },
    firstFive: [
      "Confirm the offer, eligibility, dates and terms with the Studio Director.",
      "Agree the channels and content calendar.",
      "Set the launch date and an owner for each task.",
    ],
    steps: [
      "Raise the campaign (TPL-255) with the offer, audience, dates, channels and targets.",
      "Memberships sets up the offer in Momence (TPL-099): pricing, promo codes, limits and expiry.",
      "Marketing prepares creatives, landing pages and messages (TPL-096).",
      "Test every code and link 48 hours before launch: right price, GST, limits, and blocked combinations (KB-060).",
      "Brief the front desk with a one-page FAQ: the offer, terms, who's eligible and how to apply it.",
      "Launch, then check bookings, code use and member questions daily.",
      "End it on time: expire codes and remove creatives on the closing day.",
      "Review results and lessons within a week.",
    ],
    diagnose: [
      ["Code not working on launch day", "Check the set-up immediately (KB-060)."],
      ["Desk doesn't know the terms", "Share the FAQ and pin it in the team chat."],
      ["Offer stacking with other discounts", "Fix the rules and watch for misuse (KB-048)."],
    ],
    say: [
      [
        "Desk FAQ",
        "The Diwali offer is 20% off 3-month memberships from 25 October to 5 November, for new and lapsed members only, with the code DIWALI20.",
      ],
    ],
    dos: ["Test before launch.", "Brief the desk.", "End on time."],
    donts: ["Don't launch without written terms.", "Don't leave codes active after the end date."],
    closeOut: ["Campaign closed and codes expired.", "Results reviewed."],
    prevention: "Use a launch checklist and keep a yearly campaign calendar.",
    escalation: "Escalate to the Marketing lead and Studio Director for offer errors that affect pricing.",
    relatedTemplates: ["TPL-255", "TPL-096", "TPL-099"],
    tags: ["festive campaign", "diwali", "campaign launch", "offer", "promotion", "marketing"],
  }),

  article({
    id: "KB-099",
    title: "Community Event or Pop-Up Planning",
    category: "Brand Feedback",
    subcategory: "Campaigns, Events & Boutique",
    summary:
      "Planning a community event, outdoor class or pop-up: venue, permissions, safety, equipment, registrations, staffing and lead capture — then following up with everyone who came.",
    glance: {
      priority: "P3 (P2 within 2 weeks of the event)",
      owner: "Marketing with Studio Operations",
      respond: "Start planning 4–8 weeks ahead",
      resolve: "Lead report within 3 working days after the event",
    },
    firstFive: [
      "Define the goal (new leads, community, partner visibility) and the target headcount.",
      "Shortlist venues and check permissions and costs.",
      "Set a budget and owners.",
    ],
    steps: [
      "Raise the event plan (TPL-265): goal, date, venue, format, headcount, budget and partners (TPL-264 for partner approvals).",
      "Confirm venue permissions, insurance, power, sound and a weather backup.",
      "Plan safety: first-aid kit, emergency contacts, drinking water and a waiver from every participant.",
      "Arrange transport for equipment (mats, bikes, speakers) with a checklist for the return trip.",
      "Open registration with a cap and waitlist, and collect consent for follow-up messages.",
      "Staff it: trainers, check-in and a photographer, with consent notices displayed (KB-095).",
      "On the day, check attendees in, capture leads and keep to time.",
      "Within 3 working days, share the lead report (TPL-267) and follow up with attendees.",
    ],
    diagnose: [
      ["Rain forecast for an outdoor event", "Switch to the backup venue or postpone early."],
      ["Fewer registrations than planned", "Push promotion harder or scale down."],
      ["Leads not followed up", "Assign owners and deadlines in the lead report."],
    ],
    say: [
      [
        "Follow-up",
        "Thanks for joining our sunrise Barre at Carter Road! Here's an offer for your first class at Supreme HQ, valid for 14 days.",
      ],
    ],
    dos: ["Collect waivers and consent.", "Plan for the weather.", "Follow up within 3 days."],
    donts: ["Don't run an event without permissions.", "Don't leave equipment behind."],
    closeOut: ["Equipment returned and checked.", "Lead report shared and follow-ups assigned."],
    prevention: "Keep an event kit list and a reusable event plan template.",
    escalation: "Escalate to the Studio Director for partner events, spending above budget or safety concerns.",
    relatedTemplates: ["TPL-265", "TPL-267", "TPL-264"],
    tags: ["community event", "pop-up", "outdoor class", "event planning", "leads"],
  }),

  article({
    id: "KB-100",
    title: "Boutique Merchandise — Stock, Pricing & Sales",
    category: "Brand Feedback",
    subcategory: "Campaigns, Events & Boutique",
    summary:
      "Running the studio boutique: keep best-sellers in stock, price correctly with GST, put every sale through the POS, handle exchanges, and investigate stock gaps quickly.",
    glance: {
      priority: "P3 (P2 for a best-seller stock-out or a count gap)",
      owner: "Front Desk Lead → Marketing / Retail",
      respond: "Within 1 working day",
      resolve: "Restocked within 1 week",
    },
    firstFive: [
      "Check stock of best-sellers — grip socks, water bottles, apparel sizes.",
      "Check that price tags match the POS.",
      "Note anything missing or damaged.",
    ],
    steps: [
      "Count stock weekly and raise a restock (TPL-266) before best-sellers run out.",
      "Make sure every item carries a price tag that matches Momence, including GST.",
      "Put every sale through the POS — never take cash or UPI without a receipt.",
      "Exchanges follow the boutique policy (unused, with a receipt, within 7 days) and are recorded.",
      "Take damaged items off sale and log them.",
      "Count gaps: recount, check the sales records, then follow KB-148 if it's still short (TPL-236).",
      "Share monthly sales by item with Marketing to plan buying.",
    ],
    diagnose: [
      ["Grip socks sold out", "Raise an urgent restock and ask members to bring their own meanwhile."],
      ["Tag price differs from the POS", "Charge the lower price and fix the tag."],
      ["Stock still short after a recount", "Follow KB-148."],
    ],
    say: [
      [
        "At the desk",
        "Those grip socks are ₹650 including GST. I'll put the sale on your profile so the receipt is in your app.",
      ],
    ],
    dos: ["Count weekly.", "Tag everything.", "Record every sale."],
    donts: ["Don't sell without a receipt.", "Don't let best-sellers run out."],
    closeOut: ["Restocked and counts recorded.", "Sales report shared."],
    prevention: "Set minimum stock levels for best-sellers and reorder when stock reaches them.",
    escalation:
      "Escalate supplier delays to Marketing / Retail, and stock gaps to the Studio Operations Manager.",
    relatedTemplates: ["TPL-266", "TPL-227", "TPL-236"],
    tags: ["boutique", "merchandise", "retail", "grip socks", "stock", "gst"],
  }),
];
