import tensorflow as tf
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
import joblib
import os
import sys
from pathlib import Path
import json
from datetime import datetime

# Get the directory containing this script
SCRIPT_DIR = Path(__file__).parent.absolute()

class PersonalizedExpensePredictor:
    def __init__(self, user_id):
        """Initialize a personalized expense predictor for a specific user"""
        self.user_id = user_id
        self.user_dir = SCRIPT_DIR / 'user_models' / user_id
        self.user_dir.mkdir(parents=True, exist_ok=True)
        
        # Paths for user-specific models and data
        self.model_path = self.user_dir / 'expense_predictor.keras'
        self.scaler_path = self.user_dir / 'scaler.save'
        self.data_path = self.user_dir / 'transaction_data.csv'
        self.metadata_path = self.user_dir / 'metadata.json'
        
        # Load or initialize metadata
        self.metadata = self._load_metadata()
        
        # Check if we have a personalized model, otherwise use base model
        if not self.model_path.exists() or not self.scaler_path.exists():
            self._initialize_from_base_model()
    
    def _load_metadata(self):
        """Load or initialize metadata for the user model"""
        if self.metadata_path.exists():
            with open(self.metadata_path, 'r') as f:
                return json.load(f)
        else:
            # Initialize with default metadata
            metadata = {
                'created_at': datetime.now().isoformat(),
                'last_trained': None,
                'training_count': 0,
                'transaction_count': 0,
                'base_model_weight': 1.0,  # Weight for base model (1.0 = 100% base model)
                'personal_model_weight': 0.0,  # Weight for personal model (0.0 = 0% personal model)
                'performance_metrics': {
                    'mae': None,
                    'mse': None
                }
            }
            self._save_metadata(metadata)
            return metadata
    
    def _save_metadata(self, metadata=None):
        """Save metadata to file"""
        if metadata is None:
            metadata = self.metadata
        
        with open(self.metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
    
    def _initialize_from_base_model(self):
        """Copy the base model and scaler to user directory"""
        base_model_path = SCRIPT_DIR / 'expense_predictor.keras'
        base_scaler_path = SCRIPT_DIR / 'scaler.save'
        
        if not base_model_path.exists() or not base_scaler_path.exists():
            print(f"Error: Base model files not found", file=sys.stderr)
            return False
        
        # Load and save base model to user directory
        try:
            base_model = tf.keras.models.load_model(str(base_model_path))
            base_model.save(str(self.model_path))
            
            base_scaler = joblib.load(str(base_scaler_path))
            joblib.dump(base_scaler, str(self.scaler_path))
            
            print(f"Initialized user model from base model for user {self.user_id}")
            return True
        except Exception as e:
            print(f"Error initializing user model: {str(e)}", file=sys.stderr)
            return False
    
    def add_transaction_data(self, transactions_df):
        """Add new transaction data for training
        
        Args:
            transactions_df: DataFrame with columns [amount, type, date, currency]
        """
        # Prepare data for storage
        if self.data_path.exists():
            # Append to existing data
            existing_data = pd.read_csv(self.data_path)
            combined_data = pd.concat([existing_data, transactions_df], ignore_index=True)
            # Remove duplicates based on transaction ID if present
            if '_id' in combined_data.columns:
                combined_data = combined_data.drop_duplicates(subset=['_id'])
            combined_data.to_csv(self.data_path, index=False)
        else:
            # Create new data file
            transactions_df.to_csv(self.data_path, index=False)
        
        # Update metadata
        self.metadata['transaction_count'] = self._count_transactions()
        self._save_metadata()
        
        return True
    
    def _count_transactions(self):
        """Count the number of transactions in the data file"""
        if not self.data_path.exists():
            return 0
        
        try:
            data = pd.read_csv(self.data_path)
            return len(data)
        except:
            return 0
    
    def should_retrain(self, min_transactions=20, min_days=7):
        """Check if the model should be retrained based on new data"""
        if not self.data_path.exists():
            return False
        
        # Check if we have enough transactions
        if self._count_transactions() < min_transactions:
            return False
        
        # Check last training date
        if self.metadata['last_trained'] is None:
            return True
        
        last_trained = datetime.fromisoformat(self.metadata['last_trained'])
        days_since_training = (datetime.now() - last_trained).days
        
        return days_since_training >= min_days
    
    def prepare_training_data(self):
        """Prepare data for model training"""
        if not self.data_path.exists():
            print(f"No transaction data found for user {self.user_id}", file=sys.stderr)
            return None, None
        
        try:
            # Load transaction data
            data = pd.read_csv(self.data_path)
            
            # Group by month to get monthly totals
            data['date'] = pd.to_datetime(data['date'])
            data['month'] = data['date'].dt.month
            data['year_month'] = data['date'].dt.strftime('%Y-%m')
            
            # Calculate monthly aggregates
            monthly_data = data.groupby(['year_month', 'month', 'type']).agg({
                'amount': 'sum'
            }).reset_index()
            
            # Pivot to get income and expenses columns
            monthly_pivot = monthly_data.pivot_table(
                index=['year_month', 'month'],
                columns='type',
                values='amount',
                fill_value=0
            ).reset_index()
            
            # Rename columns and calculate savings
            if 'income' not in monthly_pivot.columns or 'expense' not in monthly_pivot.columns:
                print(f"Insufficient data types for user {self.user_id}", file=sys.stderr)
                return None, None
            
            monthly_pivot['savings'] = monthly_pivot['income'] - monthly_pivot['expense']
            
            # Prepare X and y for training
            # X: current month's [income, expenses, month, savings]
            # y: next month's expenses
            
            # Sort by year_month
            monthly_pivot = monthly_pivot.sort_values('year_month')
            
            # Create features and target
            X_data = []
            y_data = []
            
            for i in range(len(monthly_pivot) - 1):
                current = monthly_pivot.iloc[i]
                next_month = monthly_pivot.iloc[i + 1]
                
                X_data.append([
                    current['income'],
                    current['expense'],
                    current['month'],
                    current['savings']
                ])
                
                y_data.append(next_month['expense'])
            
            if not X_data or not y_data:
                print(f"Insufficient sequential data for user {self.user_id}", file=sys.stderr)
                return None, None
            
            return np.array(X_data), np.array(y_data)
            
        except Exception as e:
            print(f"Error preparing training data: {str(e)}", file=sys.stderr)
            return None, None
    
    def train_model(self, epochs=100, validation_split=0.2, verbose=0):
        """Train a personalized model using user's transaction data"""
        X, y = self.prepare_training_data()
        
        if X is None or y is None or len(X) < 3:  # Need at least 3 months of data
            print(f"Insufficient data to train model for user {self.user_id}", file=sys.stderr)
            return False
        
        try:
            # Load existing model and scaler
            model = tf.keras.models.load_model(str(self.model_path))
            scaler = joblib.load(str(self.scaler_path))
            
            # Scale input data
            X_scaled = scaler.transform(X)
            
            # Train with early stopping
            early_stopping = tf.keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=10,
                restore_best_weights=True
            )
            
            # Train the model
            history = model.fit(
                X_scaled, y,
                epochs=epochs,
                batch_size=min(32, len(X)),  # Adjust batch size for small datasets
                validation_split=validation_split,
                callbacks=[early_stopping],
                verbose=verbose
            )
            
            # Save the updated model
            model.save(str(self.model_path))
            
            # Update metadata
            self.metadata['last_trained'] = datetime.now().isoformat()
            self.metadata['training_count'] += 1
            
            # Gradually increase personal model weight based on data amount
            transaction_count = self.metadata['transaction_count']
            if transaction_count > 100:
                self.metadata['base_model_weight'] = 0.3
                self.metadata['personal_model_weight'] = 0.7
            elif transaction_count > 50:
                self.metadata['base_model_weight'] = 0.5
                self.metadata['personal_model_weight'] = 0.5
            elif transaction_count > 20:
                self.metadata['base_model_weight'] = 0.7
                self.metadata['personal_model_weight'] = 0.3
            
            # Save performance metrics
            val_mae = history.history['val_mae'][-1] if 'val_mae' in history.history else None
            val_mse = history.history['val_loss'][-1] if 'val_loss' in history.history else None
            
            self.metadata['performance_metrics'] = {
                'mae': val_mae,
                'mse': val_mse
            }
            
            self._save_metadata()
            
            print(f"Successfully trained personalized model for user {self.user_id}")
            return True
            
        except Exception as e:
            print(f"Error training personalized model: {str(e)}", file=sys.stderr)
            return False
    
    def predict(self, income, expenses, month, savings):
        """Make a prediction using the personalized model"""
        try:
            # Load model and scaler
            model = tf.keras.models.load_model(str(self.model_path))
            scaler = joblib.load(str(self.scaler_path))
            
            # Prepare input data
            input_data = np.array([[income, expenses, month, savings]])
            scaled_input = scaler.transform(input_data)
            
            # Make prediction
            prediction = model.predict(scaled_input, verbose=0)[0][0]
            
            # Apply hybrid weighting if we have both models
            base_weight = self.metadata['base_model_weight']
            personal_weight = self.metadata['personal_model_weight']
            
            # If we have a base model prediction, blend them
            if base_weight > 0:
                # Load base model for comparison
                base_model_path = SCRIPT_DIR / 'expense_predictor.keras'
                base_scaler_path = SCRIPT_DIR / 'scaler.save'
                
                if base_model_path.exists() and base_scaler_path.exists():
                    base_model = tf.keras.models.load_model(str(base_model_path))
                    base_scaler = joblib.load(str(base_scaler_path))
                    
                    # Get base model prediction
                    base_scaled_input = base_scaler.transform(input_data)
                    base_prediction = base_model.predict(base_scaled_input, verbose=0)[0][0]
                    
                    # Blend predictions
                    prediction = (base_prediction * base_weight) + (prediction * personal_weight)
            
            # Post-process prediction (similar to base model)
            min_prediction = expenses * 0.8  # Allow 20% reduction
            max_prediction = expenses * 1.2  # Allow 20% increase
            
            # Adjust for seasonal patterns
            if 10 <= month <= 12:  # Festival season
                max_prediction = expenses * 1.3
            elif 1 <= month <= 2:  # New year period
                min_prediction = expenses * 0.9
            
            # Ensure prediction is reasonable relative to income
            if income > 0:
                max_allowed = min(income * 0.3, expenses * 1.5)
                min_allowed = max(income * 0.01, expenses * 0.5)
                max_prediction = min(max_prediction, max_allowed)
                min_prediction = max(min_prediction, min_allowed)
            
            # Clip prediction to reasonable bounds
            final_prediction = float(np.clip(prediction, min_prediction, max_prediction))
            
            return final_prediction
            
        except Exception as e:
            print(f"Error in personalized prediction: {str(e)}", file=sys.stderr)
            
            # Fall back to base model if available
            try:
                base_model_path = SCRIPT_DIR / 'expense_predictor.keras'
                base_scaler_path = SCRIPT_DIR / 'scaler.save'
                
                if base_model_path.exists() and base_scaler_path.exists():
                    base_model = tf.keras.models.load_model(str(base_model_path))
                    base_scaler = joblib.load(str(base_scaler_path))
                    
                    # Get base model prediction
                    input_data = np.array([[income, expenses, month, savings]])
                    base_scaled_input = base_scaler.transform(input_data)
                    base_prediction = base_model.predict(base_scaled_input, verbose=0)[0][0]
                    
                    # Apply post-processing
                    min_prediction = expenses * 0.8
                    max_prediction = expenses * 1.2
                    
                    if 10 <= month <= 12:
                        max_prediction = expenses * 1.3
                    elif 1 <= month <= 2:
                        min_prediction = expenses * 0.9
                    
                    if income > 0:
                        max_allowed = min(income * 0.3, expenses * 1.5)
                        min_allowed = max(income * 0.01, expenses * 0.5)
                        max_prediction = min(max_prediction, max_allowed)
                        min_prediction = max(min_prediction, min_allowed)
                    
                    final_prediction = float(np.clip(base_prediction, min_prediction, max_prediction))
                    return final_prediction
            except:
                # If all else fails, return a simple estimate
                return expenses * 1.05  # 5% increase as fallback
