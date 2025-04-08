import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, TrendingUp, DollarSign, PiggyBank } from 'lucide-react';
import { ChatMessage, FinancialAnalysis } from '../types/chat';
import axios from 'axios';

interface ChatBotProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

const ChatBot: React.FC<ChatBotProps> = ({ isOpen, onClose, userId }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [analysis, setAnalysis] = useState<FinancialAnalysis | null>(null);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                role: 'assistant',
                content: 'Hello! I\'m your financial advisor. How can I help you today?',
                timestamp: new Date()
            }]);
        }
        scrollToBottom();
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('token');
            console.log("Hello Guys",token, userId);
            if (!token || !userId) {
                throw new Error('Not authenticated');
            }

            const response = await axios.post('/api/chatbot/chat', {
                message: input,
                userId
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: response.data.response,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);
            if (response.data.analysis) {
                setAnalysis(response.data.analysis);
            }
        } catch (error: any) {
            console.error('Error sending message:', error);
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: error.message === 'Not authenticated' ? 
                    'Please log in to use the chat feature.' : 
                    'Sorry, I encountered an error. Please try again.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="fixed bottom-20 right-4 w-96 bg-gray-900 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden border border-gray-800"
                        style={{ height: '500px' }}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Header */}
                        <div className="p-4 bg-gray-800/80 backdrop-blur-sm flex items-center justify-between border-b border-gray-700/50">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <MessageSquare className="w-5 h-5 text-blue-400" />
                                </div>
                                <h2 className="text-lg font-semibold text-white">Financial Advisor</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-4">
                            {messages.map((msg, index) => (
                                <motion.div
                                    key={index}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div
                                        className={`max-w-[80%] p-3 rounded-xl ${
                                            msg.role === 'user'
                                                ? 'bg-blue-600 text-white ml-4'
                                                : 'bg-gray-800/80 text-gray-100 mr-4 border border-gray-700/50'
                                        }`}
                                    >
                                        <p className="text-sm">{msg.content}</p>
                                        <span className="text-xs opacity-60 mt-1 block">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                            <div ref={messagesEndRef} />
                            {isLoading && (
                                <motion.div 
                                    className="flex justify-start"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <div className="bg-gray-800/80 p-3 rounded-xl border border-gray-700/50">
                                        <div className="flex space-x-2">
                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-gray-800/80 backdrop-blur-sm border-t border-gray-700/50">
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                                    placeholder="Ask about your finances..."
                                    className="w-full bg-gray-900/50 text-white rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700/50 placeholder-gray-500"
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={isLoading || !input.trim()}
                                    className="absolute right-2 p-2 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ChatBot;
