import React from 'react';
import { 
  Bell, 
  Search, 
  MessagesSquare,
  ChevronDown 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type HeaderProps = {
  title: string;
};

const Header = ({ title }: HeaderProps) => {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showMessages, setShowMessages] = React.useState(false);
  
  const notifications = [
    {
      id: 1,
      title: 'New Contest Available',
      description: 'Summer Sales Challenge has been published',
      time: '2 hours ago',
      unread: true,
    },
    {
      id: 2,
      title: 'Reward Claimed',
      description: 'Your reward claim has been approved',
      time: '1 day ago',
      unread: false,
    },
    {
      id: 3,
      title: 'Points Updated',
      description: '+250 points added for recent sales',
      time: '3 days ago',
      unread: false,
    },
  ];

  const messages = [
    {
      id: 1,
      sender: 'John Smith',
      content: 'Is the Q2 contest still active?',
      time: '1 hour ago',
      unread: true,
    },
    {
      id: 2,
      sender: 'Marketing Team',
      content: 'New promotional materials available',
      time: '1 day ago',
      unread: false,
    },
  ];

  const notificationsRef = React.useRef<HTMLDivElement>(null);
  const messagesRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (messagesRef.current && !messagesRef.current.contains(event.target as Node)) {
        setShowMessages(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
        
        <div className="hidden md:flex items-center relative">
          <div className="relative mx-4">
            <input
              type="text"
              placeholder="Search..."
              className="pl-9 pr-4 py-2 w-64 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowMessages(false);
              }}
            >
              <Bell size={20} />
              {notifications.some(n => n.unread) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="p-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        className={`p-3 border-b border-gray-100 hover:bg-gray-50 ${notification.unread ? 'bg-blue-50' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                            <p className="text-xs text-gray-600 mt-1">{notification.description}</p>
                          </div>
                          <span className="text-xs text-gray-500">{notification.time}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No notifications
                    </div>
                  )}
                </div>
                <div className="p-2 text-center border-t border-gray-200">
                  <button className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Messages */}
          <div className="relative" ref={messagesRef}>
            <button
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              onClick={() => {
                setShowMessages(!showMessages);
                setShowNotifications(false);
              }}
            >
              <MessagesSquare size={20} />
              {messages.some(m => m.unread) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            
            {showMessages && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="p-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold">Messages</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {messages.length > 0 ? (
                    messages.map((message) => (
                      <div 
                        key={message.id}
                        className={`p-3 border-b border-gray-100 hover:bg-gray-50 ${message.unread ? 'bg-blue-50' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{message.sender}</p>
                            <p className="text-xs text-gray-600 mt-1">{message.content}</p>
                          </div>
                          <span className="text-xs text-gray-500">{message.time}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No messages
                    </div>
                  )}
                </div>
                <div className="p-2 text-center border-t border-gray-200">
                  <button className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                    View all messages
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* User menu */}
          <div className="relative inline-block text-left">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-medium">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden md:block">
                <ChevronDown size={16} className="text-gray-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;