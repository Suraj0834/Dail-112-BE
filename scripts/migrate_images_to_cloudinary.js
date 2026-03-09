// =============================================================================
// scripts/migrate_images_to_cloudinary.js
// Uploads all local images to Cloudinary and updates MongoDB URLs
// Run once: node scripts/migrate_images_to_cloudinary.js
// =============================================================================

'use strict';

require('dotenv').config();
const fs        = require('fs');
const path      = require('path');
const mongoose  = require('mongoose');
const cloudinary = require('cloudinary').v2;

// ── Cloudinary config ─────────────────────────────────────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// ── MongoDB connection ────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI;
const UPLOADS_DIR = path.join(__dirname, '../uploads');

async function uploadToCloudinary(localPath, folder) {
    const result = await cloudinary.uploader.upload(localPath, {
        folder: `dial112/${folder}`,
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }]
    });
    return result.secure_url;
}

async function migrateCriminalPhotos(db) {
    const Criminal = db.collection('criminals');
    const criminals = await Criminal.find({ photo: { $regex: '^/uploads/' } }).toArray();

    console.log(`\n📁 Found ${criminals.length} criminals with local photo paths`);
    let success = 0, failed = 0;

    for (const criminal of criminals) {
        const localPath = path.join(UPLOADS_DIR, criminal.photo.replace('/uploads/', ''));

        if (!fs.existsSync(localPath)) {
            console.log(`  ⚠️  File not found, skipping: ${localPath}`);
            failed++;
            continue;
        }

        try {
            const cloudUrl = await uploadToCloudinary(localPath, 'criminals');
            await Criminal.updateOne(
                { _id: criminal._id },
                { $set: { photo: cloudUrl } }
            );
            console.log(`  ✅ ${criminal.name} → ${cloudUrl.slice(0, 60)}...`);
            success++;
        } catch (err) {
            console.log(`  ❌ ${criminal.name}: ${err.message}`);
            failed++;
        }
    }

    console.log(`\n  Criminals: ${success} uploaded, ${failed} failed`);
}

async function migrateProfilePhotos(db) {
    const User = db.collection('users');
    const users = await User.find({ profileImage: { $regex: '^/uploads/' } }).toArray();

    console.log(`\n👤 Found ${users.length} users with local profile photos`);
    let success = 0, failed = 0;

    for (const user of users) {
        const localPath = path.join(UPLOADS_DIR, user.profileImage.replace('/uploads/', ''));

        if (!fs.existsSync(localPath)) {
            console.log(`  ⚠️  File not found, skipping: ${localPath}`);
            failed++;
            continue;
        }

        try {
            const cloudUrl = await uploadToCloudinary(localPath, 'profiles');
            await User.updateOne(
                { _id: user._id },
                { $set: { profileImage: cloudUrl } }
            );
            console.log(`  ✅ ${user.name} → ${cloudUrl.slice(0, 60)}...`);
            success++;
        } catch (err) {
            console.log(`  ❌ ${user.name}: ${err.message}`);
            failed++;
        }
    }

    console.log(`\n  Users: ${success} uploaded, ${failed} failed`);
}

async function migrateCaseImages(db) {
    const Case = db.collection('cases');
    const cases = await Case.find({ imageUrl: { $regex: '^/uploads/' } }).toArray();

    console.log(`\n📋 Found ${cases.length} cases with local images`);
    let success = 0, failed = 0;

    for (const c of cases) {
        const localPath = path.join(UPLOADS_DIR, c.imageUrl.replace('/uploads/', ''));

        if (!fs.existsSync(localPath)) {
            console.log(`  ⚠️  File not found, skipping: ${localPath}`);
            failed++;
            continue;
        }

        try {
            const cloudUrl = await uploadToCloudinary(localPath, 'cases');
            await Case.updateOne(
                { _id: c._id },
                { $set: { imageUrl: cloudUrl } }
            );
            console.log(`  ✅ Case ${c._id} → ${cloudUrl.slice(0, 60)}...`);
            success++;
        } catch (err) {
            console.log(`  ❌ Case ${c._id}: ${err.message}`);
            failed++;
        }
    }

    console.log(`\n  Cases: ${success} uploaded, ${failed} failed`);
}

async function main() {
    console.log('🚀 Starting Cloudinary image migration...');
    console.log(`   Cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    console.log(`   DB:    ${MONGO_URI.replace(/:([^@]+)@/, ':***@')}\n`);

    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');

    const db = mongoose.connection.db;

    await migrateCriminalPhotos(db);
    await migrateProfilePhotos(db);
    await migrateCaseImages(db);

    console.log('\n🎉 Migration complete! All images are now on Cloudinary.');
    await mongoose.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error('💥 Migration failed:', err.message);
    process.exit(1);
});
