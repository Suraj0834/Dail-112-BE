// =============================================================================
// backend/src/routes/portal/portal.dashboard.js
// Dashboard aggregation endpoints – stats, trends, distribution, breakdowns
// =============================================================================

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Case = mongoose.model('Case');
const SosLog = mongoose.model('SosLog');
const User = mongoose.model('User');
const Criminal = mongoose.model('Criminal');

// ── Time-range helpers ─────────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getRangeSince(range) {
    const now = new Date();
    switch (range) {
        case 'weeks': {
            const d = new Date(now);
            d.setDate(d.getDate() - 11 * 7); // last 12 weeks
            return d;
        }
        case 'years': {
            return new Date(now.getFullYear() - 4, 0, 1); // last 5 years
        }
        case 'lifetime':
            return new Date('2015-01-01');
        default: { // months – last 12 months
            const d = new Date(now);
            d.setMonth(d.getMonth() - 11);
            d.setDate(1);
            return d;
        }
    }
}

function buildGroupId(range, dateField) {
    if (range === 'weeks')
        return { year: { $isoWeekYear: `$${dateField}` }, week: { $isoWeek: `$${dateField}` } };
    if (range === 'years' || range === 'lifetime')
        return { year: { $year: `$${dateField}` } };
    return { year: { $year: `$${dateField}` }, month: { $month: `$${dateField}` } };
}

function buildSortOrder(range) {
    if (range === 'weeks')    return { '_id.year': 1, '_id.week': 1 };
    if (range === 'years' || range === 'lifetime') return { '_id.year': 1 };
    return { '_id.year': 1, '_id.month': 1 };
}

function toKey(id, range) {
    if (range === 'weeks')    return `${id.year}-W${String(id.week).padStart(2, '0')}`;
    if (range === 'years' || range === 'lifetime') return `${id.year}`;
    return `${id.year}-${String(id.month).padStart(2, '0')}`;
}

function toLabel(id, range) {
    if (range === 'weeks')    return `W${id.week}`;
    if (range === 'years' || range === 'lifetime') return `${id.year}`;
    return MONTHS[id.month - 1];
}

// ---------------------------------------------------------------------------
// GET /portal/dashboard/stats
// Returns high-level control-room KPIs in one query
// ---------------------------------------------------------------------------
router.get('/stats', async (req, res) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
        totalCases,
        activeCases,
        sosToday,
        policeOnDuty,
        totalPolice,
        totalCriminals,
        casesThisMonth,

        resolvedThisMonth,
    ] = await Promise.all([
        Case.countDocuments(),
        Case.countDocuments({ status: { $in: ['PENDING', 'INVESTIGATING'] } }),
        SosLog.countDocuments({ createdAt: { $gte: today } }),
        User.countDocuments({ role: 'police', isOnDuty: true, isActive: true }),
        User.countDocuments({ role: 'police', isActive: true }),
        Criminal.countDocuments(),
        Case.countDocuments({ createdAt: { $gte: monthStart } }),
        Case.countDocuments({ status: { $in: ['RESOLVED', 'CLOSED'] }, updatedAt: { $gte: monthStart } }),
    ]);

    res.json({
        success: true,
        data: {
            totalCases,
            activeCases,
            sosToday,
            policeOnDuty,
            totalPolice,
            totalCriminals,
            casesThisMonth,
            resolvedThisMonth,
        },
    });
});

// ---------------------------------------------------------------------------
// GET /portal/dashboard/trends?range=weeks|months|years|lifetime
// Returns case filings vs resolutions over the selected period
// ---------------------------------------------------------------------------
router.get('/trends', async (req, res) => {
    const range = req.query.range || 'months';
    const since = getRangeSince(range);
    const sortOrder = buildSortOrder(range);

    const [filed, resolved] = await Promise.all([
        Case.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: buildGroupId(range, 'createdAt'), count: { $sum: 1 } } },
            { $sort: sortOrder },
        ]),
        Case.aggregate([
            { $match: { status: { $in: ['RESOLVED', 'CLOSED'] }, updatedAt: { $gte: since } } },
            { $group: { _id: buildGroupId(range, 'updatedAt'), count: { $sum: 1 } } },
            { $sort: sortOrder },
        ]),
    ]);

    const map = {};
    filed.forEach(({ _id, count }) => {
        const key = toKey(_id, range);
        if (!map[key]) map[key] = { month: toLabel(_id, range), cases: 0, resolved: 0 };
        map[key].cases = count;
    });
    resolved.forEach(({ _id, count }) => {
        const key = toKey(_id, range);
        if (!map[key]) map[key] = { month: toLabel(_id, range), cases: 0, resolved: 0 };
        map[key].resolved = count;
    });

    const data = Object.keys(map).sort().map((k) => map[k]);
    res.json({ success: true, data });
});

// ---------------------------------------------------------------------------
// GET /portal/dashboard/crime-distribution?range=weeks|months|years|lifetime
// Crime type breakdown for the selected period
// ---------------------------------------------------------------------------
router.get('/crime-distribution', async (req, res) => {
    const range = req.query.range || 'months';
    const since = getRangeSince(range);

    const result = await Case.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, type: '$_id', count: 1 } },
    ]);

    res.json({ success: true, data: result });
});

// ---------------------------------------------------------------------------
// GET /portal/dashboard/status-breakdown?range=weeks|months|years|lifetime
// Case status distribution for the selected period
// ---------------------------------------------------------------------------
router.get('/status-breakdown', async (req, res) => {
    const range = req.query.range || 'months';
    const since = getRangeSince(range);

    const result = await Case.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, status: '$_id', count: 1 } },
    ]);

    res.json({ success: true, data: result });
});

// ---------------------------------------------------------------------------
// GET /portal/dashboard/day-breakdown?range=weeks|months|years|lifetime
// Crime reports by day of week for pattern analysis (1=Sun … 7=Sat)
// ---------------------------------------------------------------------------
router.get('/day-breakdown', async (req, res) => {
    const range = req.query.range || 'months';
    const since = getRangeSince(range);

    const result = await Case.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dayOfWeek: '$createdAt' }, count: { $sum: 1 } } },
        { $sort: { '_id': 1 } },
    ]);

    const dayMap = {};
    result.forEach(({ _id, count }) => { dayMap[_id] = count; });

    const data = DAYS.map((day, i) => ({ day, incidents: dayMap[i + 1] || 0 }));
    res.json({ success: true, data });
});

module.exports = router;
