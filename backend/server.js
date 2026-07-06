const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());

// Routes
app.use('/api/auth',         require('./routes/authRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/goals',        require('./routes/goalRoutes'));
app.use('/api/budgets',      require('./routes/budgetRoutes'));
app.use('/api/recurring',    require('./routes/recurringRoutes'));
app.use('/api/reports',      require('./routes/reportRoutes'));
app.use('/api/admin',        require('./routes/adminRoutes'));

app.get('/', (req, res) => res.json({ message: '✅ FinTrack API running!' }));

const connectDB = require('./config/db');
const { createTransactionsForRecurring } = require('./services/recurringService');

connectDB().then(async () => {
  try {
    await createTransactionsForRecurring();
    console.log('Recurring transactions synced on startup.');
  } catch (err) {
    console.error('Recurring sync failed:', err.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));