import express from 'express';
import OpenAI from 'openai';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';

const router = express.Router();

// Initialize OpenAI
if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set in environment variables');
    // throw new Error('OPENAI_API_KEY is required');
}

// Debug log to check the key (only show first few characters)
console.log('API Key loaded:', process.env.OPENAI_API_KEY.substring(0, 12) + '...');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY.trim()
});

// Helper function to analyze transactions
async function analyzeTransactions(userId) {
    try {
        // Fetch only the specific user's transactions
        const transactions = await Transaction.find({
            userId: userId  // Add userId filter
        }).populate('categoryId');

        if (!transactions || transactions.length === 0) {
            return {
                totalIncome: 0,
                totalExpenses: 0,
                savingsRate: 0,
                topCategories: []
            };
        }

        // Calculate totals
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        // Calculate savings rate
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

        // Get top spending categories
        const categorySpending = {};
        transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                const catName = t.categoryId?.name || 'Uncategorized';
                categorySpending[catName] = (categorySpending[catName] || 0) + t.amount;
            });

        const topCategories = Object.entries(categorySpending)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        return {
            totalIncome,
            totalExpenses,
            savingsRate,
            topCategories
        };

    } catch (error) {
        console.error('Error analyzing transactions:', error);
        throw error;
    }
}

// Helper function for fallback responses
function generateFallbackResponse(analysis, message) {
    const lowercaseMessage = message.toLowerCase();
    
    // Basic response templates
    const templates = {
        savings: `Based on your financial data, your savings rate is ${analysis.savingsRate.toFixed(1)}%. ${
            analysis.savingsRate < 20 
                ? "Consider looking for ways to increase your savings by reducing non-essential expenses." 
                : "You're doing well with saving! Keep up the good work!"
        }`,
        
        expenses: `Your total expenses are ₹${analysis.totalExpenses.toFixed(2)}. ${
            analysis.topCategories.length > 0 
                ? `Your top spending category is ${analysis.topCategories[0][0]} at ₹${analysis.topCategories[0][1].toFixed(2)}.` 
                : ""
        } ${
            analysis.totalExpenses > analysis.totalIncome * 0.8 
                ? "Your expenses are quite high relative to your income. Consider creating a budget to manage spending."
                : "Your expense level appears manageable relative to your income."
        }`,
        
        income: `Your total income is ₹${analysis.totalIncome.toFixed(2)}. ${
            analysis.totalIncome > analysis.totalExpenses * 1.2 
                ? "You have a good income buffer above your expenses." 
                : "Your income and expenses are quite close - consider ways to increase income or reduce expenses."
        }`,
        
        default: `Here's a summary of your finances:
        - Total Income: ₹${analysis.totalIncome.toFixed(2)}
        - Total Expenses: ₹${analysis.totalExpenses.toFixed(2)}
        - Savings Rate: ${analysis.savingsRate.toFixed(1)}%
        ${analysis.topCategories.length > 0 ? `- Top spending category: ${analysis.topCategories[0][0]}` : ""}`
    };

    // Determine which response to use based on the message
    if (lowercaseMessage.includes('save') || lowercaseMessage.includes('saving')) {
        return templates.savings;
    } else if (lowercaseMessage.includes('spend') || lowercaseMessage.includes('expense')) {
        return templates.expenses;
    } else if (lowercaseMessage.includes('income') || lowercaseMessage.includes('earn')) {
        return templates.income;
    }
    
    return templates.default;
}

// Chat endpoint with transaction analysis
router.post('/chat', async (req, res) => {
    try {
        const { message, userId } = req.body;

        if (!message || !userId) {
            return res.status(400).json({ error: 'Message and userId are required' });
        }

        const analysis = await analyzeTransactions(userId);

        try {
            const systemMessage = `You are a professional financial advisor with the following strict rules:
            1. ONLY answer questions related to personal finance, transactions, budgeting, and the user's financial data
            2. If the user asks anything unrelated to finance, politely decline and remind them that you can only discuss financial matters
            3. Base your advice on these financial metrics:
            - Total Income: ₹${analysis.totalIncome.toFixed(2)}
            - Total Expenses: ₹${analysis.totalExpenses.toFixed(2)}
            - Savings Rate: ${analysis.savingsRate.toFixed(1)}%
            - Top Spending Categories: ${analysis.topCategories.map(([cat, amount]) => `${cat}: ₹${amount.toFixed(2)}`).join(', ')}
            4. Keep responses focused on helping the user manage their money better
            5. Provide practical, actionable financial advice`;

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemMessage },
                    { role: "user", content: message }
                ],
                temperature: 0.7,
                max_tokens: 500
            });

            return res.json({
                response: response.choices[0].message.content
            });

        } catch (error) {
            console.error('OpenAI Error:', error);
            
            // Fallback to basic response if OpenAI fails
            const fallbackResponse = generateFallbackResponse(analysis, message);
            return res.json({ response: fallbackResponse });
        }

    } catch (error) {
        console.error('Chat Error:', error);
        res.status(500).json({ error: 'Failed to process chat message' });
    }
});

export default router;
