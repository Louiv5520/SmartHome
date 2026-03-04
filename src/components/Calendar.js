import React, { useState, useEffect } from 'react';
import './Calendar.css';
import { calendarAPI } from '../utils/api';

const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [nextEvent, setNextEvent] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Load events from backend API with fallback to localStorage
  useEffect(() => {
    const loadEvents = async () => {
      const today = new Date().toISOString().split('T')[0];
      const userId = localStorage.getItem('aiSpeaker_userId');
      
      // Try to load from backend if user is logged in
      if (userId) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Calendar.js:20',message:'Loading calendar events from backend',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        try {
          const response = await calendarAPI.getTodayEvents(userId);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Calendar.js:23',message:'Calendar API response',data:{hasResponse:!!response,hasEvents:!!response?.events,eventsCount:response?.events?.length,responseKeys:response?Object.keys(response):[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          if (response && response.events && response.events.length > 0) {
            setEvents(response.events);
            setLoading(false);
            return;
          }
        } catch (error) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Calendar.js:29',message:'Calendar API error',data:{errorMessage:error.message,errorName:error.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,E'})}).catch(()=>{});
          // #endregion
          console.error('Fejl ved hentning af kalender events fra backend:', error);
          // Fall through to localStorage fallback
        }
      }
      
      // Fallback to localStorage or mock data
      const savedEvents = localStorage.getItem('aiSpeaker_calendarEvents');
      
      if (savedEvents) {
        try {
          const parsedEvents = JSON.parse(savedEvents);
          const hasTodayEvents = parsedEvents.some(event => event.date === today);
          if (hasTodayEvents) {
            setEvents(parsedEvents);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error('Fejl ved parsing af gemte events:', e);
        }
      }
      
      // Use mock data if nothing else available
      const mockEvents = [
        {
          id: 1,
          date: today,
          title: 'Møde med teamet',
          time: '10:00',
          type: 'meeting'
        },
        {
          id: 2,
          date: today,
          title: 'Lægeaftale',
          time: '14:30',
          type: 'appointment'
        },
        {
          id: 3,
          date: today,
          title: 'Fødselsdag',
          time: '18:00',
          type: 'event'
        }
      ];
      setEvents(mockEvents);
      localStorage.setItem('aiSpeaker_calendarEvents', JSON.stringify(mockEvents));
      setLoading(false);
    };
    
    loadEvents();
  }, []);
  
  // Filter events for today and find next event
  useEffect(() => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const filtered = events.filter(event => event.date === todayString);
    // Sort by time
    filtered.sort((a, b) => {
      const timeA = a.time.replace(':', '');
      const timeB = b.time.replace(':', '');
      return parseInt(timeA) - parseInt(timeB);
    });
    setTodayEvents(filtered);
    
    // Find next event (closest upcoming event)
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const upcoming = filtered.find(event => {
      const eventTime = parseInt(event.time.replace(':', ''));
      return eventTime >= currentTime;
    });
    
    // If no upcoming event today, use first event of the day
    setNextEvent(upcoming || filtered[0] || null);
  }, [events]);
  
  const getDayName = () => {
    const today = new Date();
    const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
    return dayNames[today.getDay()];
  };
  
  const getDateString = () => {
    const today = new Date();
    const day = today.getDate();
    const monthNames = [
      'januar', 'februar', 'marts', 'april', 'maj', 'juni',
      'juli', 'august', 'september', 'oktober', 'november', 'december'
    ];
    return `${day}. ${monthNames[today.getMonth()]}`;
  };
  
  const handleDayClick = () => {
    if (todayEvents.length > 0) {
      setIsExpanded(!isExpanded);
    }
  };
  
  return (
    <div className="ios-widget calendar-container">
      <div className="calendar-content">
        <div 
          className={`today-header ${todayEvents.length > 0 ? 'clickable' : ''} ${isExpanded ? 'expanded' : ''}`}
          onClick={handleDayClick}
        >
          <div className="today-date">
            <span className="day-name">{getDayName()}</span>
            <span className="date-string">{getDateString()}</span>
          </div>
          {todayEvents.length > 0 && (
            <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
          )}
        </div>
        
        {todayEvents.length > 0 ? (
          <div className={`today-events ${isExpanded ? 'expanded' : 'collapsed'}`}>
            {isExpanded ? (
              <div className="events-list">
                {todayEvents.map((event) => (
                  <div key={event.id} className="event-card">
                    <div className="event-time-badge">
                      {event.time}
                    </div>
                    <div className="event-content">
                      <div className="event-title">{event.title}</div>
                      <div className={`event-type-badge ${event.type}`}>
                        {event.type === 'meeting' && 'Møde'}
                        {event.type === 'appointment' && 'Aftale'}
                        {event.type === 'event' && 'Begivenhed'}
                        {event.type === 'deadline' && 'Deadline'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              nextEvent && (
                <div className="next-event-card">
                  <div className="event-time-badge">
                    {nextEvent.time}
                  </div>
                  <div className="event-content">
                    <div className="event-title">{nextEvent.title}</div>
                    <div className={`event-type-badge ${nextEvent.type}`}>
                      {nextEvent.type === 'meeting' && 'Møde'}
                      {nextEvent.type === 'appointment' && 'Aftale'}
                      {nextEvent.type === 'event' && 'Begivenhed'}
                      {nextEvent.type === 'deadline' && 'Deadline'}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="no-events">
            <div className="no-events-icon">📅</div>
            <p className="no-events-text">Ingen aftaler i dag</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;

