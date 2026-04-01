import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

// Text-to-Speech helper
export const speak = (text) => {
  if (!window.speechSynthesis) return;

  window.speechSynthesis.cancel(); // Stop any current speech

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;

  // Try to find a good voice
  const voices = window.speechSynthesis.getVoices();
  const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
                       voices.find(v => v.lang.startsWith('en')) ||
                       voices[0];
  if (englishVoice) utterance.voice = englishVoice;

  window.speechSynthesis.speak(utterance);
};

export const stopSpeaking = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

// Floating TTS button
function TextToSpeechButton() {
  const [enabled, setEnabled] = useState(true);

  const toggleTTS = () => {
    if (enabled) {
      stopSpeaking();
    }
    setEnabled(!enabled);
  };

  return (
    <button
      onClick={toggleTTS}
      className="fixed bottom-20 right-6 z-50 p-3 bg-primary-700 hover:bg-primary-600 rounded-full shadow-lg transition-all"
      title={enabled ? "Disable voice assistant" : "Enable voice assistant"}
    >
      {enabled ? (
        <Volume2 className="w-6 h-6 text-white" />
      ) : (
        <VolumeX className="w-6 h-6 text-white opacity-50" />
      )}
    </button>
  );
}

export default TextToSpeechButton;