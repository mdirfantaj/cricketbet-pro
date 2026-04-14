const express = require('express');
const { body } = require('express-validator');
const { authMiddleware, roleMiddleware, validateRequest } = require('../middleware/auth');
const User = require('../models/User');
const Match = require('../models/Match');
const Bet = require('../models/Bet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Auth Routes
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
], validateRequest([
    body('email'),
    body('password')
]), async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await db.getUserByEmail(email);

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remove password from response
        const { password: _, ...userResponse } = user;

        res.json({
            token,
            user: userResponse
        });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Public Routes
router.get('/matches', authMiddleware, async (req, res) => {
    try {
        const matches = await db.getMatches();
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load matches' });
    }
});

// Protected Routes
router.post('/bet', authMiddleware, [
    body('matchId').isString().notEmpty(),
    body('amount').isFloat({ min: 10, max: 100000 }),
    body('odds').isFloat({ min: 1.01 })
], validateRequest([
    body('matchId'),
    body('amount'),
    body('odds')
]), async (req, res) => {
    try {
        const { matchId, amount, odds } = req.body;
        const userId = req.user.id;
        const parsedAmount = parseFloat(amount);

        // Validate match exists
        const match = (await db.getMatches()).find(m => m.id === matchId);
        if (!match) {
            return res.status(400).json({ error: 'Match not found' });
        }

        // Validate odds match current odds (prevent manipulation)
        if (Math.abs(match.odds.back - odds) > 0.01) {
            return res.status(400).json({ error: 'Invalid odds' });
        }

        // Check balance (double-check server-side)
        if (req.user.balance < parsedAmount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Atomic transaction: deduct balance + create bet
        const balanceUpdated = await db.updateUserBalance(userId, parsedAmount, 'deduct');
        if (!balanceUpdated) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        const bet = await db.createBet({
            userId,
            matchId,
            amount: parsedAmount,
            odds,
            potentialPayout: parsedAmount * odds
        });

        await db.createTransaction(userId, -parsedAmount, 'bet', bet.id);

        res.json({ success: true, bet });
    } catch (error) {
        res.status(500).json({ error: 'Bet placement failed' });
    }
});

// Admin Routes
router.post('/odds', authMiddleware, roleMiddleware(['admin']), [
    body('matchId').isString().notEmpty(),
    body('back').isFloat({ min: 1.01 }),
    body('lay').isFloat({ min: 1.01 })
], validateRequest([
    body('matchId'),
    body('back'),
    body('lay')
]), async (req, res) => {
    try {
        const { matchId, back, lay } = req.body;
        
        const updated = await db.updateMatchOdds(matchId, { back: parseFloat(back), lay: parseFloat(lay) });
        if (!updated) {
            return res.status(404).json({ error: 'Match not found' });
        }

        res.json({ success: true, message: 'Odds updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Odds update failed' });
    }
});

// User Bets History
router.get('/bets', authMiddleware, async (req, res) => {
    try {
        const bets = await db.getUserBets(req.user.id);
        res.json(bets);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load bets' });
    }
});

// Admin: Add Balance (Credit User)
router.post('/admin/credit', authMiddleware, roleMiddleware(['admin']), [
    body('userId').isString().notEmpty(),
    body('amount').isFloat({ min: 1, max: 1000000 })
], validateRequest([
    body('userId'),
    body('amount')
]), async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const parsedAmount = parseFloat(amount);

        const updated = await db.updateUserBalance(userId, parsedAmount, 'credit');
        if (!updated) {
            return res.status(404).json({ error: 'User not found' });
        }

        await db.createTransaction(userId, parsedAmount, 'credit', `admin-credit-${uuidv4()}`);
        res.json({ success: true, message: `Credited ₹${parsedAmount}` });
    } catch (error) {
        res.status(500).json({ error: 'Credit failed' });
    }
});

// Withdrawal System
router.post('/withdraw', authMiddleware, [
    body('amount').isFloat({ min: 100, max: 100000 })
], validateRequest([
    body('amount')
]), async (req, res) => {
    try {
        const { amount } = req.body;
        const parsedAmount = parseFloat(amount);
        const userId = req.user.id;

        if (req.user.balance < parsedAmount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        const withdrawal = await db.createWithdrawal(userId, parsedAmount);
        res.json({ success: true, withdrawalId: withdrawal.id });
    } catch (error) {
        res.status(500).json({ error: 'Withdrawal request failed' });
    }
});

// Admin: Withdrawal Management
router.get('/admin/withdrawals', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const withdrawals = await db.getWithdrawals();
        res.json(withdrawals);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load withdrawals' });
    }
});

router.post('/admin/withdrawal/:id/approve', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await db.updateWithdrawal(id, 'approved');
        if (!updated) {
            return res.status(404).json({ error: 'Withdrawal not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Approval failed' });
    }
});

router.post('/admin/withdrawal/:id/reject', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await db.updateWithdrawal(id, 'rejected');
        if (!updated) {
            return res.status(404).json({ error: 'Withdrawal not found' });
        }
        // Refund balance on rejection
        const withdrawal = (await db.getWithdrawals()).find(w => w.id === id);
        if (withdrawal) {
            await db.updateUserBalance(withdrawal.userId, withdrawal.amount, 'credit');
        }
        res
