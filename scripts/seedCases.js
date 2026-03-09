'use strict';
// scripts/seedCases.js — Seed 30 realistic FIR cases with reporters & suspects
// Run: node scripts/seedCases.js  (from the backend/ folder)

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
require('../src/models/User.model');
require('../src/models/Criminal.model');
require('../src/models/Case.model');

const User     = mongoose.model('User');
const Criminal = mongoose.model('Criminal');
const Case     = mongoose.model('Case');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dial112';

// Helper to pick random item from array
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

// Realistic Indian crime cases
const CASE_TEMPLATES = [
  {
    title: 'Mobile Phone Snatching at Connaught Place',
    description: 'Victim was walking near Rajiv Chowk metro station when two unknown persons on a motorcycle snatched their mobile phone and fled. The victim sustained minor injuries on right hand. CCTV footage has been requested from metro authorities.',
    category: 'THEFT',
    address: 'Rajiv Chowk, Connaught Place, New Delhi',
    coordinates: [77.2190, 28.6340],
    status: 'INVESTIGATING',
  },
  {
    title: 'Online Banking Fraud - OTP Scam',
    description: 'Victim received a call from an unknown person posing as a bank official and was tricked into sharing OTP. Rs 1,45,000 was transferred from victim\'s account to an unknown UPI handle. Victim immediately notified the bank but transaction could not be reversed.',
    category: 'CYBERCRIME',
    address: 'Dwarka Sector 7, New Delhi',
    coordinates: [77.0600, 28.5900],
    status: 'INVESTIGATING',
  },
  {
    title: 'Domestic Violence - Repeat Offender',
    description: 'Complainant reported repeated physical assault by spouse for the third time this month. Victim has sustained bruises on arms and face. Medical examination conducted at AIIMS. Restraining order has been requested by the complainant.',
    category: 'VIOLENCE',
    address: 'Rohini Sector 14, New Delhi',
    coordinates: [77.0700, 28.7400],
    status: 'PENDING',
  },
  {
    title: 'Investment Fraud - Ponzi Scheme',
    description: 'Multiple victims approached the police station reporting a fraudulent investment scheme. The accused collected Rs 45 lakhs from around 38 victims promising 30% monthly returns. The accused has fled and his mobile phone is switched off.',
    category: 'FRAUD',
    address: 'Karol Bagh, New Delhi',
    coordinates: [77.1900, 28.6510],
    status: 'INVESTIGATING',
  },
  {
    title: 'Workplace Sexual Harassment',
    description: 'Female employee at a private IT firm filed a written complaint against a senior manager for repeated sexual harassment over a period of 4 months. The complainant has provided digital evidence including WhatsApp messages and emails.',
    category: 'HARASSMENT',
    address: 'Cyber Hub, Gurugram, Haryana',
    coordinates: [77.0900, 28.4950],
    status: 'PENDING',
  },
  {
    title: 'Hit and Run - Delhi-Meerut Expressway',
    description: 'A speeding truck hit a motorcycle from behind on the expressway at around 2:30 AM. The motorcyclist sustained critical injuries and was rushed to GTB Hospital. The truck driver fled the scene. A partial number plate was captured by a toll booth camera.',
    category: 'ACCIDENT',
    address: 'Delhi-Meerut Expressway, NH-58',
    coordinates: [77.3500, 28.6700],
    status: 'RESOLVED',
  },
  {
    title: 'ATM Card Skimming - Laxmi Nagar',
    description: 'Complainant noticed unauthorized withdrawals from ATM totaling Rs 32,000 after using an ATM in Laxmi Nagar. Forensic examination of the ATM revealed a card skimming device. Bank has been requested to provide transaction logs.',
    category: 'CYBERCRIME',
    address: 'Laxmi Nagar Metro Station, New Delhi',
    coordinates: [77.2810, 28.6315],
    status: 'INVESTIGATING',
  },
  {
    title: 'Chain Snatching Near Saket Mall',
    description: 'Elderly woman was attacked by two individuals on a motorcycle who snatched her gold chain worth approximately Rs 95,000 near Select City Walk mall. The victim fell and sustained injuries. A witness captured partial video on mobile phone.',
    category: 'THEFT',
    address: 'Select City Walk, Saket, New Delhi',
    coordinates: [77.2100, 28.5280],
    status: 'INVESTIGATING',
  },
  {
    title: 'Land Encroachment Dispute Turns Violent',
    description: 'A property dispute between neighbors escalated into a violent altercation. Three persons from one family were injured and hospitalized. Iron rods and wooden sticks were used as weapons. Both parties have been summoned for mediation.',
    category: 'VIOLENCE',
    address: 'Najafgarh, New Delhi',
    coordinates: [76.9800, 28.6100],
    status: 'PENDING',
  },
  {
    title: 'Fake Property Documents Fraud',
    description: 'Buyer was defrauded of Rs 22 lakhs in a fake property deal in Noida Extension. The accused presented forged registration documents and took advance payment before disappearing. Multiple victims have come forward with similar complaints.',
    category: 'FRAUD',
    address: 'Noida Extension, Greater Noida',
    coordinates: [77.4200, 28.5950],
    status: 'CLOSEDINVESTIGATING',
  },
  {
    title: 'Cyberstalking and Threatening Messages',
    description: 'A college student reported receiving threatening messages and obscene photos sent via social media from multiple fake accounts. The perpetrator also contacted her family members. IP address tracking has been requested from the ISP.',
    category: 'HARASSMENT',
    address: 'Pitampura, New Delhi',
    coordinates: [77.1330, 28.7000],
    status: 'INVESTIGATING',
  },
  {
    title: 'Two-Wheeler Accident at ITO Crossing',
    description: 'A motorcycle jumped a red light and collided with an auto-rickshaw at the ITO crossing. Both riders were injured. The motorcycle rider is in stable condition at LNJP Hospital. CCTV footage confirms traffic violation by the motorcycle.',
    category: 'ACCIDENT',
    address: 'ITO Crossing, New Delhi',
    coordinates: [77.2440, 28.6270],
    status: 'CLOSED',
  },
  {
    title: 'Shop Break-In - Electronics Store',
    description: 'Owner discovered their electronics shop had been broken into during the night. Merchandise worth approximately Rs 3.2 lakhs including smartphones and laptops was stolen. The lock was drilled and the shutter was forced open.',
    category: 'THEFT',
    address: 'Nehru Place Market, New Delhi',
    coordinates: [77.2510, 28.5490],
    status: 'PENDING',
  },
  {
    title: 'Fake Medicine Racket Busted',
    description: 'Tip-off led to the discovery of a warehouse with counterfeit medicines including fake antibiotics and diabetes medication. Medicines worth Rs 80 lakhs were seized. This is a serious public health threat. Multiple arrests have been made.',
    category: 'FRAUD',
    address: 'Chandni Chowk, New Delhi',
    coordinates: [77.2300, 28.6560],
    status: 'RESOLVED',
  },
  {
    title: 'Acid Attack on Accident Witness',
    description: 'A witness to a road accident was targeted with acid attack allegedly by persons associated with the accused driver. The victim sustained burns to 35% of body. Emergency surgery was performed. The attack was captured on street CCTV cameras.',
    category: 'VIOLENCE',
    address: 'Okhla Phase 2, New Delhi',
    coordinates: [77.2750, 28.5410],
    status: 'INVESTIGATING',
  },
  {
    title: 'Phishing Website - E-Commerce Fraud',
    description: 'Victim discovered a fake e-commerce website mimicking a popular Indian retailer and made payments worth Rs 28,000 for goods that were never delivered. The phishing website was traced to servers located outside India.',
    category: 'CYBERCRIME',
    address: 'Janakpuri, New Delhi',
    coordinates: [77.0860, 28.6290],
    status: 'INVESTIGATING',
  },
  {
    title: 'Road Rage Assault Near Parliament',
    description: 'A minor traffic altercation near Parliament Street escalated into serious assault when one party attacked the other with a blunt object. The victim required stitches. Two eyewitnesses have given statements. Security camera footage is being reviewed.',
    category: 'VIOLENCE',
    address: 'Parliament Street, New Delhi',
    coordinates: [77.2058, 28.6248],
    status: 'PENDING',
  },
  {
    title: 'Car Theft from Airport Parking',
    description: 'Complainant returned from a 5-day business trip to find their car missing from IGI Airport long-term parking. The vehicle, a Honda City valued at Rs 8 lakhs, was later found abandoned in Mehrauli with number plates changed.',
    category: 'THEFT',
    address: 'IGI Airport Terminal 2, New Delhi',
    coordinates: [77.0860, 28.5540],
    status: 'RESOLVED',
  },
  {
    title: 'Extortion Calls from Jail',
    description: 'A business owner received multiple extortion calls from an unknown number demanding Rs 20 lakhs. Investigation revealed calls were being made from within Tihar Jail using contraband mobile phones. The matter has been escalated to the prison administration.',
    category: 'OTHER',
    address: 'Punjabi Bagh, New Delhi',
    coordinates: [77.1200, 28.6650],
    status: 'INVESTIGATING',
  },
  {
    title: 'Multi-Level Marketing Scam',
    description: 'A network of fraudsters operated an MLM scam across four Delhi districts, collecting membership fees totaling over Rs 1.2 crores from more than 500 victims. The scheme promised unrealistic income through referral commissions.',
    category: 'FRAUD',
    address: 'Shahdara, New Delhi',
    coordinates: [77.2985, 28.6694],
    status: 'INVESTIGATING',
  },
  {
    title: 'Child Trafficking Attempt Foiled',
    description: 'PCR van personnel intercepted a suspicious vehicle near the railway station and found two minors being transported without consent. The children were separated from their families in Bihar. Both children have been placed in protective custody.',
    category: 'OTHER',
    address: 'Old Delhi Railway Station, New Delhi',
    coordinates: [77.2295, 28.6567],
    status: 'RESOLVED',
  },
  {
    title: 'Corporate Espionage - Trade Secret Theft',
    description: 'A pharmaceutical company filed a complaint that a former employee allegedly copied confidential R&D data onto external drives before resignation. The stolen data pertains to two forthcoming drug patents worth crores in potential revenue.',
    category: 'CYBERCRIME',
    address: 'Udyog Vihar Phase 5, Gurugram',
    coordinates: [77.0700, 28.5020],
    status: 'INVESTIGATING',
  },
  {
    title: 'Mass Poisoning Incident at Wedding',
    description: 'Over 40 guests fell ill at a wedding reception after consuming contaminated food. Twelve guests were hospitalized with severe symptoms. Food samples have been sent to FSSAI laboratory for testing. The catering company is being investigated.',
    category: 'OTHER',
    address: 'Vasant Kunj, New Delhi',
    coordinates: [77.1570, 28.5220],
    status: 'INVESTIGATING',
  },
  {
    title: 'Pickpocketing Gang at Railway Station',
    description: 'Three persons arrested as part of a coordinated pickpocketing gang targeting passengers at New Delhi Railway Station. The gang operated in shifts and used distraction techniques. Cash and valuables totaling Rs 2.4 lakhs were recovered.',
    category: 'THEFT',
    address: 'New Delhi Railway Station, New Delhi',
    coordinates: [77.2095, 28.6418],
    status: 'CLOSED',
  },
  {
    title: 'Deepfake Video Extortion',
    description: 'A young professional reported receiving deepfake obscene video purportedly featuring her, created using her social media photos. The perpetrators are demanding Rs 3 lakhs to not share the video. Cyber cell has been activated on this case.',
    category: 'CYBERCRIME',
    address: 'South Delhi, New Delhi',
    coordinates: [77.2150, 28.5350],
    status: 'PENDING',
  },
  {
    title: 'Fake Police Officer Extortion',
    description: 'Complainant was stopped by a person impersonating a police officer who demanded Rs 15,000 in bribe threatening false charges. The incident was captured on a dashcam. A lookout notice has been issued with the suspect\'s vehicle description.',
    category: 'FRAUD',
    address: 'Outer Ring Road, New Delhi',
    coordinates: [77.1850, 28.6820],
    status: 'PENDING',
  },
  {
    title: 'Street Harassment - Eve Teasing',
    description: 'Female college student was repeatedly harassed by a group of young men on her daily college commute. The incident has occurred five times in two weeks on the same route. Two of the perpetrators have been identified from the metro cameras.',
    category: 'HARASSMENT',
    address: 'Hauz Khas Village, New Delhi',
    coordinates: [77.2020, 28.5490],
    status: 'INVESTIGATING',
  },
  {
    title: 'Drunk Driving Fatal Accident',
    description: 'A sedan driven by a suspected drunk driver crashed into a bus stop at 1:15 AM killing one person and injuring three others. Breath analyser test confirmed BAC of 0.12%. The driver has been arrested and his vehicle has been impounded.',
    category: 'ACCIDENT',
    address: 'Mathura Road, New Delhi',
    coordinates: [77.2600, 28.5600],
    status: 'RESOLVED',
  },
  {
    title: 'Ransomware Attack on Government Office',
    description: 'A district government office server was compromised by ransomware that encrypted critical citizen data. The attackers demanded payment in cryptocurrency. A cyber security incident team has been deployed to restore systems without paying the ransom.',
    category: 'CYBERCRIME',
    address: 'Civil Lines, New Delhi',
    coordinates: [77.2310, 28.6530],
    status: 'INVESTIGATING',
  },
  {
    title: 'Organized Begging Racket Busted',
    description: 'Police dismantled an organized begging ring that had been using trafficked people including disabled individuals and minors. A total of 23 persons were rescued. Three ringleaders have been arrested and a safe house has been seized.',
    category: 'OTHER',
    address: 'Paharganj, New Delhi',
    coordinates: [77.2105, 28.6430],
    status: 'CLOSED',
  },
];

async function seedCases() {
  console.log('\n🔄 Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected\n');

  // Fetch real officers & criminals from DB
  const officers  = await User.find({ role: 'police' }).select('_id name');
  const admins    = await User.find({ role: 'admin' }).select('_id name');
  const criminals = await Criminal.find().select('_id name');
  const reporters  = [...officers, ...admins];

  if (reporters.length === 0) {
    console.error('❌ No officers/admins found. Please seed officers first.');
    process.exit(1);
  }

  const existingCount = await Case.countDocuments();
  console.log(`📊 Current cases in DB: ${existingCount}`);

  if (existingCount >= 25) {
    console.log('✅ Already have 25+ cases. Skipping seed. Delete existing cases to re-seed.');
    await mongoose.disconnect();
    return;
  }

  // Delete any existing cases before re-seeding
  await Case.deleteMany({});
  console.log('🗑️  Cleared existing cases\n');

  let created = 0;
  for (let i = 0; i < CASE_TEMPLATES.length; i++) {
    const tpl = CASE_TEMPLATES[i];
    const reporter = pick(reporters);
    const officer  = officers.length > 0 ? pick(officers) : null;
    const suspect  = criminals.length > 0 ? pick(criminals) : null;

    // Some cases have no assigned officer (PENDING ones) or no suspect
    const shouldAssign  = tpl.status !== 'PENDING' || Math.random() > 0.4;
    const shouldSuspect = Math.random() > 0.3; // 70% have a linked suspect

    // Fix truncated status
    let status = tpl.status;
    if (status === 'CLOSEDINVESTIGATING') status = 'INVESTIGATING';

    const daysAgo = Math.floor(Math.random() * 60) + 1;
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    const timelineEntries = [
      {
        status: 'PENDING',
        note: 'FIR registered and assigned case number',
        updatedBy: reporter._id,
        timestamp: createdAt,
      },
    ];

    if (status === 'INVESTIGATING' || status === 'RESOLVED' || status === 'CLOSED') {
      const investigatingAt = new Date(createdAt.getTime() + 2 * 60 * 60 * 1000);
      timelineEntries.push({
        status: 'INVESTIGATING',
        note: officer ? `Case assigned to ${officer.name} for investigation` : 'Investigation initiated',
        updatedBy: officer ? officer._id : reporter._id,
        timestamp: investigatingAt,
      });
    }
    if (status === 'RESOLVED' || status === 'CLOSED') {
      const resolvedAt = new Date(createdAt.getTime() + 5 * 24 * 60 * 60 * 1000);
      timelineEntries.push({
        status: 'RESOLVED',
        note: 'Investigation completed. Chargesheet filed with the court.',
        updatedBy: officer ? officer._id : reporter._id,
        timestamp: resolvedAt,
      });
    }
    if (status === 'CLOSED') {
      const closedAt = new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
      timelineEntries.push({
        status: 'CLOSED',
        note: 'Case closed after court judgment. All evidence archived.',
        updatedBy: reporter._id,
        timestamp: closedAt,
      });
    }

    const caseDoc = new Case({
      title: tpl.title,
      description: tpl.description,
      category: tpl.category,
      location: {
        type: 'Point',
        coordinates: tpl.coordinates,
        address: tpl.address,
      },
      status,
      filedBy: reporter._id,
      assignedOfficer: shouldAssign && officer ? officer._id : null,
      suspect: shouldSuspect && suspect ? suspect._id : null,
      timeline: timelineEntries,
      aiCategory: tpl.category,
      aiConfidence: Math.round((0.72 + Math.random() * 0.25) * 100) / 100,
      createdAt,
      updatedAt: createdAt,
    });

    await caseDoc.save();
    console.log(`   ✅ [${i + 1}/30] ${tpl.title.substring(0, 55)}…`);
    created++;
  }

  console.log(`\n🎉 Seeded ${created} cases successfully!`);
  await mongoose.disconnect();
}

seedCases().catch((e) => {
  console.error('❌ Seed failed:', e.message);
  process.exit(1);
});
