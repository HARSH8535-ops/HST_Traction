
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Notification as NotificationType } from '../types';

interface NotificationContextType {
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);

  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div 
            key={n.id} 
            className={`pointer-events-auto min-w-[300px] max-w-sm p-4 rounded-xl shadow-2xl backdrop-blur-md border animate-in slide-in-from-right-full duration-300 flex items-start gap-3 ${
              n.type === 'success' ? 'bg-emerald-900/80 border-emerald-500/50 text-emerald-100' :
              n.type === 'error' ? 'bg-red-900/80 border-red-500/50 text-red-100' :
              'bg-blue-900/80 border-blue-500/50 text-blue-100'
            }`}
          >
             <div className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center ${
                n.type === 'success' ? 'bg-emerald-500 text-emerald-950' :
                n.type === 'error' ? 'bg-red-500 text-red-950' :
                'bg-blue-500 text-blue-950'
             }`}>
               {n.type === 'success' && '✓'}
               {n.type === 'error' && '!'}
               {n.type === 'info' && 'i'}
             </div>
             <p className="text-sm font-medium leading-tight">{n.message}</p>
             <button onClick={() => removeNotification(n.id)} className="ml-auto text-white/50 hover:text-white">
               ×
             </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
