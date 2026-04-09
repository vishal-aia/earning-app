const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // Ye line zaruri hai
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Database Connected"))
  .catch(err => console.log("DB Error:", err));

// --- Database Models ---
const User = mongoose.model('User', new mongoose.Schema({
    email: { type: String, unique: true },
    balance: { type: Number, default: 0 },
    deviceId: String
}));

const Settings = mongoose.model('Settings', new mongoose.Schema({
    checkInReward: { type: Number, default: 1 },
    adLink: { type: String, default: "" },
    minWithdraw: { type: Number, default: 100 }
}));

// --- APIs ---

app.get('/api/settings', async (req, res) => {
    const settings = await Settings.findOne();
    res.json(settings || { checkInReward: 1, adLink: "", minWithdraw: 100 });
});

app.post('/api/admin/update', async (req, res) => {
    const { checkInReward, adLink, minWithdraw } = req.body;
    await Settings.findOneAndUpdate({}, { checkInReward, adLink, minWithdraw }, { upsert: true });
    res.json({ success: true });
});

// --- FRONTEND CONNECTION (Ye "Cannot GET /" error theek karega) ---

// 1. Sabhi files ko access karne ki ijazat dein
app.use(express.static(path.join(__dirname, '.')));

// 2. Home page dikhane ke liye
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 3. Admin panel dikhane ke liye (Apni file ka asli naam yahan likhein)
app.get('/admin-panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'v-master-786-private-access.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
