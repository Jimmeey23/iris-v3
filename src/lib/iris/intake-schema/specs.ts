/**
 * What every report must capture, per subcategory.
 *
 * A spec is an ordered list of field keys (see ./fields.ts). Keys are required
 * unless prefixed with "?". Conditional fields (showIf) are only required when
 * shown. Each spec = a pack for the kind of issue + fields specific to the
 * subcategory, so the card never asks something unrelated.
 *
 * Keyed "Category|Subcategory" (a few subcategory names exist under two
 * categories with different needs) or just "Subcategory".
 */

const uniq = (keys: string[]) => {
  const seen = new Set<string>();
  return keys.filter((k) => {
    const id = k.replace(/^\?/, "");
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};
/** Pack + extras. Extras go after the pickers so the order reads naturally. */
const S = (pack: string[], ...extra: string[]) => {
  const pickers = pack.filter((k) => ["studio", "area", "member", "trainer", "session", "when", "?member", "?session", "?trainer", "?area"].includes(k));
  const rest = pack.filter((k) => !pickers.includes(k));
  return uniq([...pickers, ...extra, ...rest]);
};

// ── Packs ─────────────────────────────────────────────────────────────────────
const FAULT = [
  // Only what's needed to act is required; follow-up admin detail is optional.
  "studio", "area", "when", "sinceWhen", "usable", "memberImpact", "?membersComplained", "complaintWho", "complaintWhat",
  "?membersInformed", "?frontDeskSteps", "?vendorContacted", "vendorName", "?expectedResolution", "?workaround", "?photoTaken",
];
const AMENITY = [
  "studio", "area", "when", "sinceWhen", "memberImpact", "membersComplained", "complaintWho", "complaintWhat",
  "frontDeskSteps", "expectedResolution", "?photoTaken",
];
const SUPPLY = [
  "studio", "when", "supplyItem", "stockLeft", "quantityNeeded", "supplyNeededBy", "memberImpact",
  "membersComplained", "complaintWho", "complaintWhat", "actionsTaken",
];
const CLASS_FB = [
  "studio", "session", "when", "?member", "observedBy", "verbatim", "sentiment", "impact", "specificMoment", "actionsTaken", "?clientAsk",
];
const TRAINER_FB = [
  "trainer", "studio", "session", "when", "?member", "observedBy", "verbatim", "sentiment", "raisedWithTrainer", "trainerResponse",
  "previousIncidents", "actionsTaken",
];
const SCHED = ["studio", "when", "?session", "currentSlot", "requestedChange", "reason", "membersRequesting", "effectiveFrom", "?verbatim"];
const TECH = ["when", "system", "device", "errorMessage", "stepsToReproduce", "affectedUsers", "actionsTaken", "screenshot", "?member"];
const MEMBER_TECH = ["member", "when", "system", "device", "errorMessage", "stepsToReproduce", "worksVsFails", "affectedUsers", "actionsTaken", "screenshot"];
const PAY = [
  "member", "when", "amount", "paymentMethod", "transactionRef", "paymentDate", "refundRequested", "verbatim", "sentiment", "responseGiven",
];
const PRICING = [
  "member", "when", "membershipType", "policyInQuestion", "understanding", "whatWasCommunicated", "clientAsk", "sentiment",
  "responseGiven", "approvalNeeded",
];
const SERVICE = [
  "member", "when", "channelContacted", "responseDelay", "staffInvolved", "verbatim", "sentiment", "clientAsk", "responseGiven",
  "followUpPromised",
];
const SUGGESTION = ["studio", "when", "?member", "preferenceDetail", "reason", "membersRequesting", "reportedBy", "verbatim", "?sentiment"];
const SAFETY = [
  "studio", "area", "when", "incidentDetail", "personInvolved", "injury", "injuryDetail", "riskNow", "witnesses", "cctvChecked",
  "managementInformed", "actionsTaken",
];
const THEFT = [
  "studio", "area", "when", "item", "itemDescription", "itemValue", "ownerType", "lastSeen", "cctvChecked", "itemStatus", "police",
  "actionsTaken",
];
const LOST = ["studio", "area", "when", "item", "itemDescription", "ownerType", "lastSeen", "itemStatus", "actionsTaken", "?member"];
const BRAND = ["when", "channel", "contentRef", "issueDetail", "correctVersion", "reportedBy", "deadline", "approver"];
const INTERNAL = ["when", "requestSummary", "reason", "stakeholders", "deadline", "businessImpact", "actionsTaken"];

// ── Specs ─────────────────────────────────────────────────────────────────────
export const SPECS: Record<string, string[]> = {
  // Scheduling
  "Time Change": S(SCHED, "noticeGiven", "bookedCount"),
  "Level Change": S(SCHED, "session", "specificMoment"),
  "Additional Classes": S(SCHED, "waitlistCount", "bookedCount"),
  "Trainer Preferences": S(SCHED, "trainer", "member", "preferenceDetail"),
  "Class Capacity Issues": S(SCHED, "session", "classCapacity", "bookedCount", "waitlistCount", "impact"),
  "Waitlist Concerns": S(["member", "session", "studio", "when", "waitlistCount", "verbatim", "sentiment", "clientAsk", "responseGiven", "actionsTaken"]),
  "Studio Timings": S(SCHED, "preferenceDetail"),
  "Session Length": S(SCHED, "session", "preferenceDetail"),
  "Cancellation Policy": S(PRICING, "session", "noticeGiven"),
  "Booking Restrictions": S(MEMBER_TECH, "session", "membershipOnAccount"),
  "Class Substitutions": S(["studio", "session", "when", "trainer", "reason", "noticeGiven", "membersInformed", "coverArranged", "membersComplained", "complaintWho", "complaintWhat", "actionsTaken"]),
  "Trainer Substitutions": S(["studio", "session", "when", "trainer", "reason", "noticeGiven", "membersInformed", "coverArranged", "membersComplained", "complaintWho", "complaintWhat", "actionsTaken"]),
  "Last-minute Cancellations": S(["studio", "session", "when", "reason", "noticeGiven", "bookedCount", "membersInformed", "compensationOffered", "membersComplained", "complaintWho", "complaintWhat", "actionsTaken"]),
  "Late Arrival Policy": S(["member", "studio", "session", "when", "minutesLate", "verbatim", "sentiment", "responseGiven", "policyInQuestion", "staffInvolved"]),
  "Special Request Accommodations": S(["member", "studio", "when", "requestedChange", "reason", "modificationNeeded", "clientAsk", "responseGiven", "approvalNeeded"]),
  "Early Morning/Late Night Class Availability": S(SCHED, "preferenceDetail"),
  "Weekend vs. Weekday Class Balance": S(SCHED, "preferenceDetail", "bookedCount"),
  "Rescheduling Flexibility": S(["member", "session", "studio", "when", "requestedChange", "reason", "policyInQuestion", "clientAsk", "responseGiven", "sentiment"]),
  "Booking Confirmation Issues": S(MEMBER_TECH, "session", "membershipOnAccount"),
  "Holiday and Festival Class Planning": S(SCHED, "eventDate", "headcount"),
  "Workshop / Event Capacity & Planning": S(["studio", "when", "eventName", "eventDate", "headcount", "classCapacity", "bookedCount", "waitlistCount", "requestedChange", "stakeholders", "deadline"]),
  "Studio Operations / Class Feedback (grid review)": S(["studio", "when", "currentSlot", "issueDetail", "bookedCount", "classCapacity", "requestedChange", "reason", "stakeholders"]),
  "Class Overbooking / Unregistered Attendance": S(["studio", "session", "when", "classCapacity", "bookedCount", "attendees", "personInvolved", "idChecked", "staffInvolved", "frontDeskSteps", "actionsTaken"]),
  "Private Group Booking / Guestlist Management": S(["studio", "when", "eventName", "eventDate", "headcount", "companyName", "priceQuoted", "requestedChange", "stakeholders", "deadline"]),
  "Class Capacity & Schedule Gaps": S(SCHED, "classCapacity", "bookedCount", "waitlistCount"),
  "Class Schedule Delay / Internal Follow-up": S(INTERNAL, "studio", "currentSlot"),

  // Class Experience
  "Bad Odour": S(AMENITY, "smellSource", "cleanIssue", "lastCleaned"),
  "Audio Issues": S(FAULT, "session", "audioDevice", "audioIssue"),
  "Studio Temperature Too Hot/Cold": S(FAULT, "session", "roomTemp", "acIssue"),
  "Overcrowding in Class": S(CLASS_FB, "classCapacity", "attendees"),
  "Class Flow and Pacing": S(CLASS_FB, "trainer", "intensityDirection"),
  "Class Experience|Modifications in Routine": S(CLASS_FB, "trainer", "modificationNeeded", "member"),
  "Class Experience|Engagement with Clients": S(CLASS_FB, "trainer"),
  "Class Experience|Hands-on Adjustments": S(CLASS_FB, "trainer", "member", "consentAsked"),
  "Class Experience|Demonstration and Visual Cues": S(CLASS_FB, "trainer"),
  "Class Experience|Knowledge and Competence": S(CLASS_FB, "trainer"),
  "Class Experience|Brand Language Usage": S(CLASS_FB, "trainer"),
  "Grooming and Appearance": S(TRAINER_FB),
  "Attendance for Workshops": S(["studio", "when", "eventName", "eventDate", "headcount", "attendees", "reason", "reportedBy", "actionsTaken"]),
  "Attendance for Meetings": S(INTERNAL, "employeeName", "eventDate"),
  "Class Format Satisfaction": S(CLASS_FB, "preferenceDetail"),
  "Class Duration Suitability": S(CLASS_FB, "preferenceDetail"),
  "Instructor Energy and Motivation": S(CLASS_FB, "trainer"),
  "Class Variety and Themes": S(SUGGESTION, "session"),
  "Adjustments for Different Fitness Levels": S(CLASS_FB, "trainer", "modificationNeeded"),
  "Challenges in Following Instructor": S(CLASS_FB, "trainer"),
  "Member Injury During Class": S(SAFETY, "member", "session", "trainer", "firstAid", "medicalHelp"),
  "Physical Discomfort During Class (cramping / dizziness)": S(SAFETY, "member", "session", "trainer", "firstAid", "medicalHelp"),
  "Class Frequency and Format Preference": S(SUGGESTION),

  // Trainer Feedback
  "Trainer Forgot Names": S(TRAINER_FB),
  "Class Intensity Too High/Low": S(TRAINER_FB, "intensityDirection", "specificMoment"),
  "Trainer Hygiene": S(TRAINER_FB),
  "Trainer Punctuality Issues": S(TRAINER_FB, "minutesLate", "coverArranged", "membersInformed"),
  "Trainer Behaviour": S(TRAINER_FB, "specificMoment", "witnesses"),
  "Trainer Feedback|Modifications in Routine": S(TRAINER_FB, "modificationNeeded", "member"),
  "Trainer Feedback|Engagement with Clients": S(TRAINER_FB),
  "Trainer Feedback|Hands-on Adjustments": S(TRAINER_FB, "member", "consentAsked", "specificMoment"),
  "Trainer Feedback|Demonstration and Visual Cues": S(TRAINER_FB, "specificMoment"),
  "Trainer Feedback|Knowledge and Competence": S(TRAINER_FB, "specificMoment"),
  "Trainer Feedback|Brand Language Usage": S(TRAINER_FB, "specificMoment"),
  "Pre and Post-Class Outreach": S(TRAINER_FB),
  "Trainer Availability": S(SCHED, "trainer"),
  "Feedback Handling": S(TRAINER_FB),
  "Emergency Preparedness": S(TRAINER_FB, "incidentDetail", "trainingGap"),
  "Trainer Focus on Individual Needs": S(TRAINER_FB, "member"),
  "Class Ending on Time": S(TRAINER_FB, "minutesLate"),
  "Trainer Encouragement": S(TRAINER_FB),
  "Injury Prevention and Safety": S(TRAINER_FB, "injury", "injuryDetail", "specificMoment"),
  "Too Many Corrections vs. Too Few": S(TRAINER_FB, "specificMoment"),
  "Trainer No-Show / Late Arrival": S(TRAINER_FB, "minutesLate", "coverArranged", "membersInformed", "compensationOffered"),
  "Instructor Music Balance & Schedule Fit": S(TRAINER_FB, "noiseLevel"),
  "Trainer Experience and Intensity Consistency": S(TRAINER_FB, "intensityDirection"),

  // Repair and Maintenance
  "PowerCycle Bike Malfunction & Repairs": S(FAULT, "bikeNumber", "bikeIssue", "bikesOut", "classesAffected"),
  "Studio Lighting Malfunction & Repairs": S(FAULT, "lightIssue", "fixtureLocation", "classesAffected"),
  "Resistance Bands & Small Equipment Repairs": S(FAULT, "equipmentItem", "equipmentCount", "faultDetail"),
  "Strength Studio Equipment Repairs": S(FAULT, "equipmentItem", "equipmentCount", "faultDetail", "classesAffected"),
  "Audio, Mic & Headphone Malfunction": S(FAULT, "audioDevice", "audioIssue", "classesAffected"),
  "Housekeeping & Cleaning Issues": S(AMENITY, "cleanIssue", "lastCleaned", "housekeeperOnDuty", "actionsTaken"),
  "Washroom & Plumbing Repairs": S(FAULT, "washroomType", "plumbingIssue"),
  "AC & Ventilation Repairs": S(FAULT, "acUnit", "acIssue", "?roomTemp", "?classesAffected"),
  "Electrical & Power Issues": S(FAULT, "electricalIssue", "classesAffected", "riskNow"),
  "Doors, Locks & Fixture Repairs": S(FAULT, "fixtureName", "doorIssue", "riskNow"),
  "General Studio Repairs & Maintenance": S(FAULT, "equipmentItem", "faultDetail"),
  "TFA Malfunction": S(FAULT, "equipmentItem", "faultDetail", "classesAffected"),
  "Pest Control Needed": S(AMENITY, "pestType", "pestWhere", "lastPestControl", "vendorContacted", "vendorName"),
  "Staff Uniforms Not Clean": S(["studio", "when", "employeeName", "issueDetail", "recurrence", "reportedBy", "memberImpact", "actionsTaken"]),
  "Toiletries and Supplies Low": S(SUPPLY, "washroomType"),
  "Towel Availability Issues": S(SUPPLY, "towelIssue"),
  "Uncomfortable Lounge Seating": S(AMENITY, "faultDetail", "preferenceDetail"),
  "Air Fresheners Too Strong": S(AMENITY, "smellSource", "preferenceDetail"),
  "Music System Too Loud/Low": S(FAULT, "session", "noiseLevel", "audioDevice"),
  "Vending Machine Out of Stock": S(SUPPLY, "equipmentItem"),
  "Additional Waiting Area Seating": S(SUGGESTION, "area", "headcount"),
  "Fire Safety Compliance": S(["studio", "area", "when", "fireItem", "lastInspection", "riskNow", "vendorContacted", "vendorName", "managementInformed", "expectedResolution", "actionsTaken"]),
  "Water Dispenser Issues": S(FAULT, "faultDetail"),
  "Standard Operating Procedure (SOP) - create / update": S(INTERNAL, "documentRef", "approver"),
  "Vendor / AMC Management": S(["studio", "when", "vendorName", "equipmentItem", "issueDetail", "expiryDate", "amount", "requestSummary", "deadline", "approver"]),
  "Retail & Boutique Stock Replenishment": S(SUPPLY, "itemDescription"),
  "Attendance / Check-in Discrepancy": S(MEMBER_TECH, "session", "membershipOnAccount"),

  // Studio Amenities and Facilities
  "Studio Odour and Aroma": S(AMENITY, "smellSource", "cleanIssue", "lastCleaned"),
  "Cleanliness and Hygiene": S(AMENITY, "cleanIssue", "lastCleaned", "housekeeperOnDuty", "actionsTaken"),
  "Ventilation Poor": S(FAULT, "acUnit", "roomTemp"),
  "Air Quality Poor": S(FAULT, "smellSource", "acUnit"),
  "Valet Issues": S(["member", "studio", "when", "incidentDetail", "staffInvolved", "verbatim", "sentiment", "clientAsk", "responseGiven", "actionsTaken"]),
  "Locker Availability": S(AMENITY, "lockerNumber", "equipmentCount"),
  "Shower Water Pressure": S(FAULT, "washroomType", "plumbingIssue"),
  "Steam Room Not Working": S(FAULT, "faultDetail"),
  "Boutique Availability Issues": S(SUPPLY, "itemDescription", "member"),
  "Wi-Fi Slow": S(TECH, "studio", "area"),
  "Integration Issues": S(TECH, "businessImpact"),
  "Lost and Found Disorganization": S(AMENITY, "item", "staffInvolved", "actionsTaken"),
  "Availability of Gym Accessories": S(SUPPLY, "equipmentItem"),
  "Fitness Challenges and Rewards": S(SUGGESTION, "eventName"),
  "Additional Membership Perks": S(SUGGESTION, "membershipType"),
  "Smoothie Bar and Refreshments": S(SUGGESTION, "supplyItem"),
  "Member Lounge Cleanliness": S(AMENITY, "cleanIssue", "lastCleaned", "housekeeperOnDuty", "actionsTaken"),
  "Community Events and Social Engagement": S(SUGGESTION, "eventName"),
  "Holiday-Themed Classes": S(SUGGESTION, "eventDate"),
  "Sustainable and Eco-Friendly Practices": S(SUGGESTION),
  "Ventilation and Air Quality": S(FAULT, "acUnit", "roomTemp", "smellSource"),
  "Equipment Layout / Weights Arrangement": S(AMENITY, "equipmentItem", "preferenceDetail", "riskNow"),

  // Operating Systems
  "Moments Notice": S(TECH, "businessImpact"),
  "Stripe and Razorpay": S(PAY, "system", "errorMessage"),
  "Yellow Messenger": S(TECH, "member", "verbatim"),
  "Website Glitches": S(TECH, "contentRef"),
  "Router Connectivity": S(TECH, "studio", "area", "businessImpact"),
  "iPad Functionality": S(TECH, "studio", "hardwareItem", "businessImpact"),
  "Cash Counting Machine Issues": S(TECH, "studio", "hardwareItem", "amount"),
  "POS System Malfunctions": S(TECH, "studio", "businessImpact", "amount"),
  "CRM System Errors": S(TECH, "businessImpact"),
  "Data Security Issues": S(SAFETY, "dataType", "system"),
  "Technical Assistance": S(TECH, "requestSummary"),
  "Difficulty Tracking Sessions": S(MEMBER_TECH, "membershipOnAccount", "session"),
  "System Delays": S(TECH, "businessImpact"),
  "Software Bugs": S(TECH, "businessImpact"),
  "Mobile App UI/UX Issues": S(TECH, "issueDetail", "correctVersion"),
  "Attendance Record Discrepancies": S(MEMBER_TECH, "session", "membershipOnAccount"),
  "Missed Sessions Not Recorded": S(MEMBER_TECH, "session", "membershipOnAccount"),
  "Mobile App Freezing": S(MEMBER_TECH),
  "Delayed Notifications": S(MEMBER_TECH, "session"),
  "Error in Class Listings": S(TECH, "session", "studio", "correctVersion"),

  // Tech Issues
  "Laptops Not Functioning": S(TECH, "studio", "hardwareItem", "businessImpact"),
  "Speakers Static Noise": S(FAULT, "audioDevice", "audioIssue", "classesAffected"),
  "Mic Not Working": S(FAULT, "audioDevice", "audioIssue", "classesAffected"),
  "Phones Not Working": S(TECH, "studio", "hardwareItem", "businessImpact"),
  "App Performance Bugs": S(MEMBER_TECH),
  "Booking System Errors": S(MEMBER_TECH, "session", "membershipOnAccount", "verbatim", "sentiment"),
  "Password and Login Issues": S(MEMBER_TECH),
  "Payment Processing Delays": S(PAY, "system", "errorMessage"),
  "Online Class Streaming Buffering": S(MEMBER_TECH, "session"),
  "Notifications Not Received": S(MEMBER_TECH, "session"),
  "Auto-Debit Incorrect Charges": S(PAY, "membershipType", "expiryDate"),
  "Social Media Glitches": S(BRAND, "system"),
  "Wrong Class Bookings": S(MEMBER_TECH, "session", "membershipOnAccount", "clientAsk"),
  "Incorrect Charges on Account": S(PAY, "membershipType"),
  "Studio Music Preferences": S(SUGGESTION, "session", "trainer"),
  "Camera Surveillance Issues": S(FAULT, "fixtureName", "riskNow"),
  "Digital Receipts and Invoices": S(PAY, "system"),
  "Website Navigation Difficulties": S(TECH, "contentRef", "issueDetail"),
  "Virtual Class Video Quality": S(MEMBER_TECH, "session"),
  "Studio Wi-Fi Not Working": S(TECH, "studio", "area", "businessImpact"),

  // Pricing and Memberships
  "Price Transparency": S(PRICING, "priceQuoted"),
  "Membership Flexibility": S(PRICING, "requestedChange"),
  "Discounts and Offers Confusion": S(PRICING, "offerName", "priceQuoted"),
  "Refund and Cancellation Policy Issue": S(PRICING, "amount", "refundRequested"),
  "Auto-Renewal Concerns": S(PRICING, "expiryDate", "amount", "refundRequested"),
  "Transparency in TandC/": S(PRICING),
  "Add-on Services Pricing Clarity": S(PRICING, "priceQuoted"),
  "Class Pack Expiry Confusion": S(PRICING, "expiryDate", "membershipOnAccount"),
  "Private Session Pricing": S(PRICING, "priceQuoted", "trainer"),
  "Membership Upgrade/Downgrade": S(PRICING, "requestedChange", "priceQuoted"),
  "Lack of Payment Plan Options": S(PRICING, "amount", "preferenceDetail"),
  "Referral Discount Issues": S(PRICING, "offerName", "personInvolved"),
  "Holiday and Special Pricing Clarity": S(PRICING, "offerName", "priceQuoted"),
  "Corporate Wellness Program Pricing": S(["when", "companyName", "headcount", "priceQuoted", "requestedChange", "stakeholders", "deadline", "approvalNeeded", "?member"]),
  "Pricing for International Clients": S(PRICING, "priceQuoted", "paymentMethod"),
  "Membership Pause and Freeze Policy": S(PRICING, "reason", "requestedChange", "expiryDate"),
  "Special Group Discounts": S(PRICING, "headcount", "offerName"),
  "Loyalty Program Issues": S(PRICING, "offerName"),
  "Policy Non-Compliance / Unauthorised Refunds": S(["when", "member", "staffInvolved", "amount", "transactionRef", "policyInQuestion", "approver", "incidentDetail", "managementInformed", "actionsTaken"]),
  "Studio Location & Pricing Preference": S(PRICING, "studio", "preferenceDetail"),

  // Customer Service and Communication
  "Delay in Response": S(SERVICE),
  "Unresolved Complaints": S(SERVICE, "issueDetail", "previousIncidents"),
  "Front Desk Attitude": S(SERVICE, "studio", "specificMoment"),
  "Miscommunication on Offers": S(SERVICE, "offerName", "whatWasCommunicated", "understanding"),
  "Response Time to Queries": S(SERVICE),
  "Follow-up Post Inquiry": S(SERVICE, "issueDetail"),
  "Friendliness and Approachability": S(SERVICE, "studio"),
  "Call Handling Etiquette": S(SERVICE, "specificMoment"),
  "Clarity in Policies": S(SERVICE, "policyInQuestion", "understanding"),
  "Late Response to Complaints": S(SERVICE, "issueDetail"),
  "Handling of Complaints": S(SERVICE, "issueDetail", "studio"),
  "Feedback Follow-up Process": S(SERVICE, "issueDetail"),
  "Compensation for Service Issues": S(SERVICE, "compensationOffered", "amount", "approvalNeeded"),
  "Customer Retention Strategies": S(INTERNAL, "member", "sentiment"),
  "Over-promising and Under-delivery": S(SERVICE, "whatWasCommunicated", "understanding"),
  "Response to Negative Reviews": S(BRAND, "member", "verbatim", "sentiment"),
  "Training of Customer Service Team": S(INTERNAL, "trainingGap", "studio"),
  "Training of Sales Team": S(INTERNAL, "trainingGap", "studio"),
  "Knowledge of Membership Policies": S(SERVICE, "policyInQuestion", "trainingGap"),
  "Proactive Client Engagement": S(SUGGESTION, "member"),
  "Competitor Solicitation / Client Poaching": S(["studio", "when", "personInvolved", "incidentDetail", "member", "witnesses", "verbatim", "managementInformed", "actionsTaken"]),
  "Lead Conversion / Engagement Strategy": S(INTERNAL, "leadsCount"),
  "Lead Management / Sales Tracking": S(INTERNAL, "leadsCount", "system"),
  "Lead Follow-up / Missing Contact Details": S(INTERNAL, "leadsCount", "staffInvolved"),

  // Brand Feedback
  "Hosted Class Feedback": S(["studio", "when", "eventName", "partnerName", "headcount", "attendees", "verbatim", "sentiment", "issueDetail", "leadsCount"]),
  "Brand Positioning": S(BRAND),
  "Brand Identity Consistency": S(BRAND),
  "Marketing Message Accuracy": S(BRAND, "whatWasCommunicated"),
  "Brand Tone Consistency": S(BRAND),
  "Social Media Engagement": S(BRAND),
  "Advertising Consistency": S(BRAND),
  "Collaborations and Partnerships": S(BRAND, "partnerName"),
  "Merchandise Quality": S(["studio", "when", "itemDescription", "issueDetail", "equipmentCount", "member", "verbatim", "refundRequested", "actionsTaken"]),
  "Member Recognition Efforts": S(SUGGESTION, "member"),
  "Influencer Engagement": S(BRAND, "partnerName"),
  "Staff Wearing Incorrect Branding": S(["studio", "when", "employeeName", "issueDetail", "recurrence", "reportedBy", "memberImpact", "actionsTaken"]),
  "Merchandise Display Issues": S(AMENITY, "itemDescription", "preferenceDetail"),
  "Branded Content Guidelines": S(BRAND),
  "Member Recognition Events": S(SUGGESTION, "eventName", "eventDate"),
  "Newsletter Effectiveness": S(BRAND),
  "Brand Perception in Market": S(BRAND, "verbatim"),
  "Perception of Pricing Value": S(PRICING),
  "Client Testimonials Management": S(BRAND, "member"),
  "Client Loyalty Recognition": S(SUGGESTION, "member"),
  "Brand Event Participation": S(BRAND, "eventName", "eventDate", "headcount"),
  "Marketing Collateral Production & Review": S(BRAND, "requestSummary"),
  "Partnership / Collab Approval": S(BRAND, "partnerName", "requestSummary"),
  "Post-Event Lead Reporting": S(INTERNAL, "eventName", "leadsCount"),

  // Safety and Security
  "Emergency Exits Blocked": S(SAFETY, "fixtureName"),
  "Panic Button Malfunction": S(FAULT, "fixtureName", "riskNow"),
  "Unlocked Doors": S(SAFETY, "fixtureName", "staffInvolved"),
  "CCTV Malfunction": S(FAULT, "fixtureName", "riskNow"),
  "Security Guard Issues": S(SAFETY, "guardOnDuty", "staffInvolved"),
  "Client Harassment Reports": S(SAFETY, "member", "verbatim", "victimSupport", "police"),
  "Fire Drills Not Conducted": S(["studio", "when", "lastInspection", "fireItem", "trainingGap", "riskNow", "managementInformed", "expectedResolution", "actionsTaken"]),
  "Suspicious Individuals Inside Studio": S(SAFETY, "idChecked", "guardOnDuty", "police"),
  "Front Desk Not Checking IDs": S(SAFETY, "staffInvolved", "idChecked", "trainingGap"),
  "Unregistered Walk-ins": S(SAFETY, "idChecked", "session", "staffInvolved"),
  "Trespassing Concerns": S(SAFETY, "guardOnDuty", "police"),
  "Personal Safety Concerns": S(SAFETY, "member", "verbatim", "victimSupport"),
  "Harassment Reports": S(SAFETY, "verbatim", "victimSupport", "police"),
  "Data Breach Concerns": S(SAFETY, "dataType", "system"),
  "Employee Security Training": S(INTERNAL, "trainingGap", "studio"),
  "Reporting Suspicious Activity": S(SAFETY, "police"),
  "Staff Security Concerns": S(SAFETY, "employeeName", "victimSupport"),
  "Handling of Medical Emergencies": S(SAFETY, "member", "firstAid", "medicalHelp", "session"),
  "First Aid Kit Availability": S(SUPPLY, "area", "riskNow"),
  "Unauthorized Use of Equipment": S(SAFETY, "equipmentItem", "staffInvolved"),

  // Theft and Lost Items
  "Locker Theft": S(THEFT, "lockerNumber", "member"),
  "Stolen Personal Items": S(THEFT, "member"),
  "Misplaced Valuables": S(LOST, "itemValue"),
  "Items Taken from Boutique": S(THEFT, "equipmentCount"),
  "Items Left Behind by Clients": S(LOST),
  "Studio Lost and Found Management": S(AMENITY, "item", "staffInvolved", "actionsTaken"),
  "Staff Theft": S(THEFT, "employeeName", "managementInformed"),
  "Reporting Stolen Items": S(THEFT),
  "Theft Prevention Measures": S(SUGGESTION, "area", "riskNow"),
  "Theft Investigation Process": S(THEFT, "managementInformed"),
  "Personal Items Taken from Trainer Area": S(THEFT, "trainer"),
  "Issues with Valet Theft": S(THEFT, "member", "staffInvolved"),
  "Theft by Other Members": S(THEFT, "member", "personInvolved"),
  "Lost Shoes/Workout Gear": S(LOST, "member"),
  "Safe Storage for Client Bags": S(SUGGESTION, "area"),
  "Clients Forgetting Items in Studio": S(LOST),
  "Missing Towels": S(SUPPLY, "towelIssue", "equipmentCount"),
  "Theft During Busy Hours": S(THEFT, "session"),
  "Members Taking Extra Equipment": S(["studio", "when", "member", "equipmentItem", "equipmentCount", "staffInvolved", "verbatim", "responseGiven", "actionsTaken"]),
  "Coffee and Refreshments Options": S(SUGGESTION, "supplyItem"),

  // Miscellaneous
  "Music Volume Issues": S(FAULT, "session", "noiseLevel", "trainer"),
  "Studio Decor and Ambience": S(SUGGESTION, "area"),
  "Mobile Charging Stations": S(SUGGESTION, "area"),
  "Late-Night Class Safety": S(SAFETY, "session"),
  "Noise Complaints from Neighbors": S(["studio", "when", "neighbourDetail", "noiseLevel", "session", "verbatim", "recurrence", "managementInformed", "actionsTaken"]),
  "Misplaced Equipment": S(LOST, "equipmentItem", "equipmentCount"),
  "Temperature Control Inconsistency": S(FAULT, "acUnit", "roomTemp"),
  "Scent Sensitivities": S(AMENITY, "smellSource", "member"),
  "Lighting Preferences": S(SUGGESTION, "area", "lightIssue"),
  "Cold Air Drafts": S(FAULT, "acUnit", "roomTemp"),
  "Overcrowding in Lobby": S(AMENITY, "headcount", "session"),
  "Construction Noise Nearby": S(["studio", "when", "neighbourDetail", "sinceWhen", "noiseLevel", "classesAffected", "membersComplained", "complaintWho", "complaintWhat", "actionsTaken"]),
  "Child-Friendly Facilities": S(SUGGESTION),
  "Outdoor Signage Visibility": S(AMENITY, "fixtureName", "preferenceDetail"),
  "Feedback Fatigue": S(SUGGESTION, "channel"),
  "Personal Storage Lockers Needed": S(SUGGESTION, "lockerNumber"),
  "Background Music Selection": S(SUGGESTION, "session"),
  "Social Media Response Time": S(SERVICE, "channel", "contentRef"),
  "Customer Flow Management": S(AMENITY, "headcount", "session", "preferenceDetail"),

  // Internal Operations & Admin
  "Internal Operations Memo / Escalation": S(INTERNAL, "studio"),
  "SOP & Policy Governance (issue, version, publish)": S(INTERNAL, "documentRef", "approver"),
  "Quality Assurance Audit / Checklist Sign-off": S(INTERNAL, "studio", "documentRef", "approver"),
  "Post-Class Session Reporting & Feedback Loop": S(INTERNAL, "session", "trainer"),
  "Hosted Class / Event Lead Capture & Tracking": S(INTERNAL, "eventName", "leadsCount", "partnerName"),
  "Performance Review / Payroll / Leave (HR-Admin)": S(INTERNAL, "employeeName", "amount"),
  "HRIS & Shift Tooling Access (Zoho Shift)": S(TECH, "employeeName", "requestSummary"),
  "Handover / Shift Reporting Gap": S(INTERNAL, "studio", "staffInvolved"),
  "Internal Communication Gap / Workflow Approval": S(INTERNAL, "approver"),
  "Business Intelligence & Report Request": S(INTERNAL, "documentRef", "system"),
  "B2B / Corporate Wellness Ops Feedback": S(INTERNAL, "companyName", "headcount"),
};

/** Fallback when a subcategory (e.g. one learned from ticket history) has no spec yet. */
export const CATEGORY_DEFAULTS: Record<string, string[]> = {
  Scheduling: S(SCHED),
  "Class Experience": S(CLASS_FB),
  "Trainer Feedback": S(TRAINER_FB),
  "Repair and Maintenance": S(FAULT, "equipmentItem", "faultDetail"),
  "Studio Amenities and Facilities": S(AMENITY, "amenity", "faultDetail"),
  "Operating Systems": S(TECH),
  "Tech Issues": S(TECH),
  "Pricing and Memberships": S(PRICING),
  "Customer Service and Communication": S(SERVICE),
  "Brand Feedback": S(BRAND),
  "Safety and Security": S(SAFETY),
  "Theft and Lost Items": S(THEFT),
  Miscellaneous: S(SUGGESTION, "issueDetail"),
  "Internal Operations & Admin": S(INTERNAL),
};
const GENERIC = S(["studio", "when", "issueDetail", "impact", "reportedBy", "memberImpact", "actionsTaken", "?member"]);

// ── Resolving a spec for names that aren't an exact key ──────────────────────
// Live taxonomy names come from ticket history and drift from the spec keys
// ("AC and HVAC Issues" vs "AC & Ventilation Repairs"), so lookup is layered.

/** "AC & Ventilation Repairs" and "ac and ventilation repairs" compare equal; "(…)" asides are ignored. */
export const normName = (s: string) =>
  s.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();

let normIndex: Map<string, string> | null = null;
const byNormName = (key: string) => {
  normIndex ??= new Map(Object.keys(SPECS).map((k) => [normName(k), k]));
  return normIndex.get(normName(key));
};

/**
 * Key words in a subcategory name that identify the physical thing at fault.
 * Scoped to the facilities categories so e.g. a "PowerCycle booking" issue
 * under Scheduling never picks up the bike-repair questions.
 */
const FACILITY_CATS = new Set(["Repair and Maintenance", "Studio Amenities and Facilities"].map(normName));
const KEYWORD_SPECS: Array<[RegExp, string]> = [
  [/\b(ac|hvac|air ?con(dition(er|ing))?|aircon|ventilation|cooling)\b/, "AC & Ventilation Repairs"],
  [/\b(bike|bikes|powercycle|cycle)\b/, "PowerCycle Bike Malfunction & Repairs"],
  [/\b(light|lights|lighting)\b/, "Studio Lighting Malfunction & Repairs"],
  [/\b(audio|mic|mics|headphone|headphones|speaker|speakers|sound|music)\b/, "Audio, Mic & Headphone Malfunction"],
  [/\b(washroom|toilet|plumbing|shower|leak|leakage|drain)\b/, "Washroom & Plumbing Repairs"],
  [/\b(electric|electrical|power|wiring|socket)\b/, "Electrical & Power Issues"],
  [/\b(door|doors|lock|locks|locker|lockers)\b/, "Doors, Locks & Fixture Repairs"],
  [/\b(clean|cleaning|housekeeping|hygiene)\b/, "Housekeeping & Cleaning Issues"],
  // Catch-all last: any other repair/maintenance name.
  [/\b(repair|repairs|maintenance|broken|fault|faulty)\b/, "General Studio Repairs & Maintenance"],
];
const byKeyword = (category: string, subcategory: string) => {
  if (!FACILITY_CATS.has(normName(category))) return undefined;
  const n = normName(subcategory);
  return KEYWORD_SPECS.find(([re, key]) => re.test(n) && SPECS[key])?.[1];
};

/** Pickers every AI-chosen spec still gets, so a ticket always has where and when. */
const AI_BASE = ["studio", "?area", "when"];

export type SpecSource = "exact" | "normalized" | "keyword" | "ai" | "category" | "generic" | "none";

export function resolveSpec(
  category: string | null,
  subcategory: string | null,
  aiKeys?: string[] | null,
): { keys: string[]; source: SpecSource; matched?: string } {
  if (!category) return { keys: [], source: "none" };
  if (subcategory) {
    const exact = SPECS[`${category}|${subcategory}`] ? `${category}|${subcategory}` : SPECS[subcategory] ? subcategory : undefined;
    if (exact) return { keys: SPECS[exact], source: "exact", matched: exact };
    const norm = byNormName(`${category}|${subcategory}`) ?? byNormName(subcategory);
    if (norm) return { keys: SPECS[norm], source: "normalized", matched: norm };
    const kw = byKeyword(category, subcategory);
    if (kw) return { keys: SPECS[kw], source: "keyword", matched: kw };
  }
  // No spec for this name: use the fields the AI picked for this report, if any.
  if (aiKeys?.length) return { keys: uniq([...AI_BASE, ...aiKeys]), source: "ai" };
  const cat = CATEGORY_DEFAULTS[category] ?? CATEGORY_DEFAULTS[Object.keys(CATEGORY_DEFAULTS).find((c) => normName(c) === normName(category)) ?? ""];
  return cat ? { keys: cat, source: "category" } : { keys: GENERIC, source: "generic" };
}

export function specFor(category: string | null, subcategory: string | null, aiKeys?: string[] | null): string[] {
  return resolveSpec(category, subcategory, aiKeys).keys;
}
