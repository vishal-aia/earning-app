const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI);

// --- MODELS ---
const User = mongoose.model('User', new mongoose.Schema({
    email: { type: String, unique: true },
    password: String,
    deviceId: { type: String, unique: true },
    balance: { type: Number, default: 0 },
    lastAdTaskAt: { type: Date, default: new Date(0) }, // Cooldown check
    isBlocked: { type: Boolean, default: false }
}));

const Task = mongoose.model('Task', new mongoose.Schema({
    type: { type: String, enum: ['AD', 'CPA'] }, // AD = Timer, CPA = Install
    title: String,
    reward: Number,
    link: String
}));

const Withdraw = mongoose.model('Withdraw', new mongoose.Schema({
    userId: String, email: String, amount: Number, upiId: String,
    status: { type: String, default: 'Pending' }, date: { type: Date, default: Date.now }
}));

// --- APIs ---

// Ad Task Claim (With 30s Cooldown)
app.post('/api/tasks/claim-ad', async (req, res) => {
    const { userId, taskId } = req.body;
    const user = await User.findById(userId);
    const task = await Task.findById(taskId);

    const now = new Date();
    const diff = (now - user.lastAdTaskAt) / 1000;

    if (diff < 30) return res.status(400).json({ msg: "Wait 30s for next ad!" });

    user.balance += task.reward;
    user.lastAdTaskAt = now;
    await user.save();
    res.json({ msg: "Reward Added!", balance: user.balance });
});

// CPA Task Claim (Direct)
app.post('/api/tasks/claim-cpa', async (req, res) => {
    const { userId, taskId } = req.body;
    const user = await User.findById(userId);
    const task = await Task.findById(taskId);
    
    user.balance += task.reward;
    await user.save();
    res.json({ msg: "CPA Reward Added!", balance: user.balance });
});

app.listen(process.env.PORT || 5000);
