// =============================================================================
// scripts/seed_vehicles.js  — seed 250 synthetic Indian vehicle records
// Run: node scripts/seed_vehicles.js   (from the backend/ folder)
// NOTE: All data is synthetic / fictional for development use only.
// =============================================================================
'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

require('../src/models/Vehicle.model');
const Vehicle = mongoose.model('Vehicle');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dial112';

// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
    'Rajesh', 'Amit', 'Sunil', 'Priya', 'Neha', 'Ravi', 'Anjali', 'Deepak',
    'Pooja', 'Vikram', 'Sunita', 'Rahul', 'Meena', 'Karan', 'Sanjay', 'Rekha',
    'Arun', 'Kavita', 'Vivek', 'Nisha', 'Manoj', 'Geeta', 'Rohit', 'Seema',
    'Suresh', 'Lata', 'Dinesh', 'Mamta', 'Ashok', 'Usha', 'Nitin', 'Poonam',
    'Hemant', 'Anita', 'Sachin', 'Vandana', 'Vinay', 'Rashmi', 'Harish', 'Shobha',
    'Ajay', 'Shweta', 'Pankaj', 'Ritu', 'Gaurav', 'Monika', 'Tarun', 'Priyanka',
    'Manish', 'Komal', 'Saurabh', 'Divya', 'Abhishek', 'Bharti', 'Yash', 'Namita',
    'Akash', 'Archana', 'Siddharth', 'Shreya', 'Mohit', 'Suman', 'Kapil', 'Nidhi',
    'Yogesh', 'Pallavi', 'Ankit', 'Madhuri', 'Lalit', 'Jyoti', 'Devesh', 'Shital',
    'Nikhil', 'Alka', 'Aakash', 'Rinki', 'Wasim', 'Fatima', 'Salman', 'Nazia',
    'Imran', 'Rukhsar', 'Feroz', 'Shabana', 'Arjun', 'Tanvi', 'Sumit', 'Asha',
    'Pranav', 'Swati', 'Tushar', 'Shilpa', 'Varun', 'Rani', 'Dhruv', 'Savita',
];

const LAST_NAMES = [
    'Kumar', 'Sharma', 'Singh', 'Verma', 'Gupta', 'Yadav', 'Patel', 'Shah',
    'Mehta', 'Joshi', 'Chauhan', 'Rawat', 'Bhatia', 'Malhotra', 'Kapoor', 'Arora',
    'Agarwal', 'Saxena', 'Mishra', 'Tiwari', 'Pandey', 'Srivastava', 'Dubey', 'Rao',
    'Reddy', 'Nair', 'Pillai', 'Menon', 'Iyer', 'Krishnan', 'Rajan', 'Subramaniam',
    'Choudhary', 'Jha', 'Das', 'Ghosh', 'Roy', 'Sen', 'Chatterjee', 'Banerjee',
    'Khan', 'Ansari', 'Sheikh', 'Siddiqui', 'Mirza', 'Qureshi', 'Ahmed', 'Hussain',
    'Naidu', 'Gowda', 'Hegde', 'Kamble', 'Patil', 'Deshmukh', 'Kulkarni', 'Bhatt',
    'Trivedi', 'Shukla', 'Thakur', 'Rathore', 'Chouhan', 'Sisodia', 'Meena', 'Solanki',
];

// State prefixes → [code, RTOs]
const STATE_RTO = [
    ['DL', ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']],
    ['MH', ['01', '02', '03', '04', '12', '14', '43']],
    ['KA', ['01', '02', '03', '04', '05', '41', '51']],
    ['GJ', ['01', '02', '03', '04', '05', '06', '07']],
    ['UP', ['14', '15', '16', '32', '65', '70', '80']],
    ['HR', ['10', '12', '26', '29', '51']],
    ['RJ', ['01', '06', '14', '19', '20']],
    ['TN', ['01', '09', '10', '11', '20']],
    ['MP', ['04', '09', '13', '27', '34']],
    ['PB', ['01', '10', '11', '65', '66']],
];

const SERIES_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

const VEHICLES = [
    // Two-wheelers
    { type: 'TWO_WHEELER', models: ['Bajaj Pulsar 150', 'Bajaj Pulsar 220', 'Hero Splendor+', 'Hero HF Deluxe', 'Honda Activa 6G', 'Honda CB Shine', 'TVS Apache RTR 160', 'TVS Jupiter', 'Royal Enfield Bullet 350', 'Royal Enfield Classic 350', 'Yamaha FZ-S', 'Yamaha R15 V4', 'Suzuki Access 125', 'Bajaj Avenger 220', 'Hero Passion Pro', 'Honda Unicorn 150'] },
    // Four-wheelers
    { type: 'FOUR_WHEELER', models: ['Maruti Swift', 'Maruti Dzire', 'Maruti Alto 800', 'Maruti Brezza', 'Hyundai i20', 'Hyundai Creta', 'Hyundai Verna', 'Hyundai Grand i10', 'Honda City', 'Honda Amaze', 'Tata Nexon', 'Tata Tiago', 'Tata Altroz', 'Mahindra XUV300', 'Mahindra Bolero Neo', 'Kia Seltos', 'Kia Sonet', 'Toyota Innova Crysta', 'Toyota Fortuner', 'Renault Kwid', 'Skoda Slavia', 'Volkswagen Polo', 'Ford EcoSport', 'Nissan Magnite', 'MG Hector', 'Maruti Ertiga'] },
    // Trucks
    { type: 'TRUCK', models: ['Tata 407', 'Tata 709', 'Tata Ace', 'Ashok Leyland Dost', 'Mahindra Jeeto', 'Eicher Pro 3015', 'Tata LPT 2518', 'BharatBenz 1015R', 'Ashok Leyland 2518', 'Tata Prima 3530'] },
    // Buses
    { type: 'BUS', models: ['Tata Starbus', 'Ashok Leyland LYNX', 'Volvo 9400', 'BharatBenz 1217', 'Force Traveller', 'Eicher 20.14', 'Tata Ultra 1012', 'SML ISUZU S7 Staff'] },
    // Other
    { type: 'OTHER', models: ['Bajaj RE Auto', 'Mahindra e-Alfa Mini', 'Piaggio Ape City', 'TVS King Auto', 'Atul Shakti Auto'] },
];

const COLORS = ['White', 'Black', 'Silver', 'Grey', 'Red', 'Blue', 'Dark Blue', 'Maroon', 'Blue-Grey', 'Pearl White', 'Metallic Silver', 'Golden', 'Orange', 'Yellow', 'Green'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function pickWeighted(arr, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < arr.length; i++) {
        r -= weights[i];
        if (r <= 0) return arr[i];
    }
    return arr[arr.length - 1];
}

function generatePlate() {
    const [stateCode, rtos] = pick(STATE_RTO);
    const rto = pick(rtos).padStart(2, '0');
    const s1 = pick(SERIES_LETTERS);
    const s2 = pick(SERIES_LETTERS);
    const num = String(rand(1000, 9999));
    return `${stateCode}${rto}${s1}${s2}${num}`;
}

function generatePhone() {
    const prefix = pick(['7', '8', '9']);
    const rest = Array.from({ length: 9 }, () => rand(0, 9)).join('');
    return prefix + rest;
}

function generateAadhaar() {
    // Realistic format but completely fictional
    return Array.from({ length: 12 }, () => rand(0, 9)).join('');
}

function generateVehicleEntry(usedPlates) {
    let plate;
    let attempts = 0;
    do {
        plate = generatePlate();
        attempts++;
        if (attempts > 100) throw new Error('Could not generate unique plate');
    } while (usedPlates.has(plate));
    usedPlates.add(plate);

    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);

    // Weight: mostly 4-wheelers and 2-wheelers
    const vehicleGroup = pickWeighted(VEHICLES, [30, 45, 12, 6, 7]);
    const model = pick(vehicleGroup.models);

    const year = rand(2005, 2024);

    // ~8% stolen, ~5% suspected, never both
    const roll = Math.random();
    const isStolen = roll < 0.08;
    const isSuspected = !isStolen && roll < 0.13;

    return {
        plateNumber: plate,
        ownerName: `${firstName} ${lastName}`,
        ownerPhone: generatePhone(),
        ownerAadhaar: generateAadhaar(),
        vehicleType: vehicleGroup.type,
        model,
        color: pick(COLORS),
        registrationYear: year,
        isStolen,
        isSuspected,
        stolenReportId: null,
    };
}

// ---------------------------------------------------------------------------
async function seed() {
    console.log('🔄 Connecting to MongoDB…');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to:', MONGO_URI);

    const existing = await Vehicle.countDocuments();
    console.log(`ℹ️  Existing vehicle records: ${existing}`);

    // Build records — skip any plate that already exists in DB
    const existingPlates = new Set(
        (await Vehicle.find({}, 'plateNumber').lean()).map(v => v.plateNumber)
    );

    const TARGET = 250;
    const toInsert = [];
    const usedPlates = new Set(existingPlates);

    while (toInsert.length < TARGET) {
        try {
            toInsert.push(generateVehicleEntry(usedPlates));
        } catch (e) {
            console.error('Plate generation error:', e.message);
            break;
        }
    }

    if (toInsert.length === 0) {
        console.log('⚠️  No new records to insert (all duplicates or limit reached).');
        await mongoose.disconnect();
        return;
    }

    console.log(`📦 Inserting ${toInsert.length} synthetic vehicle records…`);
    const result = await Vehicle.insertMany(toInsert, { ordered: false });
    console.log(`✅ Inserted: ${result.length} records`);

    // Summary stats
    const stolen = toInsert.filter(v => v.isStolen).length;
    const suspected = toInsert.filter(v => v.isSuspected).length;
    const byType = {};
    toInsert.forEach(v => { byType[v.vehicleType] = (byType[v.vehicleType] || 0) + 1; });

    console.log('\n📊 Summary:');
    console.log(`   🚨 Stolen    : ${stolen}`);
    console.log(`   🔶 Suspected : ${suspected}`);
    console.log('   By type:');
    Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => {
        console.log(`     ${t.padEnd(15)}: ${c}`);
    });

    const total = await Vehicle.countDocuments();
    console.log(`\n✅ Total vehicles in DB: ${total}`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected. Done!');
}

seed().catch(err => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
});
