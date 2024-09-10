import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import authMiddleware from '../../middlewares/auth.middleware.js';

const router = express.Router();

/** 아이템 구입 API */

export default router;