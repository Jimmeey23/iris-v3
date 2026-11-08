// Knowledge Base - Tech Issues: guest Wi-Fi, front desk devices and phone
// lines, staff access and lockouts, member logins, the booking widget and
// automated notifications.
import { article, type KnowledgeArticle } from "./compose";

export const TECH_GUIDES: KnowledgeArticle[] = [
  article({
    id: "KB-120",
    title: "Guest Wi-Fi Not Working for Members",
    category: "Tech Issues",
    subcategory: "Network & Wi-Fi",
    summary:
      "Members can't join the guest Wi-Fi, the password doesn't work, or it's painfully slow. Check the guest network separately from the staff network, fix the usual causes, and keep the desk running if it's a wider outage.",
    glance: {
      priority: "P3 (P1 if the staff network is down too - follow KB-028)",
      owner: "Front Desk → IT",
      respond: "Within 1 hour",
      resolve: "Within 1 working day",
    },
    firstFive: [
      "Check whether the staff network and Momence are working - if not, follow KB-028.",
      "Try joining the guest network yourself with the posted password.",
      "Check that the password on the signage is the current one.",
    ],
    steps: [
      "Separate the problem: staff network fine and only guest Wi-Fi down is a P3; both down is KB-028.",
      "Test on your phone: does it join, and does a web page load?",
      "Password rejected: check with IT whether it changed, and update the signage.",
      "Joins but no internet: restart only the guest access point (never the main router) if IT has approved that step.",
      "Slow: check for heavy use at peak times and whether bandwidth limits are set.",
      "Log it (TPL-057) with the time, symptoms and what you tried; IT checks the controller and login page.",
      "Confirm the fix with a test device and update the signage if the password changed.",
    ],
    diagnose: [
      ["Members see the network but can't join", "Password changed or device limit reached."],
      ["Login page doesn't load", "Captive portal fault - IT."],
      ["Slow only at peak times", "Bandwidth limits - ask IT to review."],
    ],
    say: [
      [
        "At the desk",
        "Sorry, the guest Wi-Fi is down at the moment - our IT team is on it. The booking app works on mobile data too.",
      ],
    ],
    dos: ["Check the staff network first.", "Keep the signage current.", "Log what you tried."],
    donts: ["Don't give members the staff network password.", "Don't restart the main router during classes."],
    closeOut: ["Guest Wi-Fi working and tested.", "Signage updated."],
    prevention:
      "Keep the guest network separate from staff and POS devices, rotate its password on a schedule, and update the signage each time.",
    escalation:
      "Escalate to IT if the guest network is down for over a day or the staff network is affected (TPL-049; broadband outages TPL-210).",
    relatedTemplates: ["TPL-057", "TPL-049", "TPL-210"],
    tags: ["guest wi-fi", "wifi", "internet", "password", "network", "members"],
  }),

  article({
    id: "KB-121",
    title: "Check-In iPad Not Working",
    category: "Tech Issues",
    subcategory: "Front Desk Devices",
    summary:
      "The front desk iPad or check-in device is frozen, offline, logged out or won't scan. Keep check-ins moving by hand, fix the usual causes, and bring in IT if the device or app is faulty.",
    glance: {
      priority: "P1 during peak check-in (P2 otherwise)",
      owner: "Front Desk → IT",
      respond: "Within 5 minutes",
      resolve: "Same day",
    },
    firstFive: [
      "Switch to manual check-in on the desk computer or Momence on a phone.",
      "Check the iPad is on the staff Wi-Fi.",
      "Close and reopen the check-in app.",
    ],
    steps: [
      "Keep check-ins moving with Momence on the desk computer or a phone - or the paper list if Momence is down (KB-026).",
      "Check Wi-Fi: the iPad must be on the staff network, not the guest one.",
      "Force-close and reopen the check-in app; if it's still frozen, restart the iPad.",
      "Logged out: sign in with the studio's check-in account (the Front Desk Lead holds the credentials).",
      "Codes not scanning: clean the camera, and ask the member to turn up their screen brightness.",
      "Install app or iPadOS updates when prompted - but not during peak hours.",
      "Log it (TPL-211) with the device name and symptoms; members who couldn't check in go on TPL-065 (see KB-027).",
      "Before the end of the shift, mark everyone you checked in by hand in Momence.",
    ],
    diagnose: [
      ["App stuck loading", "Check the Wi-Fi and Momence's status."],
      ["iPad won't charge", "Swap the cable and adapter, then call IT."],
      ["QR codes won't scan", "Camera or brightness - check in by name instead."],
    ],
    say: [["At the desk", "Our check-in screen is having a moment - I'll check you in by name. You're all set for the 7 am."]],
    dos: ["Switch to manual check-in at once.", "Use the staff Wi-Fi.", "Back-fill attendance."],
    donts: ["Don't let a queue build while you troubleshoot.", "Don't update software at peak time."],
    closeOut: ["Device working and manual check-ins recorded.", "Fault logged."],
    prevention: "Keep the iPad on charge, schedule updates overnight, and keep a backup device signed in.",
    escalation:
      "Escalate to IT if the device keeps failing, or if check-in is down for every studio (TPL-048).",
    relatedTemplates: ["TPL-211", "TPL-065", "TPL-048"],
    tags: ["check-in ipad", "front desk device", "tablet", "check-in app", "scanner"],
  }),

  article({
    id: "KB-122",
    title: "Front Desk Computer or Printer Not Working",
    category: "Tech Issues",
    subcategory: "Front Desk Devices",
    summary:
      "The desk computer won't start, is very slow or has frozen, or the receipt or document printer has stopped. Keep the desk running on other devices, try the standard fixes, and get IT in for hardware faults.",
    glance: {
      priority: "P2 (P1 if the desk can't take payments or check members in)",
      owner: "Front Desk → IT",
      respond: "Within 30 minutes",
      resolve: "Within 1 working day",
    },
    firstFive: [
      "Move to a backup device - iPad, laptop or phone - for Momence.",
      "Check the cables and power, and that the monitor is on.",
      "Restart the computer if it's frozen.",
    ],
    steps: [
      "Use a backup device for Momence and payments so nobody waits.",
      "Computer: check power, cables and the monitor; restart if frozen; note any error message.",
      "Slow: close unused programs and browser tabs, and restart at a quiet moment.",
      "Printer: check paper, ink or toner and jams, and that it's online and set as the default.",
      "Turn the printer off and on again and clear the print queue.",
      "Log it (TPL-051 for the computer, TPL-056 for the printer, TPL-050 if the POS is affected) with error messages and photos.",
      "IT fixes it remotely or arranges a repair or replacement; record the asset tag.",
    ],
    diagnose: [
      ["Blue screen, or it won't boot", "Hardware or operating system fault - IT."],
      ["Printer shows offline", "Check the network or USB connection and set it as default."],
      ["Prints blank pages", "Replace the toner or ink."],
    ],
    say: [
      [
        "At the desk",
        "Our computer is restarting, so I'll take your payment on the card machine and email your receipt.",
      ],
    ],
    dos: ["Use a backup device.", "Note error messages.", "Record asset tags."],
    donts: ["Don't install software yourself.", "Don't keep members waiting while you troubleshoot."],
    closeOut: ["Device fixed or replaced.", "Fault logged."],
    prevention: "Restart desk computers weekly, keep spare toner and paper, and keep a backup device ready.",
    escalation: "Escalate to IT if the desk can't take payments or the device can't be fixed within a day.",
    relatedTemplates: ["TPL-051", "TPL-056", "TPL-050"],
    tags: ["computer", "printer", "front desk", "hardware", "receipt printer", "slow pc"],
  }),

  article({
    id: "KB-123",
    title: "Studio Phone or WhatsApp Business Line Down",
    category: "Tech Issues",
    subcategory: "Front Desk Devices",
    summary:
      "The studio phone isn't ringing, calls drop, or WhatsApp Business has disconnected or logged out. Switch to a backup number, tell members how to reach you, and restore the line quickly.",
    glance: {
      priority: "P1 (members can't reach the studio)",
      owner: "Front Desk Lead → IT",
      respond: "Within 15 minutes",
      resolve: "Same day",
    },
    firstFive: [
      "Test the line by calling the studio number from another phone.",
      "Check WhatsApp Business: is the phone online and the account still logged in?",
      "If the line is down, post the backup number on the website and Instagram.",
    ],
    steps: [
      "Test calls and WhatsApp from another phone to confirm exactly what's down.",
      "WhatsApp logged out: re-register on the studio phone with the OTP, then re-link WhatsApp Web on the desk computer.",
      "Check the phone has signal, data and free storage, then restart it.",
      "Landline or VoIP down: check the handset, cables and the provider's status.",
      "Set up a temporary backup number and publish it on the website, Instagram and Google Business profile.",
      "Log it (TPL-212) with times and the provider's ticket number.",
      "Once it's back, reply to every missed message and call (KB-087, TPL-166).",
    ],
    diagnose: [
      ["WhatsApp shows 'logged out'", "Re-register with the OTP on the studio phone."],
      ["Calls go straight to voicemail", "Check call forwarding and do-not-disturb."],
      ["Messages not syncing to the desk", "Re-link WhatsApp Web."],
    ],
    say: [
      [
        "Instagram story",
        "Our studio phone is down this morning - please WhatsApp us on our backup number for now. We'll be back on the main line soon.",
      ],
    ],
    dos: ["Publish a backup number.", "Answer missed messages afterwards.", "Keep the studio phone charged and secure."],
    donts: ["Don't use a personal number without approval.", "Don't share the WhatsApp OTP outside the team."],
    closeOut: ["Line restored and missed messages answered.", "Backup number taken down."],
    prevention:
      "Keep the studio phone on charge with two-step verification on WhatsApp Business, and keep a backup number ready.",
    escalation: "Escalate to IT if the line isn't back within 2 hours, and to Marketing to publish the backup number.",
    relatedTemplates: ["TPL-212", "TPL-166"],
    tags: ["phone line", "whatsapp business", "studio phone", "line down", "backup number"],
  }),

  article({
    id: "KB-124",
    title: "New Staff Member - System Access on Day One",
    category: "Tech Issues",
    subcategory: "Staff Accounts & Access",
    summary:
      "A new joiner needs Momence, Zoho Shift, email, WhatsApp groups and studio tools from their first shift. Request access early with the right roles, grant only what the role needs, and check every login works on day one.",
    glance: {
      priority: "P2 (P1 if they start within 2 working days)",
      owner: "Hiring manager → IT / HR",
      respond: "Within 1 working day of the offer being accepted",
      resolve: "Ready before day one",
    },
    firstFive: [
      "Confirm the joiner's role, studio, start date and manager.",
      "List the systems that role needs.",
      "Raise the access request at least 3 working days before they start.",
    ],
    steps: [
      "Raise the request (TPL-215) with the name, role, studio, start date and systems needed.",
      "IT creates accounts with role-based access - front desk roles don't get finance or admin rights.",
      "Set up email with two-step verification on day one (TPL-053 for email problems).",
      "Momence: a staff profile with the right role and studio. Zoho Shift: added to the roster (KB-134).",
      "Add them to the right WhatsApp groups and studio phone contacts.",
      "Check there's a spare licence for each tool, or request one (TPL-052).",
      "On day one, the manager checks every login works and covers the security basics.",
      "Record what was granted so it can all be revoked when they leave (KB-046).",
    ],
    diagnose: [
      ["Joiner can't log in on day one", "Check the account was activated and the password reset."],
      ["More access granted than the role needs", "Cut it back to the role's standard."],
      ["No licence available", "Request one, or reassign one from a leaver."],
    ],
    say: [
      [
        "Welcome message",
        "Welcome to the team, Ananya! Your Momence and email logins are ready - your manager will help you set up two-step verification on your first shift.",
      ],
    ],
    dos: ["Request access early.", "Grant role-based access.", "Record what was granted."],
    donts: ["Don't share another person's login.", "Don't grant admin rights by default."],
    closeOut: ["Every login tested on day one.", "Access record saved."],
    prevention: "Use a role-based access checklist for each job and start requests as soon as an offer is accepted (TPL-089).",
    escalation: "Escalate to the IT lead if access isn't ready the day before the start date.",
    relatedTemplates: ["TPL-215", "TPL-089", "TPL-052"],
    tags: ["new joiner", "onboarding", "system access", "staff accounts", "momence access", "provisioning"],
  }),

  article({
    id: "KB-125",
    title: "Staff Locked Out - Passwords, 2FA or Email Access",
    category: "Tech Issues",
    subcategory: "Staff Accounts & Access",
    summary:
      "A staff member is locked out of Momence, email, Zoho or another tool - a forgotten password, a lost phone for two-step verification, or a suspended account. Verify who they are, restore access securely, and rule out a security problem.",
    glance: {
      priority: "P2 (P1 if it stops them running the desk or a class)",
      owner: "Staff member → IT",
      respond: "Within 1 hour",
      resolve: "Same day",
    },
    firstFive: [
      "Confirm the person's identity, in person or through their manager.",
      "Find out which system it is and what error they see.",
      "Check for signs of a compromised account - resets they didn't ask for, strange emails.",
    ],
    steps: [
      "Verify identity before any reset - never reset access on the strength of a WhatsApp message alone.",
      "Forgotten password: use the self-service reset; if that fails, IT resets it and forces a change at the next login.",
      "Lost phone for two-step verification: IT verifies identity, removes the old device and enrols the new one.",
      "Locked after failed attempts or suspended: IT checks the sign-in log for unusual activity.",
      "If anything looks suspicious, follow KB-039 and sign out all sessions.",
      "Log it (TPL-061 for system access, TPL-053 for email, TPL-063 for remote access) with the system and cause.",
      "Remind them to use a password manager and keep backup codes somewhere safe.",
    ],
    diagnose: [
      ["Many failed logins they didn't make", "Possible attack - follow KB-039."],
      ["New phone, no 2FA", "IT enrols the new device."],
      ["A shared desk login stopped working", "Someone changed it - move to individual logins."],
    ],
    say: [
      [
        "Reply",
        "I've confirmed it's you with your manager and reset your password - you'll be asked to set a new one when you log in.",
      ],
    ],
    dos: ["Verify identity first.", "Check the sign-in logs.", "Use individual accounts."],
    donts: ["Don't send passwords over WhatsApp.", "Don't switch off two-step verification to save time."],
    closeOut: ["Access restored securely.", "Suspicious activity ruled out."],
    prevention: "Use individual accounts, a password manager and saved backup codes for two-step verification.",
    escalation: "Escalate to IT security immediately if the lockout looks like an attack or affects several staff.",
    relatedTemplates: ["TPL-061", "TPL-053", "TPL-063"],
    tags: ["locked out", "password reset", "two-step verification", "2fa", "email access", "staff account"],
  }),

  article({
    id: "KB-126",
    title: "Member Can't Log In or Reset Their Password",
    category: "Tech Issues",
    subcategory: "Member App, Website & Notifications",
    summary:
      "A member can't log into the app or website, never gets the OTP or reset email, or sees an error. Check their account details, fix the usual causes, and book them in while you sort it out.",
    glance: {
      priority: "P2 (P1 if they're trying to book a class that starts soon)",
      owner: "Front Desk → IT",
      respond: "Within 1 hour",
      resolve: "Same day",
    },
    firstFive: [
      "If it's urgent, book their class for them at the desk.",
      "Check the phone number and email on their profile.",
      "Ask what they see - no OTP, an error, or a wrong-password message.",
    ],
    steps: [
      "Book the class from the desk if they need it now.",
      "Check the profile: is the phone or email correct, and is there a duplicate profile (KB-092)?",
      "No OTP or reset email: check spam, SMS do-not-disturb settings, and that they're using the registered number or email.",
      "Send a password reset from Momence, or update the login email or phone after verifying identity.",
      "App errors: ask them to update the app, restart the phone, or try the website.",
      "Log it (TPL-214, or TPL-055 for app bugs) with screenshots, the device and the app version.",
      "If several members report the same thing, treat it as an outage and tell IT straight away.",
    ],
    diagnose: [
      ["OTP never arrives", "Wrong number or DND blocking - update it, or use email."],
      ["'Account not found'", "They signed up with a different email or number."],
      ["Logs in but sees no membership", "Duplicate profile - merge them (KB-092)."],
    ],
    say: [
      [
        "At the desk",
        "I've booked you into the 7 pm for now. Your account had an old email on it, so I've updated it - try the reset link I've just sent.",
      ],
    ],
    dos: ["Book them in first.", "Verify identity before changing login details.", "Watch for patterns."],
    donts: ["Don't ask members for their password.", "Don't change login details without verification."],
    closeOut: ["Member logged in successfully.", "Duplicates merged if found."],
    prevention: "Check contact details at every sign-up and keep the login help page up to date.",
    escalation: "Escalate to IT if several members can't log in, or a member's problem lasts more than a day.",
    relatedTemplates: ["TPL-214", "TPL-055"],
    tags: ["member login", "password reset", "otp", "app login", "account access", "member app"],
  }),

  article({
    id: "KB-127",
    title: "Website Booking Widget Broken",
    category: "Tech Issues",
    subcategory: "Member App, Website & Notifications",
    summary:
      "The website's booking widget won't load, shows the wrong schedule, or fails at checkout. Confirm what's broken, send members to the app meanwhile, and get IT and the web team on it fast - every hour costs bookings.",
    glance: {
      priority: "P1 (bookings are blocked)",
      owner: "Front Desk / Marketing → IT / web team",
      respond: "Within 30 minutes",
      resolve: "Within 4 hours",
    },
    firstFive: [
      "Test the widget yourself on a laptop and a phone.",
      "Check that booking in the Momence app and at the desk still works.",
      "Post a short notice pointing members to the app.",
    ],
    steps: [
      "Pin down the symptom: not loading, wrong schedule, an error at checkout, or payments failing.",
      "Check Momence itself at the desk and in the app - if that's down too, follow KB-026.",
      "Wrong schedule: compare it with Momence; it may be a sync or listing problem (KB-129, KB-130).",
      "Checkout failing: check whether payments work in the app; if not, see KB-133.",
      "Log it (TPL-213) with screenshots, the browser and the device; integration errors go on TPL-060.",
      "Point members to the app or WhatsApp booking until it's fixed.",
      "After the fix, test a full booking end to end and remove the notice.",
    ],
    diagnose: [
      ["Widget blank on the website", "Embed code or script blocked - web team."],
      ["Classes missing from the widget", "Sync or listing settings - KB-129."],
      ["Payment error at checkout", "Payment gateway - KB-133."],
    ],
    say: [
      [
        "Notice",
        "Website booking is having trouble right now - please book through the app, or message us on WhatsApp and we'll book you in.",
      ],
    ],
    dos: ["Test on a laptop and a phone.", "Offer the app as a backup.", "Test end to end after the fix."],
    donts: ["Don't edit the website embed yourself.", "Don't leave it broken overnight without a notice."],
    closeOut: ["Widget working and tested.", "Notice removed."],
    prevention: "Check the booking page daily and test it after any website change.",
    escalation: "Escalate to the IT lead if bookings are blocked for more than 2 hours.",
    relatedTemplates: ["TPL-213", "TPL-060", "TPL-058"],
    tags: ["website", "booking widget", "online booking", "checkout", "embed", "web"],
  }),

  article({
    id: "KB-128",
    title: "Automated Reminders, Receipts or WhatsApp Notifications Not Sending",
    category: "Tech Issues",
    subcategory: "Member App, Website & Notifications",
    summary:
      "Booking confirmations, class reminders, receipts or WhatsApp notifications aren't reaching members. Work out how many are affected, send critical messages by hand, and get the integration fixed.",
    glance: {
      priority: "P1 if every member is affected (P2 for individuals)",
      owner: "Front Desk → IT",
      respond: "Within 1 hour",
      resolve: "Within 1 working day",
    },
    firstFive: [
      "Check whether it's one member or everyone.",
      "Check the notification log in Momence for failures.",
      "Send urgent messages - cancellations and changes - by hand.",
    ],
    steps: [
      "One member: check their contact details, opt-outs and do-not-disturb settings.",
      "Everyone: check the notification log, the WhatsApp Business API status and the email provider.",
      "Send urgent notices by hand (class cancellations, schedule changes) while it's down.",
      "Log it (TPL-217, or TPL-073 for reminders) with examples and times; integration errors go on TPL-060.",
      "IT checks message templates, tokens, sender numbers and quotas.",
      "Once fixed, decide whether missed messages need resending, and handle any related no-show disputes (KB-065, KB-066).",
      "Confirm it works with a test booking.",
    ],
    diagnose: [
      ["WhatsApp template rejected", "The template needs re-approval - IT with Marketing."],
      ["Emails landing in spam", "Sender settings (SPF/DKIM) - IT."],
      ["Only receipts failing", "Payment integration - IT."],
    ],
    say: [
      [
        "To members",
        "Our automated reminders are paused today, so here's a quick note: your 6 pm Barre at Supreme HQ is confirmed. See you there!",
      ],
    ],
    dos: ["Check the scope first.", "Send urgent messages by hand.", "Test after the fix."],
    donts: ["Don't charge no-show fees caused by missing reminders.", "Don't resend everything without checking."],
    closeOut: ["Notifications working and tested.", "Affected members looked after."],
    prevention: "Monitor delivery rates weekly and renew API tokens and templates before they expire.",
    escalation: "Escalate to the IT lead if notifications are down for more than 4 hours.",
    relatedTemplates: ["TPL-217", "TPL-073", "TPL-060"],
    tags: ["notifications", "reminders", "receipts", "whatsapp api", "email", "automation"],
  }),
];
