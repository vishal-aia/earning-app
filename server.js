const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI).then(() => console.log("Enterprise System Live"));

// --- SCHEMAS ---
const User = mongoose.model('User', new mongoose.Schema({
    email: { type: String, unique: true },
    password: { type: String },
    deviceId: { type: String, unique: true },
    balance: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lastCheckIn: Date,
    lastWithdrawDate: Date,
    isBlocked: { type: Boolean, default: false }
}));

const Task = mongoose.model('Task', new mongoose.Schema({
    type: String, // smartlink, shortener, cpa
    title: String,
    reward: Number,
    link: String,
    limit: { type: Number, default: 10 }
}));

const Withdraw = mongoose.model('Withdraw', new mongoose.Schema({
    userId: String, email: String, amount: Number, status: { type: String, default: 'Pending' },
    date: { type: Date, default: Date.now }, txnId: String
}));

const Settings = mongoose.model('Settings', new mongoose.Schema({
    checkInRewards: { type: Array, default: [1, 2, 3, 4, 5, 10, 20] },
    minWithdraw: { type: Number, default: 100 }
}));

// --- LOGIC APIs ---

// 1. Check-In (24h Limit + 7 Day Streak)
app.post('/api/earn/checkin', async (req, res) => {
    const { userId } = req.body;
    const user = await User.findById(userId);
    const set = await Settings.findOne();
    
    const now = new Date();
    if(user.lastCheckIn && (now - user.lastCheckIn) < 86400000) {
        return res.status(400).json({ msg: "24 ghante baad wapas aayein!" });
    }

    let currentStreak = user.streak >= 7 ? 0 : user.streak;
    const reward = set.checkInRewards[currentStreak];
    
    user.balance += reward;
    user.streak = currentStreak + 1;
    user.lastCheckIn = now;
    await user.save();
    res.json({ msg: `Mubarak! ₹${reward} mile`, balance: user.balance, streak: user.streak });
});

// 2. Withdrawal (Once per 24h)
app.post('/api/user/withdraw', async (req, res) => {
    const { userId, amount } = req.body;
    const user = await User.findById(userId);
    const now = new Date();

    if(user.lastWithdrawDate && (now - user.lastWithdrawDate) < 86400000) {
        return res.status(400).json({ msg: "Din mein sirf ek bar withdraw kar sakte hain." });
    }
    if(user.balance < amount) return res.status(400).json({ msg: "Balance kam hai!" });

    const w = new Withdraw({ userId, email: user.email, amount });
    user.balance -= amount;
    user.lastWithdrawDate = now;
    await w.save();
    await user.save();
    res.json({ msg: "Request bheji gayi!" });
});

app.listen(process.env.PORT || 5000);
