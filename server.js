const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI).then(() => console.log("Enterprise DB Connected"));

// --- SCHEMAS ---
const UserSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    password: String,
    deviceId: { type: String, unique: true },
    balance: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lastCheckIn: Date,
    referralCode: { type: String, unique: true },
    isBlocked: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const Task = mongoose.model('Task', new mongoose.Schema({
    category: { type: String, enum: ['CPA', 'VIDEO'] },
    title: String, desc: String, link: String, reward: Number, timer: Number
}));

const Withdraw = mongoose.model('Withdraw', new mongoose.Schema({
    userId: String, email: String, amount: Number, upiId: String,
    status: { type: String, default: 'Pending' }, txnId: String, date: { type: Date, default: Date.now }
}));

const Settings = mongoose.model('Settings', new mongoose.Schema({
    checkInRewards: { type: Array, default: [1, 2, 5, 10, 15, 20, 50] },
    minWithdraw: { type: Number, default: 100 }
}));

// --- AUTH APIs ---
app.post('/api/auth/signup', async (req, res) => {
    const { email, password, deviceId } = req.body;
    const exists = await User.findOne({ $or: [{ email }, { deviceId }] });
    if (exists) return res.status(400).json({ msg: "Email or Device already registered!" });
    const hashed = await bcrypt.hash(password, 10);
    const code = "REF" + Math.floor(1000 + Math.random() * 9000);
    const user = new User({ email, password: hashed, deviceId, referralCode: code });
    await user.save();
    res.json({ msg: "Success" });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) return res.status(400).json({ msg: "Invalid Login" });
    const token = jwt.sign({ id: user._id }, "SECRET_KEY");
    res.json({ token, userId: user._id });
});

// --- ADMIN STATS ---
app.get('/api/admin/stats', async (req, res) => {
    const totalUsers = await User.countDocuments();
    const activeToday = await User.countDocuments({ lastCheckIn: { $gte: new Date().setHours(0,0,0,0) } });
    const pendingW = await Withdraw.find({ status: 'Pending' });
    const settings = await Settings.findOne();
    const tasks = await Task.find();
    res.json({ totalUsers, activeToday, pendingW, settings, tasks });
});

app.listen(process.env.PORT || 5000);
