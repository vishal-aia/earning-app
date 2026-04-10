const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI).then(() => console.log("Pro DB Connected"));

// --- Database Schema ---
const UserSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    balance: { type: Number, default: 0 },
    deviceId: { type: String, unique: true },
    lastCheckIn: Date,
    checkInStreak: { type: Number, default: 0 },
    lastTaskTime: Date,
    isBlocked: { type: Boolean, default: false }
});
const User = mongoose.model('User', UserSchema);

const SettingsSchema = new mongoose.Schema({
    checkInRewards: { type: Array, default: [1, 2, 3, 4, 5, 6, 10] }, // 7 days
    spinProbabilities: { type: Array, default: [0.1, 0.5, 0, 1, 0, 0.2] },
    taskTimer: { type: Number, default: 30 }, // Seconds
    minWithdraw: { type: Number, default: 100 },
    adLink: String
});
const Settings = mongoose.model('Settings', SettingsSchema);

// --- APIs ---

// 1. Daily Check-in Logic (7-Day Reset)
app.post('/api/earn/checkin', async (req, res) => {
    const { userId } = req.body;
    const user = await User.findById(userId);
    const settings = await Settings.findOne();
    
    const now = new Date();
    if (user.lastCheckIn && user.lastCheckIn.toDateString() === now.toDateString()) {
        return res.status(400).json({ msg: "Aaj ka reward le liya hai!" });
    }

    let day = user.checkInStreak % 7;
    let reward = settings.checkInRewards[day];
    
    user.balance += reward;
    user.checkInStreak += 1;
    user.lastCheckIn = now;
    await user.save();
    
    res.json({ msg: `Day ${day+1} Reward Recieved: ₹${reward}`, balance: user.balance });
});

// 2. Task Validation (Timer System)
app.post('/api/earn/start-task', async (req, res) => {
    const { userId } = req.body;
    const user = await User.findById(userId);
    user.lastTaskTime = new Date();
    await user.save();
    res.json({ msg: "Task Started" });
});

app.post('/api/earn/claim-task', async (req, res) => {
    const { userId } = req.body;
    const user = await User.findById(userId);
    const settings = await Settings.findOne();

    const timePassed = (new Date() - user.lastTaskTime) / 1000;
    if (timePassed < settings.taskTimer) {
        return res.status(400).json({ msg: "Cheat mat karo! Ad poora dekho." });
    }

    user.balance += 0.5; // Example reward
    await user.save();
    res.json({ msg: "₹0.50 Added!", balance: user.balance });
});

app.listen(process.env.PORT || 5000);
