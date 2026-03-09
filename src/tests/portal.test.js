// =============================================================================
// backend/src/tests/portal.test.js
// Basic endpoint tests for Web Portal routes
// =============================================================================

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User.model');

describe('Web Portal API Integration Tests', () => {
    let adminToken;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dial112_test');
        }

        try {
            await User.deleteMany({ email: 'admin_test@police.gov.in' });

            const admin = new User({
                name: 'Admin User',
                email: 'admin_test@police.gov.in',
                phone: '9999999999',
                password: 'password123',
                role: 'admin',
                isActive: true,
                station: 'HQ',
                rank: 'Admin',
                badgeId: 'ADM-001'
            });
            await admin.save();
        } catch (e) {
            console.error('Test user creation error:', e.message);
        }

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin_test@police.gov.in', password: 'password123' });

        adminToken = res.body.token;
    });

    afterAll(async () => {
        await User.deleteMany({ email: 'admin_test@police.gov.in' });
        await mongoose.connection.close();
    });

    describe('Portal Dashboard Stats', () => {
        it('Should block unauthorized requests (No token)', async () => {
            const res = await request(app).get('/api/portal/dashboard/stats');
            expect(res.status).toBe(401);
        });

        it('Should fetch dashboard stats with valid admin token', async () => {
            const res = await request(app)
                .get('/api/portal/dashboard/stats')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('totalCases');
            expect(res.body.data).toHaveProperty('activeCases');
        });
    });
});
