/**
 * Field library for intake. Every question IRIS can ask lives here once; the
 * per-subcategory specs (./specs.ts) pick which ones a report must answer.
 *
 * Special keys are answered by the intake card's own pickers instead of
 * `details`: studio, area, member, trainer, session, when.
 */

export type FieldKind = "text" | "textarea" | "chips" | "multi" | "yesno" | "date" | "number";

export type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  options?: string[];
  placeholder?: string;
  /** Only asked (and only required) when another answer matches. */
  showIf?: { key: string; in: string[] };
  /** Short question IRIS asks in chat when this is the next missing field. */
  ask?: string;
};

export const SPECIAL_KEYS = ["studio", "area", "member", "trainer", "session", "when"] as const;
export type SpecialKey = (typeof SPECIAL_KEYS)[number];
export const isSpecial = (k: string): k is SpecialKey => (SPECIAL_KEYS as readonly string[]).includes(k);

/** Answer that counts as captured when the reporter genuinely doesn't know. */
export const UNKNOWN = "Don't know";

const YES = ["Yes"];
const f = (key: string, label: string, kind: FieldKind, extra: Omit<FieldDef, "key" | "label" | "kind"> = {}): FieldDef => ({ key, label, kind, ...extra });
const chips = (key: string, label: string, options: string[], extra: Omit<FieldDef, "key" | "label" | "kind" | "options"> = {}) =>
  f(key, label, "chips", { options, ...extra });

const LIST: FieldDef[] = [
  // ── Pickers (rendered by the card, listed here for labels / chat prompts) ──
  f("studio", "Studio", "text", { ask: "Which studio is this at?" }),
  f("area", "Area / room", "text", { ask: "Which room or area exactly?" }),
  f("member", "Member", "text", { ask: "Which member is this about? Search them in Momence." }),
  f("trainer", "Trainer", "text", { ask: "Which trainer is this about?" }),
  f("session", "Class", "text", { ask: "Which class was it? Pick the session." }),
  f("when", "When it happened", "text", { ask: "When did this happen?" }),

  // ── Timeline & recurrence ──
  chips("sinceWhen", "Since when", ["Today", "Since yesterday", "2–3 days", "About a week", "More than a week", "On and off for a while"], { ask: "Since when has this been happening?" }),
  chips("recurrence", "Happened before?", ["First time", "Happened before", "Keeps recurring"], { ask: "Is this the first time, or has it happened before?" }),
  chips("reportedBy", "Who raised it", ["I noticed it", "Member", "Trainer", "Front desk", "Housekeeping", "Studio manager", "Vendor"], { ask: "Who first raised this?" }),

  // ── Impact on members ──
  chips("memberImpact", "Affecting member experience?", ["Yes, significantly", "Yes, slightly", "Not yet", "No"], { ask: "Is this affecting the member experience?" }),
  chips("impact", "Impact", ["One client", "Several clients", "Whole class", "Studio can't run classes"], { ask: "How many people does this affect?" }),
  chips("classesAffected", "Classes affected", ["None", "Next class only", "Several classes today", "All classes until fixed"], { ask: "Which classes are affected?" }),
  f("membersComplained", "Have members complained?", "yesno", { ask: "Have any members complained about it?" }),
  f("complaintWho", "Who complained", "text", { placeholder: "Names, or how many", showIf: { key: "membersComplained", in: YES }, ask: "Who complained?" }),
  f("complaintWhat", "What they said", "textarea", { placeholder: "Their words, as close as you can", showIf: { key: "membersComplained", in: YES }, ask: "What did they say?" }),
  chips("membersInformed", "Members told in advance?", ["Yes, before class", "Yes, during class", "No", "Not applicable"], { ask: "Were members told about it in advance?" }),
  chips("compensationOffered", "Compensation offered?", ["None", "Class credit", "Complimentary session", "Refund under review", "Escalated for decision"], { ask: "Was any compensation offered?" }),

  // ── Response so far ──
  f("frontDeskSteps", "Steps taken by front desk", "textarea", { placeholder: "What the desk did, and when", ask: "What has the front desk done so far?" }),
  f("actionsTaken", "Done so far", "textarea", { placeholder: "What you've already tried or told the client", ask: "What has been done about it so far?" }),
  f("workaround", "Temporary workaround", "textarea", { placeholder: "e.g. moved class, portable fan, spare mic", ask: "Is there a temporary workaround in place?" }),
  chips("vendorContacted", "Vendor / AMC contacted?", ["Yes, visit scheduled", "Yes, awaiting reply", "Not yet", "Not needed"], { ask: "Has the vendor or AMC been contacted?" }),
  f("vendorName", "Vendor & visit details", "text", { placeholder: "Vendor name, visit date/time", showIf: { key: "vendorContacted", in: ["Yes, visit scheduled", "Yes, awaiting reply"] }, ask: "Which vendor, and when are they visiting?" }),
  f("expectedResolution", "Expected resolution date", "date", { ask: "When do you expect it to be fixed?" }),
  chips("photoTaken", "Photo / video?", ["Yes, will attach", "No"], { ask: "Do you have a photo or video of it?" }),
  chips("managerInformed", "Studio manager informed?", ["Yes", "No", "I am the manager"], { ask: "Has the studio manager been informed?" }),

  // ── Equipment & facilities ──
  chips("usable", "Condition", ["Still usable", "Out of use", "Safety risk"], { ask: "Can it still be used safely?" }),
  f("faultDetail", "Nature of the problem", "textarea", { placeholder: "What exactly is wrong", ask: "What exactly is wrong with it?" }),
  f("equipmentItem", "Equipment / item", "text", { placeholder: "e.g. 2kg weights, resistance band (red)", ask: "Which equipment exactly?" }),
  f("equipmentCount", "How many affected", "number", { ask: "How many are affected?" }),
  chips("acIssue", "AC problem", ["Not cooling", "Not turning on", "Leaking water", "Noisy", "Bad smell", "Remote / thermostat not responding"], { ask: "What's wrong with the AC?" }),
  f("acUnit", "AC unit / location", "text", { placeholder: "e.g. Unit 2, above mirror wall", ask: "Which AC unit is it?" }),
  f("roomTemp", "Room temperature (°C)", "number", { ask: "Roughly what's the room temperature?" }),
  f("bikeNumber", "Bike number(s)", "text", { placeholder: "e.g. 7, 12", ask: "Which bike number(s)?" }),
  chips("bikeIssue", "Bike problem", ["Pedal / crank", "Saddle / seat post", "Resistance knob / brake", "Console / power meter", "Noise / squeak", "Wobbly / frame", "Cleats / shoes", "Other"], { ask: "What's wrong with the bike?" }),
  f("bikesOut", "Bikes out of use", "number", { ask: "How many bikes are out of use?" }),
  chips("lightIssue", "Lighting problem", ["Not switching on", "Flickering", "Too dim", "Dimmer / controls faulty", "Fitting damaged", "Mood lighting not working"], { ask: "What's wrong with the lights?" }),
  f("fixtureLocation", "Which fixture(s)", "text", { placeholder: "e.g. 3 ceiling lights near the mirror", ask: "Which lights or fixtures exactly?" }),
  chips("audioDevice", "Device", ["Headset mic", "Handheld mic", "Speakers", "Amplifier / mixer", "Headphones", "Bluetooth / streaming"], { ask: "Which audio device?" }),
  chips("audioIssue", "Audio problem", ["No sound", "Static / crackling", "Cutting out", "Too loud / too low", "Battery / charging", "Feedback / echo"], { ask: "What's the audio problem?" }),
  chips("plumbingIssue", "Plumbing problem", ["Leak", "Blocked drain / toilet", "No water", "Low pressure", "No hot water", "Flush not working", "Tap / fitting broken"], { ask: "What's the plumbing problem?" }),
  chips("washroomType", "Which washroom", ["Women's", "Men's", "Staff", "Common / unisex"], { ask: "Which washroom?" }),
  chips("electricalIssue", "Electrical problem", ["Power outage", "Socket not working", "MCB tripping", "UPS / inverter", "Exposed wiring", "Sparking / burning smell"], { ask: "What's the electrical problem?" }),
  chips("doorIssue", "Door / fixture problem", ["Lock jammed", "Key lost", "Handle broken", "Hinge / closer", "Door won't close", "Glass / mirror damaged", "Fixture loose"], { ask: "What's wrong with it?" }),
  f("fixtureName", "Which door / fixture", "text", { placeholder: "e.g. main entrance, locker room door", ask: "Which door or fixture?" }),
  chips("cleanIssue", "Cleanliness problem", ["Floor dirty", "Mats / props dirty", "Washroom unclean", "Bins overflowing", "Dust", "Stains / spills", "Odour"], { ask: "What's the cleanliness issue?" }),
  chips("lastCleaned", "Last cleaned", ["Before first class", "Within 2 hours", "Earlier today", "Not sure"], { ask: "When was it last cleaned?" }),
  f("housekeeperOnDuty", "Housekeeping staff on duty", "text", { ask: "Who was on housekeeping duty?" }),
  chips("pestType", "Pest", ["Cockroaches", "Rats / mice", "Ants", "Mosquitoes / flies", "Lizards", "Other"], { ask: "What pest was seen?" }),
  f("pestWhere", "Where it was seen", "text", { ask: "Where exactly was it seen?" }),
  f("lastPestControl", "Last pest-control service", "date", { ask: "When was the last pest-control service?" }),
  f("supplyItem", "Item(s) running low", "text", { placeholder: "e.g. hand wash, shampoo, tissues", ask: "Which items are running low?" }),
  chips("stockLeft", "Stock left", ["Out of stock", "Running low", "Enough for today"], { ask: "How much is left?" }),
  f("supplyNeededBy", "Needed by", "date", { ask: "By when is it needed?" }),
  f("quantityNeeded", "Quantity needed", "text", { ask: "How much is needed?" }),
  chips("towelIssue", "Towel problem", ["Ran out", "Not clean / smelly", "Damaged", "Laundry delayed"], { ask: "What's the towel issue?" }),
  f("amenity", "Amenity / facility", "text", { placeholder: "e.g. steam room, lockers, water dispenser", ask: "Which amenity or facility?" }),
  f("smellSource", "Suspected source", "text", { placeholder: "e.g. drain, carpet, AC, damp mats", ask: "Any idea where the smell is coming from?" }),
  chips("noiseLevel", "Level", ["Too loud", "Too low", "Uneven", "Distorted"], { ask: "Is it too loud, too low or uneven?" }),
  f("fireItem", "Item / compliance gap", "text", { placeholder: "e.g. extinguisher expired, exit sign off", ask: "Which fire-safety item or gap?" }),
  f("lastInspection", "Last inspection / drill", "date", { ask: "When was the last inspection or drill?" }),

  // ── Member feedback ──
  f("verbatim", "Client said", "textarea", { placeholder: "Their exact words, as close as you can remember", ask: "What exactly did the client say?" }),
  chips("sentiment", "Client mood", ["Calm", "Disappointed", "Frustrated", "Angry", "Threatening to leave"], { ask: "How is the client feeling?" }),
  f("clientAsk", "Client wants", "text", { placeholder: "e.g. a refund, a call back, a different trainer", ask: "What does the client want us to do?" }),
  f("responseGiven", "What we told the client", "textarea", { ask: "What did we tell the client?" }),
  chips("followUpPromised", "Follow-up promised", ["Call back", "WhatsApp", "Email", "Refund / credit review", "Nothing promised"], { ask: "Did we promise any follow-up?" }),
  chips("contactPref", "Client prefers contact by", ["Phone", "WhatsApp", "Email", "In person"], { ask: "How does the client prefer to be contacted?" }),
  chips("channelContacted", "How the client reached us", ["Walk-in", "Phone", "WhatsApp", "Email", "Instagram DM", "Google review", "Momence message"], { ask: "How did the client reach us?" }),
  chips("responseDelay", "How long they waited", ["Under a day", "1–3 days", "3–7 days", "Over a week", "Never got a reply"], { ask: "How long did they wait for a response?" }),
  f("staffInvolved", "Staff involved", "text", { ask: "Which staff member(s) were involved?" }),
  f("preferenceDetail", "Preference / suggestion", "textarea", { ask: "What exactly would they like?" }),
  chips("membersRequesting", "How many are asking", ["One member", "A few members", "Many members", "Internal suggestion"], { ask: "How many people are asking for this?" }),

  // ── Trainer & class ──
  chips("observedBy", "Observed by", ["Member", "Front desk", "Studio manager", "Another trainer", "I attended the class"], { ask: "Who observed this?" }),
  f("clientsInClass", "Clients in class", "number", { ask: "Roughly how many clients were in the class?" }),
  chips("raisedWithTrainer", "Raised with the trainer?", ["Yes", "No", "Not yet - need guidance"], { ask: "Has this been raised with the trainer?" }),
  f("trainerResponse", "Trainer's response", "textarea", { showIf: { key: "raisedWithTrainer", in: YES }, ask: "What did the trainer say?" }),
  chips("previousIncidents", "Previous incidents", ["First time", "Happened before", "Pattern - several times"], { ask: "Has this trainer had similar feedback before?" }),
  f("minutesLate", "Minutes late", "number", { ask: "How many minutes late?" }),
  chips("coverArranged", "Cover arranged?", ["Yes, another trainer", "Class delayed", "Class cancelled", "Not needed"], { ask: "Was cover arranged?" }),
  chips("intensityDirection", "Too…", ["Too intense", "Too easy", "Inconsistent"], { ask: "Was it too intense, too easy or inconsistent?" }),
  f("specificMoment", "Specific moment / exercise", "textarea", { placeholder: "e.g. thigh series, cool-down skipped", ask: "Which part of the class was it?" }),
  f("modificationNeeded", "Modification needed / condition", "text", { placeholder: "e.g. knee injury, pregnancy (2nd trimester)", ask: "What condition or modification was needed?" }),
  chips("consentAsked", "Consent asked before touch?", ["Yes", "No", "Not sure"], { ask: "Did the trainer ask before adjusting?" }),
  f("classCapacity", "Class capacity", "number", { ask: "What's the class capacity?" }),
  f("attendees", "People who attended", "number", { ask: "How many actually attended?" }),

  // ── Injury & safety ──
  chips("injury", "Injury", ["No injury", "Minor (first aid)", "Needs medical attention"], { ask: "Was anyone injured?" }),
  f("injuryDetail", "Injury details", "textarea", { placeholder: "Body part, what happened", showIf: { key: "injury", in: ["Minor (first aid)", "Needs medical attention"] }, ask: "What was the injury and how did it happen?" }),
  chips("firstAid", "First aid given?", ["Yes, by trainer", "Yes, by front desk", "No", "Not needed"], { ask: "Was first aid given?" }),
  chips("medicalHelp", "Medical help", ["Not needed", "Advised to see a doctor", "Ambulance called", "Taken to hospital"], { ask: "Was medical help needed?" }),
  f("incidentDetail", "What happened", "textarea", { placeholder: "Sequence of events", ask: "Describe what happened, in order." }),
  f("personInvolved", "Person(s) involved", "text", { placeholder: "Name or description", ask: "Who was involved?" }),
  f("witnesses", "Witnesses", "text", { ask: "Were there any witnesses?" }),
  chips("cctvChecked", "CCTV checked?", ["Yes, footage saved", "Yes, nothing found", "Not yet", "No camera there"], { ask: "Has CCTV been checked?" }),
  chips("riskNow", "Risk right now", ["Resolved", "Ongoing risk", "Area cordoned off"], { ask: "Is there still a risk right now?" }),
  chips("police", "Police", ["Not needed", "Advised", "Complaint filed"], { ask: "Have the police been involved?" }),
  chips("managementInformed", "Leadership informed?", ["Yes", "No", "Need help deciding"], { ask: "Has leadership been informed?" }),
  chips("victimSupport", "Support offered to the person affected", ["Spoke to them privately", "Offered escort / safe exit", "Contact details shared", "Nothing yet"], { ask: "What support has been offered to the person affected?" }),
  chips("idChecked", "ID / booking checked?", ["Yes", "No", "Not possible"], { ask: "Was their ID or booking checked?" }),
  chips("guardOnDuty", "Guard on duty?", ["Yes", "No", "Not at post"], { ask: "Was a guard on duty?" }),
  chips("dataType", "Data involved", ["Member contact details", "Payment data", "Health information", "Staff records", "Login credentials", "Not sure"], { ask: "What kind of data is involved?" }),
  chips("trainingGap", "Who needs training", ["Front desk", "Trainers", "Housekeeping", "Security", "Whole studio team"], { ask: "Who needs the training?" }),

  // ── Theft & lost items ──
  f("item", "Item", "text", { placeholder: "What was lost or stolen", ask: "What item is it?" }),
  f("itemDescription", "Item description", "text", { placeholder: "Brand, colour, distinguishing marks", ask: "Describe the item (brand, colour, marks)." }),
  f("itemValue", "Approx. value (₹)", "text", { ask: "Roughly what is it worth?" }),
  f("lastSeen", "Last seen (where & when)", "text", { ask: "Where and when was it last seen?" }),
  f("lockerNumber", "Locker number", "text", { ask: "Which locker number?" }),
  chips("ownerType", "Belongs to", ["Member", "Staff", "Trainer", "Studio property"], { ask: "Who does it belong to?" }),
  chips("itemStatus", "Current status", ["Still missing", "Found", "Returned to owner", "Handed to lost & found"], { ask: "Has the item been found?" }),

  // ── Scheduling ──
  f("currentSlot", "Current schedule / slot", "text", { placeholder: "e.g. Tue 7am Barre, Bandra", ask: "What's the current class slot?" }),
  f("requestedChange", "Change requested", "textarea", { ask: "What change is being asked for?" }),
  f("reason", "Reason", "textarea", { ask: "Why is it needed?" }),
  f("effectiveFrom", "Effective from", "date", { ask: "From when should it take effect?" }),
  f("bookedCount", "Booked", "number", { ask: "How many are booked?" }),
  f("waitlistCount", "Waitlisted", "number", { ask: "How many are on the waitlist?" }),
  chips("noticeGiven", "Notice given to members", ["More than 24h", "12–24h", "Under 12h", "None"], { ask: "How much notice did members get?" }),
  f("eventName", "Event / workshop", "text", { ask: "Which event or workshop?" }),
  f("eventDate", "Event date", "date", { ask: "When is the event?" }),
  f("headcount", "Expected headcount", "number", { ask: "How many people are expected?" }),

  // ── Systems, booking & payments ──
  chips("system", "System", ["Momence", "Momence app", "Website", "Razorpay", "Stripe", "Yellow Messenger", "POS", "CRM", "Zoho", "Studio iPad", "Instagram / social"], { ask: "Which system is it?" }),
  chips("device", "Device / platform", ["iPhone app", "Android app", "Website (mobile)", "Website (desktop)", "Front desk iPad", "Momence admin"], { ask: "Which device or app was used?" }),
  f("errorMessage", "Error shown", "text", { placeholder: "Exact message, or 'no error'", ask: "What error message did they see?" }),
  f("stepsToReproduce", "What they did", "textarea", { placeholder: "Steps leading to the problem", ask: "What steps lead to the problem?" }),
  f("worksVsFails", "What works / what doesn't", "textarea", { placeholder: "e.g. can book Strength, can't book PowerCycle", ask: "What works and what doesn't?" }),
  chips("affectedUsers", "Who is affected", ["One member", "Several members", "All members", "Staff only"], { ask: "Is it one person or many?" }),
  chips("screenshot", "Screenshot?", ["Yes, will attach", "No"], { ask: "Do you have a screenshot?" }),
  f("membershipOnAccount", "Active membership / pack", "text", { placeholder: "As shown in Momence", ask: "What membership or pack is on their account?" }),
  f("amount", "Amount (₹)", "text", { ask: "What's the amount involved?" }),
  chips("paymentMethod", "Payment method", ["UPI", "Card", "Netbanking", "Cash", "Payment link", "Auto-debit"], { ask: "How was it paid?" }),
  f("transactionRef", "Transaction / invoice ref", "text", { ask: "Is there a transaction or invoice reference?" }),
  f("paymentDate", "Payment date", "date", { ask: "When was the payment made?" }),
  chips("refundRequested", "Refund requested?", ["Yes, full", "Yes, partial", "Credit instead", "No"], { ask: "Is the client asking for a refund?" }),
  f("hardwareItem", "Device / hardware", "text", { placeholder: "e.g. front-desk laptop, studio phone", ask: "Which device exactly?" }),

  // ── Membership & pricing ──
  f("membershipType", "Membership / pack", "text", { ask: "Which membership or pack?" }),
  f("policyInQuestion", "Policy / offer in question", "text", { ask: "Which policy or offer is this about?" }),
  f("understanding", "What the client understood", "textarea", { ask: "What did the client understand or expect?" }),
  f("whatWasCommunicated", "What we actually communicated", "textarea", { placeholder: "By whom, where", ask: "What did we actually communicate, and where?" }),
  f("expiryDate", "Expiry / renewal date", "date", { ask: "What's the expiry or renewal date?" }),
  f("priceQuoted", "Price quoted", "text", { ask: "What price was quoted?" }),
  f("offerName", "Offer / discount", "text", { ask: "Which offer or discount?" }),
  chips("approvalNeeded", "Needs approval?", ["Yes, exception requested", "No, within policy", "Not sure"], { ask: "Does this need an exception approval?" }),
  f("companyName", "Company / group", "text", { ask: "Which company or group?" }),

  // ── Brand & marketing ──
  chips("channel", "Channel", ["Instagram", "Website", "WhatsApp", "Email / newsletter", "In-studio print", "Event", "Partner / collab", "Google"], { ask: "Which channel?" }),
  f("contentRef", "Link / post / asset", "text", { ask: "Which post, link or asset?" }),
  f("issueDetail", "What's wrong / the feedback", "textarea", { ask: "What exactly is the issue or feedback?" }),
  f("correctVersion", "What it should be", "textarea", { ask: "What should it say or look like instead?" }),
  f("deadline", "Needed by", "date", { ask: "By when is this needed?" }),
  f("approver", "Approver", "text", { ask: "Who needs to approve it?" }),
  f("partnerName", "Partner / brand / person", "text", { ask: "Which partner, brand or person?" }),
  f("leadsCount", "Leads captured", "number", { ask: "How many leads were captured?" }),

  // ── Internal / admin ──
  f("requestSummary", "Request", "textarea", { ask: "What exactly is being requested?" }),
  f("stakeholders", "People / teams involved", "text", { ask: "Which people or teams are involved?" }),
  f("employeeName", "Employee", "text", { ask: "Which employee is this about?" }),
  f("documentRef", "Document / SOP / report", "text", { ask: "Which document, SOP or report?" }),
  chips("businessImpact", "Business impact", ["Blocking work", "Slowing work", "Revenue at risk", "Compliance risk", "Nice to have"], { ask: "What's the business impact?" }),
  f("neighbourDetail", "Neighbour / source", "text", { ask: "Who or what is the source?" }),
];

export const FIELDS: Record<string, FieldDef> = Object.fromEntries(LIST.map((d) => [d.key, d]));
