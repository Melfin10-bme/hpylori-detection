"""
H. pylori Detection AI Model
Simulates binary signal analysis from nanopaper color changes
Yellow (normal) -> 0, Brown (infected) -> 1
Uses scikit-learn for ML model
"""

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
import os

# Signal configuration
SIGNAL_LENGTH = 100  # Length of binary signal input

class HpyloriDetector:
    def __init__(self):
        self.model = None
        self.signal_length = SIGNAL_LENGTH
        self._build_model()
        self._train_model()

    def _build_model(self):
        """Build the neural network model for H. pylori detection"""
        self.model = MLPClassifier(
            hidden_layer_sizes=(64, 32, 16),
            activation='relu',
            solver='adam',
            max_iter=500,
            random_state=42,
            early_stopping=True,
            validation_fraction=0.2
        )

    def _generate_synthetic_data(self, num_samples=1000):
        """Generate synthetic training data for the model"""
        np.random.seed(42)

        X = []
        y = []

        for _ in range(num_samples):
            # Generate random binary signal
            signal = np.random.randint(0, 2, self.signal_length)

            # Determine label based on signal characteristics
            # Higher ratio of 1s indicates infection (brown color)
            # Realistic: Positive cases have more 1s
            ones_ratio = np.sum(signal) / self.signal_length

            # Add some noise to make it realistic
            if ones_ratio > 0.5:
                label = 1  # Infected
            else:
                label = 0  # Normal

            X.append(signal)
            y.append(label)

        return np.array(X), np.array(y)

    def _train_model(self):
        """Train the model with synthetic data"""
        X, y = self._generate_synthetic_data(2000)

        # Train the model
        self.model.fit(X, y)
        print("AI Model trained successfully")

    def preprocess_signal(self, binary_signal):
        """Preprocess binary signal for model input"""
        if isinstance(binary_signal, str):
            # Parse comma-separated string
            signal_list = [int(x.strip()) for x in binary_signal.split(',')]
        elif isinstance(binary_signal, list):
            signal_list = binary_signal
        else:
            raise ValueError("Invalid signal format")

        # Ensure consistent length
        if len(signal_list) < self.signal_length:
            # Pad with zeros
            signal_list.extend([0] * (self.signal_length - len(signal_list)))
        elif len(signal_list) > self.signal_length:
            # Truncate
            signal_list = signal_list[:self.signal_length]

        return np.array(signal_list, dtype=np.float32).reshape(1, -1)

    def predict(self, binary_signal):
        """
        Predict H. pylori infection from binary signal

        Returns:
            dict: prediction, confidence, nanopaper_color
        """
        processed_signal = self.preprocess_signal(binary_signal)

        # Get prediction probability
        probability = self.model.predict_proba(processed_signal)[0]

        # Determine result
        if len(probability) > 1:
            pred_proba = probability[1]  # Probability of positive class
        else:
            pred_proba = probability[0]

        if pred_proba > 0.5:
            prediction = "Positive"
            confidence = round(pred_proba * 100, 2)
            nanopaper_color = "Brown"
        else:
            prediction = "Negative"
            confidence = round((1 - pred_proba) * 100, 2)
            nanopaper_color = "Yellow"

        return {
            "prediction": prediction,
            "confidence": confidence,
            "nanopaper_color": nanopaper_color,
            "probability": float(pred_proba)
        }

    def generate_random_signal(self):
        """Generate a random binary signal for testing/demo"""
        signal = np.random.randint(0, 2, self.signal_length)
        return ','.join(map(str, signal.tolist()))

    def get_signal_stats(self, binary_signal):
        """Get statistics about the binary signal"""
        if isinstance(binary_signal, str):
            signal_list = [int(x.strip()) for x in binary_signal.split(',')]
        else:
            signal_list = binary_signal

        ones = sum(signal_list)
        zeros = len(signal_list) - ones

        return {
            "total_bits": len(signal_list),
            "ones_count": ones,
            "zeros_count": zeros,
            "ones_ratio": round(ones / len(signal_list), 4)
        }


# Global model instance
detector = HpyloriDetector()

def get_detector():
    """Get the global detector instance"""
    return detector


def analyze_signal(binary_signal):
    """Convenience function to analyze a signal"""
    return detector.predict(binary_signal)


def generate_random_signal():
    """Generate a random signal for testing"""
    return detector.generate_random_signal()