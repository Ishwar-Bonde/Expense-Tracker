# 💰 Smart Expense Tracker

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-v18.0%2B-green.svg)
![React](https://img.shields.io/badge/React-v18.0%2B-blue.svg)
![Python](https://img.shields.io/badge/Python-3.11-yellow.svg)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.14%2B-orange.svg)

A modern, full-stack expense tracking application with ML-powered predictions, loan management, and recurring transactions. Built with the MERN stack (MongoDB, Express.js, React, Node.js) and Python for machine learning capabilities.

## ✨ Features

### 💸 Core Financial Management
- **Transaction Tracking**: Log and categorize your income and expenses
- **Multiple Currency Support**: Handle transactions in different currencies with automatic conversion
- **Custom Categories**: Create and manage your own transaction categories
- **Data Visualization**: View your financial data through interactive charts and graphs

### 🤖 AI-Powered Features
- **Expense Predictions**: ML model to predict future expenses based on historical data
- **Smart Categorization**: Automatic transaction categorization using machine learning
- **Financial Insights**: AI-driven insights about your spending patterns

### 📅 Recurring Transactions
- **Automated Tracking**: Set up recurring bills and income
- **Smart Notifications**: Get reminders before due dates
- **Flexible Scheduling**: Support for daily, weekly, monthly, and yearly recurring transactions

### 💳 Loan Management
- **Loan Tracking**: Monitor multiple loans with detailed repayment schedules
- **Auto-deduction**: Set up automatic payment deductions
- **Loan Calculator**: Calculate EMI, interest, and total payment
- **Document Management**: Store and manage loan-related documents

### 📊 Advanced Analytics
- **Custom Reports**: Generate detailed financial reports
- **Export Options**: Export data in CSV and PDF formats
- **Budget Analysis**: Track spending against budgets
- **Trend Analysis**: View historical trends and patterns

## 🚀 Getting Started

### Prerequisites
- Node.js v18.0 or higher
- Python 3.11 or higher
- MongoDB
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Ishwar-Bonde/Expense-Tracker.git
cd Expense-Tracker
```

2. **Install Node.js dependencies**
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../
npm install
```

3. **Set up Python environment**
```bash
cd server/ml
python -m venv ml_env
source ml_env/bin/activate  # On Windows: ml_env\Scripts\activate
pip install -r requirements.txt

or
# Can be used directly global python interpreter
pip install -r requirements.txt
```

4. **Configure environment variables**
```bash
# Copy example env file
cp .env.example .env
# Edit .env with your configuration
```

5. **Start the application**
```bash
# Start backend server
cd server
npm start

# Start frontend (in a new terminal)
cd ../
npm run dev
```

## 🏗️ Architecture

### Frontend
- React 18 with TypeScript
- Vite for fast development and building
- TailwindCSS for styling
- Chart.js for data visualization
- React Router for navigation

### Backend
- Node.js with Express
- MongoDB with Mongoose
- JWT authentication
- RESTful API design
- Email notification system

### Machine Learning
- Python 3.11
- TensorFlow for predictive modeling
- Scikit-learn for data preprocessing
- Pandas for data manipulation

## 📱 Screenshots

### Dashboard Overview
![Dashboard](./screenshots/dashboard.png)
*Main dashboard showing expense overview and charts*

### Transaction Management
![Transactions](./screenshots/transactions.png)
*Transaction list with filtering and sorting options*

### Loan Management
![Loans](./screenshots/loans.png)
*Loan management interface with repayment schedules*

### ML Predictions
![Predictions](./screenshots/predictions.png)
*AI-powered expense predictions and insights*

## 🔒 Security Features
- JWT-based authentication
- Password hashing
- CORS protection
- Rate limiting
- Input validation
- Secure file uploads

## 🛣️ Roadmap
- [ ] Mobile app development
- [ ] Investment tracking
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Budget goals and achievements
- [ ] Social features for shared expenses

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments
- MongoDB for database
- TensorFlow for ML capabilities
- React community for amazing tools
- All contributors who helped shape this project

## 📞 Contact
Ishwar Bonde - ishwarbonde40@gmail.com
Project Link: [https://github.com/Ishwar-Bonde/Expense-Tracker](https://github.com/Ishwar-Bonde/Expense-Tracker)

---
⭐ Star this repository if you find it helpful!
