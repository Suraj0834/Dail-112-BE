// =============================================================================
// scripts/seed.js  — seed officers + PCR vans into MongoDB
// Run: node scripts/seed.js   (from the backend/ folder)
// =============================================================================
'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

// ── load models ──
require('../src/models/User.model');
require('../src/models/PcrVan.model');

const User   = mongoose.model('User');
const PcrVan = mongoose.model('PcrVan');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dial112';

// ---------------------------------------------------------------------------
// Officers to seed
// ---------------------------------------------------------------------------
const OFFICERS = [
    { name: 'SI Ramesh Kumar',      email: 'ramesh.kumar@delhi.police',   phone: '9811001001', badgeId: 'DL-2401', station: 'Connaught Place PS',   rank: 'Sub-Inspector'  },
    { name: 'HC Priya Singh',        email: 'priya.singh@delhi.police',    phone: '9811001002', badgeId: 'DL-1892', station: 'Parliament Street PS', rank: 'Head Constable'  },
    { name: 'ASI Mohan Lal',         email: 'mohan.lal@delhi.police',      phone: '9811001003', badgeId: 'DL-3345', station: 'Chanakyapuri PS',      rank: 'Asst Sub-Inspector' },
    { name: 'Const. Sunita Yadav',   email: 'sunita.yadav@delhi.police',   phone: '9811001004', badgeId: 'DL-5521', station: 'Saket PS',             rank: 'Constable'       },
    { name: 'SI Arjun Sharma',       email: 'arjun.sharma@delhi.police',   phone: '9811001005', badgeId: 'DL-2978', station: 'Rohini PS',            rank: 'Sub-Inspector'  },
    { name: 'HC Deepak Verma',       email: 'deepak.verma@delhi.police',   phone: '9811001006', badgeId: 'DL-7788', station: 'Punjabi Bagh PS',      rank: 'Head Constable'  },
    { name: 'Const. Vikram Patel',   email: 'vikram.patel@delhi.police',   phone: '9811001007', badgeId: 'DL-6630', station: 'Laxmi Nagar PS',       rank: 'Constable'       },
    { name: 'ASI Nisha Gupta',       email: 'nisha.gupta@delhi.police',    phone: '9811001008', badgeId: 'DL-3317', station: 'Dwarka Sector-23 PS',  rank: 'Asst Sub-Inspector' },
    { name: 'SI Karan Mehta',        email: 'karan.mehta@delhi.police',    phone: '9811001009', badgeId: 'DL-1155', station: 'Civil Lines PS',        rank: 'Sub-Inspector'  },
    { name: 'HC Anjali Rawat',       email: 'anjali.rawat@delhi.police',   phone: '9811001010', badgeId: 'DL-4410', station: 'Janakpuri PS',         rank: 'Head Constable'  },
    { name: 'SI Rahul Bhatia',       email: 'rahul.bhatia@delhi.police',   phone: '9811001011', badgeId: 'DL-8821', station: 'Karol Bagh PS',        rank: 'Sub-Inspector'  },
    { name: 'Const. Pooja Mehta',    email: 'pooja.mehta@delhi.police',    phone: '9811001012', badgeId: 'DL-9934', station: 'Saket PS',             rank: 'Constable'       },
    { name: 'ASI Dev Prasad',        email: 'dev.prasad@delhi.police',     phone: '9811001013', badgeId: 'DL-2267', station: 'Rohini PS',            rank: 'Asst Sub-Inspector' },
    { name: 'SI Meena Kumari',       email: 'meena.kumari@delhi.police',   phone: '9811001014', badgeId: 'DL-1043', station: 'Connaught Place PS',   rank: 'Sub-Inspector'  },
    { name: 'HC Suresh Chauhan',     email: 'suresh.chauhan@delhi.police', phone: '9811001015', badgeId: 'DL-5590', station: 'Laxmi Nagar PS',       rank: 'Head Constable'  },
];

// ---------------------------------------------------------------------------
// PCR Vans to seed  (assignedOfficer filled after seeding officers)
// ---------------------------------------------------------------------------
const PCR_VANS_CONFIG = [
    { vehicleName: 'PCR Van Alpha-1',   plateNo: 'DL01CA0101', model: 'Tata Safari', color: 'White', station: 'Connaught Place PS',   assignedOfficerBadge: 'DL-2401', status: 'Available', location: { coordinates: [77.2240, 28.6350] } },
    { vehicleName: 'PCR Van Bravo-2',   plateNo: 'DL01CA0202', model: 'Mahindra Bolero', color: 'White', station: 'Parliament Street PS', assignedOfficerBadge: 'DL-1892', status: 'Busy',      location: { coordinates: [77.2058, 28.6248] } },
    { vehicleName: 'PCR Van Charlie-3', plateNo: 'DL01CA0303', model: 'Tata Safari', color: 'White', station: 'Chanakyapuri PS',      assignedOfficerBadge: 'DL-3345', status: 'Available', location: { coordinates: [77.1820, 28.6010] } },
    { vehicleName: 'PCR Van Delta-4',   plateNo: 'DL01CA0404', model: 'Mahindra Scorpio', color: 'White', station: 'Saket PS',        assignedOfficerBadge: 'DL-5521', status: 'Available', location: { coordinates: [77.2080, 28.5210] } },
    { vehicleName: 'PCR Van Echo-5',    plateNo: 'DL01CA0505', model: 'Tata Safari', color: 'White', station: 'Rohini PS',            assignedOfficerBadge: 'DL-2978', status: 'Busy',      location: { coordinates: [77.0700, 28.7500] } },
    { vehicleName: 'PCR Van Foxtrot-6', plateNo: 'DL01CA0606', model: 'Mahindra Bolero', color: 'Grey', station: 'Janakpuri PS',      assignedOfficerBadge: 'DL-4410', status: 'Off-Duty',  location: { coordinates: [77.0860, 28.6160] } },
    { vehicleName: 'PCR Van Golf-7',    plateNo: 'DL01CA0707', model: 'Tata Safari', color: 'White', station: 'Laxmi Nagar PS',       assignedOfficerBadge: 'DL-6630', status: 'Available', location: { coordinates: [77.2810, 28.6320] } },
    { vehicleName: 'PCR Van Hotel-8',   plateNo: 'DL01CA0808', model: 'Mahindra Scorpio', color: 'White', station: 'Dwarka Sector-23 PS', assignedOfficerBadge: 'DL-3317', status: 'Available', location: { coordinates: [77.0480, 28.5790] } },
    { vehicleName: 'PCR Van India-9',   plateNo: 'DL01CA0909', model: 'Tata Safari', color: 'White', station: 'Punjabi Bagh PS',      assignedOfficerBadge: 'DL-7788', status: 'Maintenance', location: { coordinates: [77.1200, 28.6650] } },
    { vehicleName: 'PCR Van Juliet-10', plateNo: 'DL01CA1010', model: 'Mahindra Bolero', color: 'White', station: 'Civil Lines PS',   assignedOfficerBadge: 'DL-1155', status: 'Available', location: { coordinates: [77.2310, 28.6530] } },
];

// ---------------------------------------------------------------------------
async function seed() {
    console.log('🔄 Connecting to MongoDB…');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected');

    // ── Seed officers ──────────────────────────────────────────────────────
    console.log('\n👮 Seeding officers…');
    const officerIds = {};
    for (const o of OFFICERS) {
        const exists = await User.findOne({ email: o.email });
        if (exists) {
            console.log(`   skip (exists): ${o.name}`);
            officerIds[o.badgeId] = exists._id;
            continue;
        }
        const user = new User({
            ...o,
            password: 'officer@123',
            role: 'police',
            isActive: true,
            isOnDuty: true,
            currentLocation: {
                type: 'Point',
                coordinates: [77.2090 + (Math.random() - 0.5) * 0.15, 28.6139 + (Math.random() - 0.5) * 0.15],
            },
        });
        await user.save();
        officerIds[o.badgeId] = user._id;
        console.log(`   ✅ ${o.name} (${o.badgeId})`);
    }

    // ── Seed PCR vans ──────────────────────────────────────────────────────
    console.log('\n🚐 Seeding PCR vans…');
    for (const cfg of PCR_VANS_CONFIG) {
        const exists = await PcrVan.findOne({ plateNo: cfg.plateNo });
        if (exists) {
            console.log(`   skip (exists): ${cfg.vehicleName}`);
            continue;
        }
        const van = await PcrVan.create({
            vehicleName: cfg.vehicleName,
            plateNo: cfg.plateNo,
            model: cfg.model,
            color: cfg.color,
            station: cfg.station,
            assignedOfficer: officerIds[cfg.assignedOfficerBadge] || null,
            status: cfg.status,
            isVisible: true,
            location: { type: 'Point', coordinates: cfg.location.coordinates, address: cfg.station },
            lastSeen: new Date(),
        });
        console.log(`   ✅ ${van.vehicleName} (${van.plateNo})`);
    }

    console.log('\n🎉 Seeding complete!');
    console.log('   All officer passwords: officer@123');
    await mongoose.disconnect();
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
});
