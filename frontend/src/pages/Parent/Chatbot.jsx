import React, { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaRobot, FaUser, FaSpinner } from 'react-icons/fa';
import API_URL from '../../config/api';
import { getAuthHeaders, removeToken } from '../../utils/auth';

const Chatbot = ({ user }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Xin chào! Tôi là trợ lý AI của EduConnect. Tôi có thể giúp bạn với các câu hỏi về thông tin học tập của con bạn, hoặc bất kỳ vấn đề nào khác. Bạn có thể hỏi tôi bất cứ điều gì!",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch avatar similar to Sidebar
  useEffect(() => {
    const fetchAvatar = async () => {
      if (user?.userId) {
        try {
          const res = await fetch(`${API_URL}/api/user-accounts/${user.userId}`, { headers: getAuthHeaders() });
          if (res.ok) {
            const data = await res.json();
            setAvatarUrl(data.avatarurl || null);
          }
        } catch (e) {
          setAvatarUrl(null);
        }
      }
    };
    fetchAvatar();
  }, [user?.userId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Call AI API
  const generateAIResponse = async (userMessage) => {
    try {
      const response = await fetch(`${API_URL}/api/chat-boxes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          messagetext: userMessage,
          parentId: user?.userId || 0
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Lấy đúng trường messagetext từ response mới (data.data.messagetext)
      return data?.data?.messagetext || "Xin lỗi, tôi không thể xử lý câu hỏi của bạn lúc này.";
    } catch (error) {
      console.error('Error calling AI API:', error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const aiResponse = await generateAIResponse(inputMessage);
      
      const aiMessage = {
        id: Date.now() + 1,
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error generating AI response:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "Xin lỗi, tôi gặp một số vấn đề kỹ thuật. Vui lòng thử lại sau.",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Send quick question instantly
  const handleSendMessageQuick = async (msg) => {
    if (!msg.trim()) return;
    const userMessage = {
      id: Date.now(),
      text: msg,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    try {
      const aiResponse = await generateAIResponse(msg);
      const aiMessage = {
        id: Date.now() + 1,
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        text: "Xin lỗi, tôi gặp một số vấn đề kỹ thuật. Vui lòng thử lại sau.",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Thêm hàm chuyển **...** thành <strong>...</strong>
  function boldBetweenStars(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <FaRobot className="text-white text-xl" />
          </div>
          <div className="ml-4">
            <h1 className="text-xl font-semibold text-gray-800">Trợ lý AI EduConnect</h1>
            <p className="text-sm text-gray-500">Luôn sẵn sàng hỗ trợ bạn 24/7</p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} items-center`}
          >
            <div className={`flex max-w-xs lg:max-w-md ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-center`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.sender === 'user' 
                  ? 'bg-blue-600 ml-2' 
                  : 'bg-gray-600 mr-2'
              }`}>
                {message.sender === 'user' ? (
                  avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-sm">
                      {user?.userName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )
                ) : (
                  <FaRobot className="text-white text-sm" />
                )}
              </div>

              {/* Message Bubble */}
              <div className={`px-4 py-2 rounded-lg relative ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-white text-gray-800 rounded-bl-none shadow-sm border border-gray-200'
              }`}>
                {message.sender === 'ai' ? (
                  <p
                    className="text-sm whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: boldBetweenStars(message.text) }}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                )}
                <p className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-blue-100' : 'text-gray-400'
                }`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex max-w-xs lg:max-w-md">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 mr-2 flex items-center justify-center">
                <FaRobot className="text-white text-sm" />
              </div>
              <div className="bg-white text-gray-800 rounded-lg rounded-bl-none shadow-sm border border-gray-200 px-4 py-2">
                <div className="flex items-center space-x-1">
                  <FaSpinner className="text-gray-400 text-sm animate-spin" />
                  <span className="text-sm text-gray-500">AI đang nhập...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập tin nhắn của bạn... (Nhấn Enter để gửi, Shift+Enter để xuống dòng)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="1"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className={`h-[44px] aspect-square flex items-center justify-center p-0 rounded-lg transition-colors duration-200 ${
              inputMessage.trim() && !isTyping
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <FaPaperPlane className="text-lg" />
          </button>
        </div>
        
        {/* Quick Actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            "Thông tin học tập",
            "Lịch học"
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => {
                setInputMessage("");
                handleSendMessageQuick(suggestion);
              }}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors duration-200"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
