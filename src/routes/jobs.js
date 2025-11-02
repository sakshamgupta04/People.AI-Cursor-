import express from 'express';
import { getJobs } from '../controllers/jobController.js';

const router = express.Router();

// GET /api/jobs - Get all jobs
router.get('/', getJobs);

export default router;

