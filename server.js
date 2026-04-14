const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection (Use your MONGO_URI in Render Environment)
mongoose.connect(process.env.MONGO_URI).then(() => console.log("Earning Hub DB Connected"));

// --- MODELS ---
const User = mongoose.model('User', new mongoose.Schema({
    email: { type: String, unique: true },
    password: { type: String },
    deviceId: { type: String, unique: true },
    balance: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lastCheckIn: Date,
    lastWithdraw: Date,
    referralCode: String
}));

const Task = mongoose.model('Task', new mongoose.Schema({
    type: String, title: String, reward: Number, link: String, timer: Number
}));

const Withdraw = mongoose.model('Withdraw', new mongoose.Schema({
    userId: String, email: String, amount: Number, upiId: String,
    status: { type: String, default: 'Pending' }, txnId: String, date: { type: Date, default: Date.now }
}));

const Settings = mongoose.model('Settings', new mongoose.Schema({
    checkInRewards: { type: Array, default: [1, 2, 5, 10, 15, 20, 50] },
    minWithdraw: { type: Number, default: 100 }
}));

// --- APIs ---
app.post('/api/auth/signup', async (req, res) => {
    const { email, password, deviceId } = req.body;
    const exists = await User.findOne({ $or: [{ email }, { deviceId }] });
    if (exists) return res.status(400).json({ msg: "Email or Device already registered!" });
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashed, deviceId, referralCode: "EH"+Math.floor(1000+Math.random()*9000) });
    await user.save();
    res.json({ msg: "Registration Successful" });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) return res.status(400).json({ msg: "Invalid Login" });
    res.json({ userId: user._id });
});

app.get('/api/user/:id', async (req, res) => {
    const user = await User.findById(req.params.id);
    res.json(user);
});

app.get('/api/settings', async (req, res) => {
    const s = await Settings.findOne();
    const t = await Task.find();
    res.json({ settings: s, tasks: t });
});

app.get('/api/admin/stats', async (req, res) => {
    const u = await User.countDocuments();
    const w = await Withdraw.find({ status: 'Pending' });
    const s = await Settings.findOne();
    res.json({ totalUsers: u, pendingWithdraws: w, settings: s });
});

app.listen(process.env.PORT || 5000);
