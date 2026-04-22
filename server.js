const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Firebase Admin Setup (Use Service Account Key)
// Vercel Environment Variables mein ye data daalna hoga
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// API: Secure Withdrawal Logic
app.post('/api/withdraw', async (req, res) => {
    const { userId, amount, upiId, method } = req.json();

    try {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();

        // 1. Anti-Fraud: Minimum ₹100 check
        if (userData.balance < 100 || amount < 100) {
            return res.status(400).json({ error: "Minimum withdrawal is ₹100" });
        }

        // 2. Anti-Fraud: Multi-account detection (Basic)
        // Admin will manually verify before 'PAID' status

        await db.collection('withdrawals').add({
            userId,
            userName: userData.name,
            amount: parseFloat(amount),
            upiId,
            method,
            status: 'pending',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: "Withdrawal request submitted successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Server error, try again later." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
