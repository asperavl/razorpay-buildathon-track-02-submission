import pandas as pd
from server.app.data.generator import TransactionGenerator

def generate_demo_dataset():
    print("Initializing FraudPulse Generator...")
    gen = TransactionGenerator()
    
    print("Generating 6 hours of historical transaction traffic...")
    # Generate 6 hours of data with 5 injected spikes
    txns = gen.generate_batch(duration_minutes=360, anomalies_count=5)
    df = pd.DataFrame(txns)
    
    file_name = 'fraudpulse_demo_dataset.csv'
    df.to_csv(file_name, index=False)
    
    print(f"✅ Success! Created {file_name} with {len(df)} transactions.")
    print("You can now upload this file in the FraudPulse UI to demonstrate the Batch Analysis feature.")

if __name__ == "__main__":
    generate_demo_dataset()
