const express = require('express');
const { body } = require('express-validator');
const { authMiddleware, roleMiddleware, validateRequest } = require('../middleware/auth');

const User = require('../models/User');
const Match = require('../models/Match');
const Bet = require('../models/Bet');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const router = express.Router();


// =========================
// 🔥 LOGIN
// =========================
router.post('/login', [
    body('email').isEmail(),
    body('password').isLength({ min: 6 })
], validateRequest([
    body('email'),
    body('password')
]), async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: 'User not found' });

        const isMatch = bcrypt.compareSync(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        const { password: _, ...userData } = user._doc;

        res.json({ token, user: userData });

    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});


// =========================
// 🔥 GET MATCHES
// =========================
router.get('/matches', authMiddleware, async (req, res) => {
    try {
        const matches = await Match.find();
        res.json(matches);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load matches' });
    }
});


// =========================
// 🔥 PLACE BET (FIXED SAFE)
// =========================
router.post('/bet', authMiddleware, [
    body('matchId').notEmpty(),
    body('amount').isFloat({ min: 10 }),
    body('odds').isFloat({ min: 1.01 })
], validateRequest([
    body('matchId'),
    body('amount'),
    body('odds')
]), async (req, res) => {
    try {
        const { matchId, amount, odds, team } = req.body;
        const parsedAmount = Number(amount);

        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const match = await Match.findById(matchId);
        if (!match) return res.status(400).json({ error: 'Match not found' });

        if (!match.finalOdds?.back) {
            return res.status(400).json({ error: 'Odds not ready' });
        }

        if (user.balance < parsedAmount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Deduct balance safely
        await User.findByIdAndUpdate(user._id, {
            $inc: { balance: -parsedAmount }
        });

        const bet = await Bet.create({
            userId: user._id,
            matchId,
            amount: parsedAmount,
            odds,
            team,
            status: "active",
            payout: parsedAmount * odds
        });

        res.json({ success: true, bet });

    } catch (err) {
        res.status(500).json({ error: 'Bet failed' });
    }
});


// =========================
// 🔥 ODDS UPDATE (ADMIN FIXED)
// =========================
router.post('/odds', authMiddleware, roleMiddleware(['admin']), [
    body('matchId').notEmpty(),
    body('back').isFloat(),
    body('lay').isFloat()
], async (req, res) => {
    try {
        const { matchId, back, lay } = req.body;

        const match = await Match.findById(matchId);
        if (!match) return res.status(404).json({ error: 'Match not found' });

        const market = match.marketOdds || { back: 1.9, lay: 1.9 };

        match.manualOdds = { back, lay };

        match.finalOdds = {
            back: (market.back + back) / 2,
            lay: (market.lay + lay) / 2
        };

        await match.save();

        res.json({ success: true, message: 'Odds updated' });

    } catch (err) {
        res.status(500).json({ error: 'Odds update failed' });
    }
});


// =========================
// 🔥 USER BETS
// =========================
router.get('/bets', authMiddleware, async (req, res) => {
    try {
        const bets = await Bet.find({ userId: req.user.userId });
        res.json(bets);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load bets' });
    }
});


// =========================
// 🔥 ADMIN CREDIT (FIXED SAFE)
// =========================
router.post('/admin/credit', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const { userId, amount } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        await User.findByIdAndUpdate(userId, {
            $inc: { balance: Number(amount) }
        });

        res.json({ success: true, message: 'Balance credited' });

    } catch (err) {
        res.status(500).json({ error: 'Credit failed' });
    }
});


// =========================
// 🔥 RESULT SYSTEM (FINAL SAFE)
// =========================
router.post('/result', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const { matchId, winner } = req.body;

        const bets = await Bet.find({ matchId });

        if (!bets.length) {
            return res.json({ message: 'No bets found' });
        }

        for (let bet of bets) {
            const user = await User.findById(bet.userId);

            if (!user) continue;

            if (bet.team === winner) {
                bet.status = "win";

                const payout = bet.amount * bet.odds;

                await User.findByIdAndUpdate(user._id, {
                    $inc: { balance: payout }
                });

                bet.payout = payout;
            } else {
                bet.status = "loss";
                bet.payout = 0;
            }

            await bet.save();
        }

        await Match.findByIdAndUpdate(matchId, { winner });

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ error: 'Result failed' });
    }
});

module.exports = router;
