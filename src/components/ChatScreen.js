import React, { useState, useRef, useEffect } from 'react';
import './ChatScreen.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Tjek backend forbindelse ved load
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${API_URL}/health`);
        if (!response.ok) {
          setError('Backend serveren svarer ikke korrekt. Tjek at serveren kører.');
        }
      } catch (err) {
        setError('Kunne ikke forbinde til backend serveren. Sørg for at backend kører på port 5000.');
      }
    };
    checkBackend();
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Valider filtype
      const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 
                           'audio/ogg', 'audio/m4a', 'audio/aac', 'audio/flac'];
      if (allowedTypes.includes(file.type)) {
        setAudioFile(file);
        setError(null);
      } else {
        setError('Kun lydfiler er tilladt (mp3, wav, webm, ogg, m4a, aac, flac)');
      }
    }
  };

  const removeAudioFile = () => {
    setAudioFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    try {
      // Bed om mikrofon adgang
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Opret MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      const chunks = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        // Opret Blob fra chunks
        const audioBlob = new Blob(chunks, { type: recorder.mimeType });
        const audioFile = new File([audioBlob], `optagelse-${Date.now()}.webm`, {
          type: recorder.mimeType
        });
        setAudioFile(audioFile);
        setAudioChunks([]);
        
        // Stop alle tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.onerror = (event) => {
        console.error('Optagelsesfejl:', event.error);
        setError('Fejl ved optagelse af lyd');
        stopRecording();
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      setError(null);
      
      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Fejl ved start af optagelse:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Mikrofon adgang blev nægtet. Tillad mikrofon adgang i browser indstillinger.');
      } else {
        setError('Kunne ikke starte optagelse. Tjek at mikrofon er tilgængelig.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      setRecordingTime(0);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup ved unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        mediaRecorder.stream?.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaRecorder, isRecording]);

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!input.trim() && !audioFile) return;
    if (loading) return;

    const userMessage = input.trim();
    const currentAudioFile = audioFile;
    
    setInput('');
    setAudioFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError(null);
    setLoading(true);

    // Byg besked content til visning
    let messageContent = userMessage || '';
    if (currentAudioFile) {
      messageContent += (messageContent ? ' ' : '') + `🎵 ${currentAudioFile.name}`;
    }

    // Tilføj brugerens besked til chatten
    const newMessages = [...messages, { role: 'user', content: messageContent }];
    setMessages(newMessages);

    try {
      // Byg FormData for at sende både tekst og lydfil
      const formData = new FormData();
      if (userMessage) {
        formData.append('message', userMessage);
      }
      if (currentAudioFile) {
        formData.append('audio', currentAudioFile);
      }
      formData.append('history', JSON.stringify(newMessages.slice(0, -1)));

      // Send besked til backend
      const response = await fetch(`${API_URL}/chat/message`, {
        method: 'POST',
        body: formData, // FormData sætter Content-Type automatisk med boundary
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Ukendt fejl' }));
        throw new Error(errorData.message || errorData.error || `Server fejl: ${response.status}`);
      }

      const data = await response.json();
      console.log('Modtaget data fra server:', data);

      // Tjek om der er et svar
      if (!data.message) {
        console.error('Ingen besked i response:', data);
        throw new Error('Ingen besked modtaget fra serveren');
      }

      // Tilføj AI's svar
      const assistantMessage = { role: 'assistant', content: data.message };
      console.log('Tilføjer assistant besked:', assistantMessage);
      setMessages([...newMessages, assistantMessage]);
    } catch (err) {
      console.error('Chat fejl:', err);
      
      // Bedre fejlbeskeder
      let errorMessage = 'Der opstod en fejl. Prøv igen.';
      
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        errorMessage = 'Kunne ikke forbinde til serveren. Tjek at backend kører på port 5000.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      // Håndter kvote fejl specifikt
      if (err.message?.includes('quota') || err.message?.includes('Quota exceeded') || err.message?.includes('429')) {
        errorMessage = err.message || 'API kvote overskredet. Vent et øjeblik eller opgrader din plan.';
      }
      
      setError(errorMessage);
      // Fjern brugerens besked hvis der opstod en fejl
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="chat-screen">
      <div className="chat-header">
        <h2>💬 AI Chat</h2>
        {messages.length > 0 && (
          <button className="clear-button" onClick={clearChat}>
            Ryd chat
          </button>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <p>👋 Hej! Jeg er din AI-assistent.</p>
            <p>Stil mig et spørgsmål, og jeg vil prøve at hjælpe dig.</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.role}`}>
            <div className="message-content">
              {msg.content || '(Tom besked)'}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-message assistant">
            <div className="message-content">
              <span className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="chat-error">
            ⚠️ {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={sendMessage}>
        <div className="chat-input-wrapper">
          {audioFile && (
            <div className="audio-file-preview">
              <span className="audio-file-name">🎵 {audioFile.name}</span>
              <button 
                type="button" 
                className="remove-audio-button"
                onClick={removeAudioFile}
                disabled={loading}
              >
                ✕
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="file-input-hidden"
            id="audio-file-input"
            disabled={loading}
          />
          <div className="audio-controls">
            <button
              type="button"
              className={`record-button ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading}
              title={isRecording ? 'Stop optagelse' : 'Start optagelse'}
            >
              {isRecording ? '⏹️' : '🎤'}
            </button>
            {isRecording && (
              <span className="recording-time">{formatTime(recordingTime)}</span>
            )}
            <label htmlFor="audio-file-input" className="file-input-label" title="Tilføj lydfil">
              📁
            </label>
          </div>
          <input
            type="text"
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Skriv din besked her..."
            disabled={loading}
          />
        </div>
        <button 
          type="submit" 
          className="chat-send-button"
          disabled={loading || (!input.trim() && !audioFile)}
        >
          {loading ? '⏳' : '📤'}
        </button>
      </form>
    </div>
  );
};

export default ChatScreen;
