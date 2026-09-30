// Demo call videos shown on the landing page. Files live in public/videos/demos/.
export type DemoDirection = "inbound" | "outbound";

export interface DemoVideo {
  file: string;
  title: string;
  business: string;
  category: string;
  direction: DemoDirection;
  tag: string;
  result: string;
  googleMeet: boolean;
}

export const DEMO_CATEGORIES = [
  "Healthcare",
  "Home services",
  "Professional services",
  "Restaurants & hospitality",
  "Sales & retail",
  "Beauty, fitness & education"
];

export const DEMO_VIDEOS: DemoVideo[] = [
  {
    "file": "01-dental-emergency",
    "title": "2:14 AM. A toothache won't wait.",
    "business": "Bright Smile Dental",
    "category": "Healthcare",
    "direction": "inbound",
    "tag": "Inbound · After hours",
    "result": "Emergency slot booked · 8:00 AM",
    "googleMeet": false
  },
  {
    "file": "02-law-firm-after-hours",
    "title": "11:47 PM. The law office is closed.",
    "business": "Harper & Cole Law",
    "category": "Professional services",
    "direction": "inbound",
    "tag": "Inbound · After hours",
    "result": "Google Meet booked · 10:00 AM",
    "googleMeet": true
  },
  {
    "file": "03-restaurant-dinner-rush",
    "title": "Friday, 7 PM. The dinner rush.",
    "business": "Olive & Ember",
    "category": "Restaurants & hospitality",
    "direction": "inbound",
    "tag": "Inbound · Peak hours",
    "result": "Table for 4 booked · 7:30 PM",
    "googleMeet": false
  },
  {
    "file": "04-real-estate-viewing",
    "title": "Sunday. Nobody's in the office.",
    "business": "Keystone Realty",
    "category": "Sales & retail",
    "direction": "inbound",
    "tag": "Inbound · Weekend",
    "result": "Viewing scheduled · 11:30 AM",
    "googleMeet": false
  },
  {
    "file": "05-plumbing-emergency",
    "title": "3 AM. A pipe just burst.",
    "business": "Swift Plumbing",
    "category": "Home services",
    "direction": "inbound",
    "tag": "Inbound · Emergency",
    "result": "Plumber dispatched · ETA 40 min",
    "googleMeet": false
  },
  {
    "file": "06-hvac-same-day",
    "title": "104°F. The AC just died.",
    "business": "CoolAir HVAC",
    "category": "Home services",
    "direction": "inbound",
    "tag": "Inbound · Busy lines",
    "result": "Same-day repair · 5–7 PM",
    "googleMeet": false
  },
  {
    "file": "07-spa-offer",
    "title": "Empty slots? Fill them automatically.",
    "business": "Glow Studio",
    "category": "Beauty, fitness & education",
    "direction": "outbound",
    "tag": "Outbound · Offer",
    "result": "Offer accepted · Thu 3:00 PM",
    "googleMeet": false
  },
  {
    "file": "08-dental-reminder",
    "title": "No-shows cost you money.",
    "business": "Bright Smile Dental",
    "category": "Healthcare",
    "direction": "outbound",
    "tag": "Outbound · Reminder",
    "result": "Appointment confirmed · 2:30 PM",
    "googleMeet": false
  },
  {
    "file": "09-delivery-address-check",
    "title": "Wrong address? Not anymore.",
    "business": "Oakline Furniture",
    "category": "Sales & retail",
    "direction": "outbound",
    "tag": "Outbound · Address check",
    "result": "Address updated · Unit 3C",
    "googleMeet": false
  },
  {
    "file": "10-auto-repair-upsell",
    "title": "Your car is ready. So is the upsell.",
    "business": "Precision Auto",
    "category": "Sales & retail",
    "direction": "outbound",
    "tag": "Outbound · Update",
    "result": "Pickup ready · Brakes booked Mon",
    "googleMeet": false
  },
  {
    "file": "11-vet-vaccine-reminder",
    "title": "Reminders that sound human.",
    "business": "Happy Paws Vet",
    "category": "Healthcare",
    "direction": "outbound",
    "tag": "Outbound · Reminder",
    "result": "Vaccine visit · Sat 10:00 AM",
    "googleMeet": false
  },
  {
    "file": "12-gym-renewal",
    "title": "Win back members. On autopilot.",
    "business": "IronCore Fitness",
    "category": "Beauty, fitness & education",
    "direction": "outbound",
    "tag": "Outbound · Renewal",
    "result": "Renewed · +1 month free",
    "googleMeet": false
  },
  {
    "file": "13-salon-sunday-booking",
    "title": "Sunday night. The salon is closed.",
    "business": "Luxe Hair Studio",
    "category": "Beauty, fitness & education",
    "direction": "inbound",
    "tag": "Inbound · After hours",
    "result": "Cut & color · Wed 4:00 PM",
    "googleMeet": false
  },
  {
    "file": "14-clinic-reschedule",
    "title": "12 callers on hold. Zero now.",
    "business": "Northside Medical",
    "category": "Healthcare",
    "direction": "inbound",
    "tag": "Inbound · Peak hours",
    "result": "Rescheduled · Fri 9:00 AM",
    "googleMeet": false
  },
  {
    "file": "15-insurance-lead-meet",
    "title": "Qualify leads while you sleep.",
    "business": "Shield Insurance",
    "category": "Professional services",
    "direction": "inbound",
    "tag": "Inbound · After hours",
    "result": "Advisor call · Tomorrow 11 AM",
    "googleMeet": true
  },
  {
    "file": "16-movers-quote-followup",
    "title": "Follow up on every single quote.",
    "business": "SwiftMove Co.",
    "category": "Home services",
    "direction": "outbound",
    "tag": "Outbound · Follow-up",
    "result": "Move booked · Sat 8:00 AM",
    "googleMeet": false
  },
  {
    "file": "17-hotel-late-night",
    "title": "1 AM. The front desk is swamped.",
    "business": "Harborview Hotel",
    "category": "Restaurants & hospitality",
    "direction": "inbound",
    "tag": "Inbound · Overnight",
    "result": "Room reserved · Tonight",
    "googleMeet": false
  },
  {
    "file": "18-car-dealer-test-drive",
    "title": "Every lead, answered in one ring.",
    "business": "Metro Motors",
    "category": "Sales & retail",
    "direction": "inbound",
    "tag": "Inbound · Sales lead",
    "result": "Test drive booked · 5:00 PM",
    "googleMeet": false
  },
  {
    "file": "19-solar-lead-meet",
    "title": "Turn web leads into meetings.",
    "business": "BrightSun Solar",
    "category": "Sales & retail",
    "direction": "outbound",
    "tag": "Outbound · Lead follow-up",
    "result": "Consultation · Tomorrow 4 PM",
    "googleMeet": true
  },
  {
    "file": "20-tax-season-rush",
    "title": "Tax season. Phones on fire.",
    "business": "Clearview Tax",
    "category": "Professional services",
    "direction": "inbound",
    "tag": "Inbound · Peak season",
    "result": "Accountant booked · Tue 3 PM",
    "googleMeet": false
  },
  {
    "file": "21-pharmacy-rx-ready",
    "title": "Good news, delivered by voice.",
    "business": "CarePlus Pharmacy",
    "category": "Healthcare",
    "direction": "outbound",
    "tag": "Outbound · Notification",
    "result": "Delivery · Today 4–6 PM",
    "googleMeet": false
  },
  {
    "file": "22-cod-order-confirmation",
    "title": "Stop failed deliveries.",
    "business": "UrbanCart",
    "category": "Sales & retail",
    "direction": "outbound",
    "tag": "Outbound · Order check",
    "result": "Order confirmed · After 2 PM",
    "googleMeet": false
  },
  {
    "file": "23-physio-rebook",
    "title": "Missed appointment? Rebooked.",
    "business": "Motion Physio",
    "category": "Healthcare",
    "direction": "outbound",
    "tag": "Outbound · Rebooking",
    "result": "Rebooked · Thu 6:00 PM",
    "googleMeet": false
  },
  {
    "file": "24-pest-control-inspection",
    "title": "7:55 AM. You're not open yet.",
    "business": "GuardPest Control",
    "category": "Home services",
    "direction": "inbound",
    "tag": "Inbound · Before hours",
    "result": "Free inspection · Fri 9:00 AM",
    "googleMeet": false
  },
  {
    "file": "25-tutoring-demo-class",
    "title": "Parents call after work.",
    "business": "BrightMinds Tutoring",
    "category": "Beauty, fitness & education",
    "direction": "inbound",
    "tag": "Inbound · After hours",
    "result": "Demo class · Sat 11:00 AM",
    "googleMeet": true
  },
  {
    "file": "26-wedding-venue-tour",
    "title": "Big day. Zero missed inquiries.",
    "business": "The Rosewood Estate",
    "category": "Restaurants & hospitality",
    "direction": "inbound",
    "tag": "Inbound · Weekend",
    "result": "Venue tour · Sun 1:00 PM",
    "googleMeet": false
  },
  {
    "file": "27-cleaning-recurring-offer",
    "title": "Turn one-time jobs into regulars.",
    "business": "Sparkle Home Cleaning",
    "category": "Home services",
    "direction": "outbound",
    "tag": "Outbound · Offer",
    "result": "Recurring plan · 15% off",
    "googleMeet": false
  },
  {
    "file": "28-it-helpdesk-reset",
    "title": "Support that never sleeps.",
    "business": "Nimbus IT Desk",
    "category": "Professional services",
    "direction": "inbound",
    "tag": "Inbound · Overnight",
    "result": "Account unlocked · Ticket closed",
    "googleMeet": false
  },
  {
    "file": "29-roofing-storm-inspection",
    "title": "After the storm, the phones explode.",
    "business": "Summit Roofing",
    "category": "Home services",
    "direction": "inbound",
    "tag": "Inbound · Storm day",
    "result": "Free inspection · Tomorrow 10 AM",
    "googleMeet": false
  },
  {
    "file": "30-catering-order-confirm",
    "title": "Confirm every detail. Every order.",
    "business": "Saffron Catering",
    "category": "Restaurants & hospitality",
    "direction": "outbound",
    "tag": "Outbound · Order check",
    "result": "Order updated · 55 guests",
    "googleMeet": false
  }
];
