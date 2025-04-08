import sys
import json
import pandas as pd
from pathlib import Path
import os

# Add the current directory to the path so we can import the personalized_model module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from personalized_model import PersonalizedExpensePredictor

def update_user_model(user_id, data_file):
    """Update a user's personalized model with new transaction data"""
    try:
        # Load transaction data from JSON file
        with open(data_file, 'r') as f:
            transactions = json.load(f)
        
        # Convert to DataFrame
        df = pd.DataFrame(transactions)
        
        # Initialize personalized model
        model = PersonalizedExpensePredictor(user_id)
        
        # Add transaction data
        model.add_transaction_data(df)
        
        # Check if we should retrain
        if model.should_retrain(min_transactions=10):
            print(f"Retraining model for user {user_id}")
            success = model.train_model(epochs=150, verbose=1)
            if success:
                print(f"Successfully retrained model for user {user_id}")
            else:
                print(f"Failed to retrain model for user {user_id}")
        else:
            print(f"Not enough new data to retrain model for user {user_id}")
        
        return True
    except Exception as e:
        print(f"Error updating user model: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python update_user_model.py <user_id> <data_file>", file=sys.stderr)
        sys.exit(1)
    
    user_id = sys.argv[1]
    data_file = sys.argv[2]
    
    success = update_user_model(user_id, data_file)
    sys.exit(0 if success else 1)
