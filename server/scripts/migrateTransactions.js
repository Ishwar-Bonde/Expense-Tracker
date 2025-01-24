import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import { convertCurrency } from '../utils/currencyConverter.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-tracker';

const migrateTransactions = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const transactions = await Transaction.find({});
        console.log(`Found ${transactions.length} transactions to migrate`);

        for (const transaction of transactions) {
            // Skip if already migrated
            if (transaction.amount && typeof transaction.amount === 'object') {
                console.log(`Skipping already migrated transaction: ${transaction._id}`);
                continue;
            }

            const originalAmount = transaction.amount;
            const usdAmount = convertCurrency(originalAmount, transaction.currency, 'USD');

            transaction.amount = {
                original: originalAmount,
                usd: usdAmount
            };

            await transaction.save();
            console.log(`Migrated transaction: ${transaction._id}`);
        }

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateTransactions();
