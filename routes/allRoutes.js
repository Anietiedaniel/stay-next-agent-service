import express from 'express';
import agentVerificationRoutes from './agentVerificationRoutes.js';
import propertyRoutes from './propertyRoutes.js';
import agentProfileRoutes from './agentProfileRoutes.js';

const router = express.Router();

/* ---------------------- 🧩 Combined Auth Routes ---------------------- */
router.use('/verification', agentVerificationRoutes);
router.use('/properties', propertyRoutes);
router.use('/profile', agentProfileRoutes);


export default router;
