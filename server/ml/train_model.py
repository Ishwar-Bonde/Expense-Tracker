import tensorflow as tf
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
import joblib
from pathlib import Path

# Get the directory containing this script
SCRIPT_DIR = Path(__file__).parent.absolute()

# Generate synthetic data
np.random.seed(42)
n_samples = 1000

# Generate more realistic random data with patterns
# Base income around your current income level
base_income = 8312466  # Your current income
income = np.random.normal(base_income, base_income * 0.05, n_samples)  # 5% variation

# Base expenses around your current expense level
base_expense = 44718  # Your current expense level
expense_variation = np.random.normal(0, base_expense * 0.2, n_samples)  # 20% variation
base_expenses = base_expense + expense_variation

month = np.random.randint(1, 13, n_samples)
savings = income - base_expenses

# Add seasonal patterns (higher expenses in certain months)
month_effect = np.zeros(n_samples)
# Slight increase in festival months (Oct-Dec)
month_effect[month >= 10] += base_expense * 0.15  # 15% increase
# Slight decrease in beginning of year (Jan-Feb)
month_effect[month <= 2] -= base_expense * 0.05   # 5% decrease
expenses = base_expenses + month_effect

# Ensure expenses don't go negative
expenses = np.maximum(expenses, 0)

# Create DataFrame
data = pd.DataFrame({
    'income': income,
    'expenses': expenses,
    'month': month,
    'savings': savings
})

# Save synthetic data
data.to_csv(SCRIPT_DIR / 'synthetic_expense_data.csv', index=False)

# Prepare data for model
X = data[['income', 'expenses', 'month', 'savings']].values
y = expenses * (1 + np.random.normal(0, 0.05, n_samples))  # Next month's expenses with 5% variation

# Scale the data
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Save the scaler
joblib.dump(scaler, SCRIPT_DIR / 'scaler.save')

# Create and train the model with regularization
inputs = tf.keras.Input(shape=(4,))
x = tf.keras.layers.Dense(64, activation='relu', kernel_regularizer=tf.keras.regularizers.l2(0.01))(inputs)
x = tf.keras.layers.Dropout(0.2)(x)
x = tf.keras.layers.Dense(32, activation='relu', kernel_regularizer=tf.keras.regularizers.l2(0.01))(x)
x = tf.keras.layers.Dropout(0.2)(x)
outputs = tf.keras.layers.Dense(1, kernel_regularizer=tf.keras.regularizers.l2(0.01))(x)

model = tf.keras.Model(inputs=inputs, outputs=outputs)
model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.001), 
              loss='mse',
              metrics=['mae'])

# Train the model with early stopping
early_stopping = tf.keras.callbacks.EarlyStopping(
    monitor='val_loss',
    patience=10,
    restore_best_weights=True
)

history = model.fit(
    X_scaled, y,
    epochs=200,
    batch_size=32,
    validation_split=0.2,
    callbacks=[early_stopping],
    verbose=1
)

# Save the model
model.save(SCRIPT_DIR / 'expense_predictor.keras')

print(f"Model saved to {SCRIPT_DIR / 'expense_predictor.keras'}")
print(f"Scaler saved to {SCRIPT_DIR / 'scaler.save'}")
print(f"Training data saved to {SCRIPT_DIR / 'synthetic_expense_data.csv'}")
