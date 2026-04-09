const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Database Connected Successfully"))
  .catch(err => console.log("DB Error:", err));

// --- Database Table (User) ---
const User = mongoose.model('User', new mongoose.Schema({
    email: { type: String, unique: true },
    password: String,
    balance: { type: Number, default: 0 },
    deviceId: { type: String, unique: true }, // Ek phone ek account
    isBlocked: { type: Boolean, default: false }
}));

// --- Database Table (Settings) ---
const Settings = mongoose.model('Settings', new mongoose.Schema({
    checkInReward: Number,
    spinReward: Number,
    minWithdraw: Number,
    adLink: String
}));

// --- API: Get Settings (User panel ko data dikhane ke liye) ---
app.get('/api/settings', async (req, res) => {
    const settings = await Settings.findOne();
    res.json(settings || { checkInReward: 1, spinReward: 0.5, minWithdraw: 100 });
});

// --- API: Admin Update Settings (Paisa change karne ke liye) ---
app.post('/api/admin/update', async (req, res) => {
    const { checkInReward, spinReward, minWithdraw, adLink } = req.body;
    await Settings.findOneAndUpdate({}, { checkInReward, spinReward, minWithdraw, adLink }, { upsert: true });
    res.json({ success: true, message: "Settings Updated!" });
});

// --- API: Claim Reward (Security: Yahan se profit pakka hoga) ---
app.post('/api/earn/checkin', async (req, res) => {
    const { userId } = req.body;
    const settings = await Settings.findOne();
    const user = await User.findById(userId);
    
    if(!user.isBlocked) {
        user.balance += settings.checkInReward;
        await user.save();
        res.json({ newBalance: user.balance });
    } else {
        res.status(403).json({ msg: "Account Blocked" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
