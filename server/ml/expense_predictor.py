import tensorflow as tf
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
import joblib
import os
import sys
from pathlib import Path

# Get the directory containing this script
SCRIPT_DIR = Path(__file__).parent.absolute()

class ExpensePredictor:
    def __init__(self):
        model_path = SCRIPT_DIR / 'expense_predictor.keras'
        scaler_path = SCRIPT_DIR / 'scaler.save'
        
        if not model_path.exists():
            print(f"Error: Model file not found at {model_path}", file=sys.stderr)
            sys.exit(1)
            
        self.model = tf.keras.models.load_model(str(model_path))
        
        if not scaler_path.exists():
            print(f"Error: Scaler file not found at {scaler_path}", file=sys.stderr)
            sys.exit(1)
            
        self.scaler = joblib.load(str(scaler_path))

    def predict(self, income, expenses, month, savings):
        try:
            # Input validation
            print(f"Validating input: income={income}, expenses={expenses}, month={month}, savings={savings}", file=sys.stderr)
            
            if not isinstance(income, (int, float)) or not isinstance(expenses, (int, float)):
                raise ValueError(f"Income and expenses must be numbers. Got: income={type(income)}, expenses={type(expenses)}")
            
            if income <= 0:
                raise ValueError(f"Income must be positive, got {income}")
                
            # If expenses are 0 or very low, set a minimum based on income
            if expenses <= 0:
                expenses = max(income * 0.1, 1000)  # At least 10% of income or 1000
                print(f"Setting minimum expenses to {expenses}", file=sys.stderr)
                
            if month < 1 or month > 12:
                raise ValueError(f"Month must be between 1 and 12, got {month}")
            
            # Prepare input data
            input_data = np.array([[income, expenses, month, savings]])
            print(f"Input data shape: {input_data.shape}", file=sys.stderr)
            print(f"Input values: {input_data[0].tolist()}", file=sys.stderr)
            
            # Scale input data
            try:
                scaled_input = self.scaler.transform(input_data)
                print(f"Scaled input: {scaled_input.tolist()}", file=sys.stderr)
            except Exception as e:
                print(f"Error during scaling: {str(e)}", file=sys.stderr)
                raise
            
            # Make prediction
            try:
                raw_prediction = self.model.predict(scaled_input, verbose=0)[0][0]
                print(f"Raw prediction: {raw_prediction}", file=sys.stderr)
            except Exception as e:
                print(f"Error during model prediction: {str(e)}", file=sys.stderr)
                raise
            
            # Post-process prediction
            try:
                # 1. Base range: 80% to 120% of current expenses
                min_prediction = expenses * 0.8  # Allow 20% reduction
                max_prediction = expenses * 1.2  # Allow 20% increase
                
                print(f"Initial bounds: min={min_prediction}, max={max_prediction}", file=sys.stderr)
                
                # 2. Adjust for seasonal patterns
                if 10 <= month <= 12:  # Festival season
                    max_prediction = expenses * 1.3  # Allow up to 30% increase in festival season
                    print(f"Festival season adjustment: max={max_prediction}", file=sys.stderr)
                elif 1 <= month <= 2:  # New year period
                    min_prediction = expenses * 0.9  # Less reduction in new year
                    print(f"New year adjustment: min={min_prediction}", file=sys.stderr)
                
                # 3. Ensure prediction is reasonable relative to income
                if income > 0:
                    max_allowed = min(income * 0.3, expenses * 1.5)  # Cap at 30% of income or 50% increase
                    min_allowed = max(income * 0.01, expenses * 0.5)  # At least 1% of income or 50% reduction
                    max_prediction = min(max_prediction, max_allowed)
                    min_prediction = max(min_prediction, min_allowed)
                
                print(f"Income-adjusted bounds: min={min_prediction}, max={max_prediction}", file=sys.stderr)
                
                # Clip prediction to reasonable bounds
                final_prediction = float(np.clip(raw_prediction, min_prediction, max_prediction))
                print(f"Final prediction: {final_prediction}", file=sys.stderr)
                
                return final_prediction
                
            except Exception as e:
                print(f"Error during post-processing: {str(e)}", file=sys.stderr)
                raise
            
        except Exception as e:
            print(f"Error in prediction: {str(e)}", file=sys.stderr)
            sys.exit(1)

def main():
    if len(sys.argv) != 5:
        print("Usage: python expense_predictor.py <income> <expenses> <month> <savings>", file=sys.stderr)
        sys.exit(1)
    
    try:
        income = float(sys.argv[1])
        expenses = float(sys.argv[2])
        month = float(sys.argv[3])
        savings = float(sys.argv[4])
        
        predictor = ExpensePredictor()
        prediction = predictor.predict(income, expenses, month, savings)
        
        # Print only the prediction to stdout (this is what Node.js will read)
        print(prediction)
        
    except ValueError as e:
        print(f"Error: Invalid input values - {str(e)}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
