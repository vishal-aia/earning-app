const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI).then(() => console.log("Enterprise System Live"));

// --- DATABASE MODELS ---
const Settings = mongoose.model('Settings', new mongoose.Schema({
    checkInReward: { type: Array, default: [1, 1, 2, 2, 3, 3, 5] },
    smartlinkReward: { type: Number, default: 0.5 },
    minWithdraw: { type: Number, default: 100 },
    adLink: { type: String, default: "https://google.com" },
    taskTimer: { type: Number, default: 30 },
    referralBonus: { type: Number, default: 5 }
}));

const User = mongoose.model('User', new mongoose.Schema({
    email: { type: String, unique: true },
    password: { type: String },
    deviceId: { type: String, unique: true },
    balance: { type: Number, default: 0 },
    refBy: String,
    referralCode: { type: String, unique: true },
    isBlocked: { type: Boolean, default: false },
    lastTaskAt: Date
}));

const Withdraw = mongoose.model('Withdraw', new mongoose.Schema({
    userId: String, email: String, amount: Number, method: String,
    status: { type: String, default: 'Pending' }, txnId: String, date: { type: Date, default: Date.now }
}));

// --- AUTH APIs ---
app.post('/api/auth/signup', async (req, res) => {
    const { email, password, deviceId, refCode } = req.body;
    const exists = await User.findOne({ $or: [{ email }, { deviceId }] });
    if (exists) return res.status(400).json({ msg: "Email or Device already registered!" });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const myRefCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const user = new User({ email, password: hashedPassword, deviceId, referralCode: myRefCode, refBy: refCode });
    await user.save();
    res.json({ userId: user._id, msg: "Signup Success!" });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) return res.status(400).json({ msg: "Invalid Login!" });
    res.json({ userId: user._id, balance: user.balance });
});

// --- ADMIN APIs ---
app.post('/api/admin/update-settings', async (req, res) => {
    await Settings.findOneAndUpdate({}, req.body, { upsert: true });
    res.json({ success: true });
});

app.get('/api/admin/all-withdraws', async (req, res) => {
    const list = await Withdraw.find().sort({ date: -1 });
    res.json(list);
});

app.post('/api/admin/approve-withdraw', async (req, res) => {
    const { id, txnId, status } = req.body;
    await Withdraw.findByIdAndUpdate(id, { txnId, status });
    res.json({ success: true });
});

app.listen(process.env.PORT || 5000);
