import React from 'react';
import { Link } from 'react-router-dom';
import { Wallet, PieChart, TrendingUp, DollarSign } from 'lucide-react';

function Intro() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center text-white mb-16">
          <h1 className="text-5xl font-bold mb-6">Track Your Money with Ease</h1>
          <p className="text-xl mb-8">Your personal finance companion for smart money management</p>
          
          <div className="flex justify-center gap-4">
            <Link
              to="/login"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition"
            >
              Sign Up
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 text-white">
          <div className="bg-white bg-opacity-10 p-6 rounded-xl backdrop-blur-lg">
            <Wallet className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Track Expenses</h3>
            <p>Monitor your spending habits and stay within budget</p>
          </div>
          
          <div className="bg-white bg-opacity-10 p-6 rounded-xl backdrop-blur-lg">
            <PieChart className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Visual Analytics</h3>
            <p>Understand your finances through intuitive charts and graphs</p>
          </div>
          
          <div className="bg-white bg-opacity-10 p-6 rounded-xl backdrop-blur-lg">
            <TrendingUp className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Financial Goals</h3>
            <p>Set and achieve your financial objectives</p>
          </div>
          
          <div className="bg-white bg-opacity-10 p-6 rounded-xl backdrop-blur-lg">
            <DollarSign className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Multi-Currency</h3>
            <p>Support for multiple currencies and easy conversion</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Intro;