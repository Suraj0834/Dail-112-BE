// =============================================================================
// scripts/seed_criminals.js  — seed 200 synthetic Indian criminal records
// Run: node scripts/seed_criminals.js   (from the backend/ folder)
// =============================================================================
'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

require('../src/models/Criminal.model');
const Criminal = mongoose.model('Criminal');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dial112';

// ── Name pools ──────────────────────────────────────────────────────────────
const MALE_FIRST = [
    'Rajan','Suresh','Deepak','Vinod','Mahesh','Rakesh','Ajay','Sanjay','Pankaj','Naveen',
    'Rohit','Amit','Vikas','Sachin','Nitin','Bunty','Pappu','Kalu','Bablu','Tinku',
    'Shankar','Dinesh','Arun','Mohan','Ramesh','Yogesh','Rajesh','Girish','Naresh','Jagdish',
    'Aziz','Salim','Javed','Karim','Rashid','Farooq','Iqbal','Zafar','Aslam','Munna',
    'Harpreet','Gurjit','Balwinder','Jasvinder','Kulwinder','Paramjit','Manjit','Satnam','Daljit','Ravinder',
    'Arjun','Ravi','Surya','Kiran','Chandan','Vishal','Akash','Ankit','Tushar','Gaurav',
    'Mukesh','Sunil','Satish','Umesh','Lokesh','Brijesh','Mahendra','Devendra','Virendra','Narendra',
    'Chhotu','Lalla','Badshah','Tiger','Rinku','Bittu','Lucky','Goldy','Sunny','Monu',
];

const FEMALE_FIRST = [
    'Sunita','Rekha','Geeta','Shanti','Rani','Meena','Pooja','Kavita','Seema','Nisha',
    'Anita','Savita','Usha','Kusum','Malti','Suman','Kiran','Poonam','Madhu','Renu',
    'Shabnam','Nazneen','Rukhsar','Afsana','Reshma','Yasmin','Farzana','Saleha','Nagma','Zarina',
    'Gurpreet','Manpreet','Harjeet','Sukhwinder','Rajwinder','Amarjit','Baljeet','Paramjeet','Simranjit','Navneet',
    'Asha','Laxmi','Durga','Kamla','Champa','Phoolmati','Saroja','Lalita','Pushpa','Mala',
];

const LAST_NAMES = [
    'Sharma','Verma','Gupta','Singh','Kumar','Yadav','Mishra','Dubey','Tiwari','Pandey',
    'Chauhan','Thakur','Rajput','Nair','Menon','Pillai','Reddy','Rao','Patil','Jadhav',
    'Khan','Sheikh','Ansari','Qureshi','Siddiqui','Malik','Pathan','Mirza','Baig','Hussain',
    'Grewal','Dhaliwal','Sandhu','Brar','Sidhu','Gill','Mann','Bajwa','Cheema','Randhawa',
    'Joshi','Patel','Shah','Mehta','Desai','Trivedi','Bhatt','Parmar','Solanki','Chauhan',
    'Das','Dey','Banerjee','Chakraborty','Ghosh','Bose','Mukherjee','Sen','Roy','Biswas',
    'Don','Bhai','Giri','Prasad','Rawat','Bisht','Negi','Bhandari','Thapliyal','Semwal',
];

const AREAS = [
    'Shahdara, Delhi','Trilokpuri, Delhi','Mustafabad, Delhi','Seelampur, Delhi','Welcome Colony, Delhi',
    'Burari, Delhi','Mongolpuri, Delhi','Sultanpuri, Delhi','Nangloi, Delhi','Uttam Nagar, Delhi',
    'Govindpuri, Delhi','Sangam Vihar, Delhi','Badarpur, Delhi','Okhla, Delhi','Jamia Nagar, Delhi',
    'Paharganj, Delhi','Karol Bagh, Delhi','Sadar Bazar, Delhi','Azad Market, Delhi','Rani Bagh, Delhi',
    'Jahangirpuri, Delhi','Bhalswa Colony, Delhi','Libaspur, Delhi','Samaypur Badli, Delhi','Mukherjee Nagar, Delhi',
    'Laxmi Nagar, Delhi','Geeta Colony, Delhi','Krishna Nagar, Delhi','Preet Vihar, Delhi','Vivek Vihar, Delhi',
    'Wazirabad, Delhi','Bawana, Delhi','Narela, Delhi','Alipur, Delhi','Kanjhawala, Delhi',
    'Rohini Sec-3, Delhi','Rohini Sec-7, Delhi','Pitampura, Delhi','Shalimar Bagh, Delhi','Ashok Vihar, Delhi',
    'Dwarka Sec-6, Delhi','Dwarka Sec-10, Delhi','Bindapur, Delhi','Uttam Nagar West, Delhi','Janakpuri, Delhi',
    'Saket, Delhi','Malviya Nagar, Delhi','Hauz Khas, Delhi','Munirka, Delhi','RK Puram, Delhi',
    'Noida Sec-58, UP','Noida Sec-63, UP','Noida Sec-20, UP','Greater Noida, UP','Ghaziabad, UP',
    'Faridabad, Haryana','Gurugram, Haryana','Ballabhgarh, Haryana','Palwal, Haryana','Rewari, Haryana',
];

const OFFENSES = [
    'Robbery under IPC 392','Chain snatching','Mobile theft','Burglary','Auto-lift',
    'Car theft','House theft','Pickpocketing','Dacoity (IPC 395)','Armed robbery',
    'Drug peddling (NDPS Act)','Drug trafficking','Narcotics supply','Ganja peddling','Smack distribution',
    'Murder (IPC 302)','Attempt to murder','Culpable homicide','Kidnapping','Abduction',
    'Extortion','Land grabbing','Gangsterism','Criminal intimidation','Illegal arms possession',
    'Cybercrime – OTP fraud','Cybercrime – ATM cloning','Online cheating','UPI fraud','Identity theft',
    'Eve teasing','Molestation','Domestic violence','Acid attack','Human trafficking',
    'Forgery','Document fraud','Impersonation','Counterfeit currency','Cheque bouncing fraud',
    'Hit and run','Drunk driving','Vehicle theft (commercial)','Rash driving causing death','Road rage assault',
    'Gambling den operator','Betting racket','Illegal liquor trade','Bootlegging','Cow smuggling',
    'Rioting (IPC 147)','Unlawful assembly','Stone pelting','Arson','Bomb threat',
    'Bail jumping','Absconding accused','Violation of parole','Repeat offender – theft','Habitual offender',
];

const DESCRIPTIONS = [
    'Known gang member active in organised theft rings. Operates in disguise.',
    'Repeat offender with prior convictions. Known to change locations frequently.',
    'Active drug network participant. Known associates in Noida and Faridabad.',
    'Targets elderly victims near ATM locations. Uses distraction technique.',
    'Violent criminal history. Has been arrested multiple times. Out on bail.',
    'Involved in international human trafficking network. Under surveillance.',
    'Con artist specialising in impersonation of govt officials.',
    'Known to operate under multiple aliases. Facial recognition flagged.',
    'Uses burner phones. Suspected ringleader of a local extortion gang.',
    'Suspect in 3 unsolved robbery cases. Identifies victim vehicles on NH.',
    'Cyber fraudster linked to multiple UPI scam complaints across 4 states.',
    'Gangster with political connections. Multiple FIRs – all discharged.',
    'Operates mobile theft ring near metro stations. Known associates arrested.',
    'Escaping custody twice. Dangerous – approach with caution.',
    'Involved in counterfeit currency circulation. Links to cross-border network.',
    'Land mafia operative. Uses legal threats combined with physical intimidation.',
    'History of domestic violence. Multiple protection orders violated.',
    'Drug supplier – last seen near highway truck stops.',
    'Professional car thief. Replaces VIN plates within hours of theft.',
    'Serial pickpocket operating in crowded markets and religious gatherings.',
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const weightedDanger = () => {
    const r = Math.random();
    if (r < 0.20) return 'CRITICAL';
    if (r < 0.45) return 'HIGH';
    if (r < 0.75) return 'MEDIUM';
    return 'LOW';
};

function buildCriminal(i) {
    const isMale   = Math.random() > 0.18;
    const firstName = pick(isMale ? MALE_FIRST : FEMALE_FIRST);
    const lastName  = pick(LAST_NAMES);
    const numOffenses = rand(1, 5);
    const offenses = [];
    for (let j = 0; j < numOffenses; j++) {
        const daysAgo = rand(30, 2000);
        const date = new Date(Date.now() - daysAgo * 86400000);
        offenses.push({
            offense: pick(OFFENSES),
            date,
            status: pick(['CONVICTED', 'BAIL', 'ABSCONDING', 'ACQUITTED', 'UNDER_TRIAL']),
        });
    }
    const danger        = weightedDanger();
    const warrantStatus = danger === 'CRITICAL' ? Math.random() > 0.3
                        : danger === 'HIGH'     ? Math.random() > 0.5
                        : Math.random() > 0.85;

    return {
        name:             `${firstName} ${lastName}`,
        age:              rand(18, 62),
        gender:           isMale ? 'Male' : 'Female',
        lastKnownAddress: pick(AREAS),
        dangerLevel:      danger,
        warrantStatus,
        isActive:         Math.random() > 0.15,
        description:      pick(DESCRIPTIONS),
        crimeHistory:     offenses,
    };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    console.log('Connecting to MongoDB…');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.\n');

    const existing = await Criminal.countDocuments();
    console.log(`Existing records: ${existing}`);

    const RECORDS = 200;
    const criminals = Array.from({ length: RECORDS }, (_, i) => buildCriminal(i));

    console.log(`Inserting ${RECORDS} criminal records…`);
    const result = await Criminal.insertMany(criminals, { ordered: false });
    console.log(`✓ Inserted: ${result.length}`);

    // Summary stats
    const total    = await Criminal.countDocuments();
    const critical = await Criminal.countDocuments({ dangerLevel: 'CRITICAL' });
    const high     = await Criminal.countDocuments({ dangerLevel: 'HIGH' });
    const medium   = await Criminal.countDocuments({ dangerLevel: 'MEDIUM' });
    const low      = await Criminal.countDocuments({ dangerLevel: 'LOW' });
    const warrant  = await Criminal.countDocuments({ warrantStatus: true });

    console.log('\n── Database summary ──────────────────────────');
    console.log(`Total criminals : ${total}`);
    console.log(`CRITICAL        : ${critical}`);
    console.log(`HIGH            : ${high}`);
    console.log(`MEDIUM          : ${medium}`);
    console.log(`LOW             : ${low}`);
    console.log(`Active warrants : ${warrant}`);
    console.log('──────────────────────────────────────────────');

    await mongoose.disconnect();
    console.log('\nDone.');
}

main().catch((err) => { console.error(err); process.exit(1); });
