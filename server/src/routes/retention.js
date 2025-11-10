// Routes for retention analysis operations
import express from 'express';
import { backfillRetentionAnalysis } from '../scripts/backfillRetention.js';

const router = express.Router();

/**
 * POST /api/retention/backfill
 * Backfill retention analysis for all existing candidates with personality data
 */
router.post('/backfill', async (req, res) => {
    try {
        console.log('Retention backfill requested');
        const result = await backfillRetentionAnalysis();
        res.json({
            success: true,
            message: 'Retention analysis backfill completed',
            ...result
        });
    } catch (error) {
        console.error('Error in retention backfill:', error);
        res.status(500).json({
            success: false,
            error: 'Backfill failed',
            message: error.message
        });
    }
});

export default router;

