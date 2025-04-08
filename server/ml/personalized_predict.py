import sys
import os
from pathlib import Path

# Add the current directory to the path so we can import the personalized_model module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from personalized_model import PersonalizedExpensePredictor

def predict(user_id, income, expenses, month, savings):
    """Make a prediction using a user's personalized model"""
    try:
        # Initialize personalized model
        model = PersonalizedExpensePredictor(user_id)
        
        # Make prediction
        prediction = model.predict(
            float(income), 
            float(expenses), 
            int(month), 
            float(savings)
        )
        
        print(prediction)
        return True
    except Exception as e:
        print(f"Error in personalized prediction: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) != 6:
        print("Usage: python personalized_predict.py <user_id> <income> <expenses> <month> <savings>", file=sys.stderr)
        sys.exit(1)
    
    user_id = sys.argv[1]
    income = sys.argv[2]
    expenses = sys.argv[3]
    month = sys.argv[4]
    savings = sys.argv[5]
    
    success = predict(user_id, income, expenses, month, savings)
    sys.exit(0 if success else 1)
