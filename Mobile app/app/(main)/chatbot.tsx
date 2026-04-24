import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseService } from '../../services/firebaseService';
import { geminiService } from '../../services/geminiService';
import { RootState } from '../../store';

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
};

type ChatSession = {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
  messages: Message[];
};

export default function ChatbotScreen() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [medications, setMedications] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Build smart questions based on user profile
  const smartQuestions = useMemo(() => {
    const questions: { text: string; icon: string }[] = [];
    
    if (medications.length > 0) {
      const medNames = medications.slice(0, 2).map(m => m.name).join(' and ');
      questions.push({ text: `Tell me about ${medNames}`, icon: '💊' });
      if (medications.length >= 2) {
        questions.push({ text: `Can I take my medications together?`, icon: '⚠️' });
      }
    }

    if (user?.medicalSummary?.allergies?.length > 0) {
      questions.push({ text: `What should I avoid with my ${user.medicalSummary.allergies[0]} allergy?`, icon: '🚫' });
    }

    if (user?.medicalSummary?.chronicConditions?.length > 0) {
      questions.push({ text: `Tips for managing ${user.medicalSummary.chronicConditions[0]}`, icon: '📋' });
    }

    // Default fallbacks
    if (questions.length < 4) {
      const defaults = [
        { text: 'What are common side effects of my medications?', icon: '💡' },
        { text: 'What if I miss a dose?', icon: '⏰' },
        { text: 'Tips for medication adherence', icon: '✅' },
        { text: 'How should I store my medications?', icon: '🏠' },
      ];
      for (const d of defaults) {
        if (questions.length >= 4) break;
        if (!questions.some(q => q.text === d.text)) questions.push(d);
      }
    }

    return questions.slice(0, 4);
  }, [medications, user]);

  const SESSIONS_KEY = `dosebuddy_sessions_${user?.id || 'guest'}`;
  const MAX_SESSIONS = 10;

  useEffect(() => {
    loadSessions();
    loadChatHistory();
    loadUserMedications();
    
    if (messages.length === 0) {
      const firstName = user?.personalInfo?.firstName || '';
      const greeting: Message = {
        id: '1',
        text: `Hello${firstName ? ' ' + firstName : ''}! 👋\n\nI'm DoseBuddy, your personal health assistant. I know your medications and health profile, so I can give you personalized answers.\n\nHow can I help you today?`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([greeting]);
    }
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribe = firebaseService.subscribeToMedications(user.id, (meds) => {
        setMedications(meds);
      });
      return () => unsubscribe();
    }
  }, [user]);

  // --- AsyncStorage Session Management ---
  const loadSessions = async () => {
    try {
      const stored = await AsyncStorage.getItem(SESSIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored).map((s: any) => ({
          ...s,
          timestamp: new Date(s.timestamp),
          messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
        }));
        setChatSessions(parsed);
      }
    } catch (e) {
      console.error('Error loading sessions:', e);
    }
  };

  const saveSessions = async (sessions: ChatSession[]) => {
    try {
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error('Error saving sessions:', e);
    }
  };

  const saveCurrentAsSession = async () => {
    // Only save if there are user messages (not just the greeting)
    const hasUserMessages = messages.some(m => m.isUser);
    if (!hasUserMessages) return;

    const firstUserMsg = messages.find(m => m.isUser);
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: firstUserMsg ? firstUserMsg.text.slice(0, 45) + (firstUserMsg.text.length > 45 ? '...' : '') : 'Chat',
      preview: `${messages.filter(m => m.isUser).length} questions • ${messages.length} messages`,
      timestamp: new Date(),
      messages: [...messages],
    };

    const updated = [newSession, ...chatSessions].slice(0, MAX_SESSIONS);
    setChatSessions(updated);
    await saveSessions(updated);
  };

  const loadChatHistory = async () => {
    if (!user) return;
    
    try {
      const history = await firebaseService.getChatHistory(user.id);
      if (history.length > 0) {
        const loadedMessages = history.map((msg: any) => ({
          id: msg.id,
          text: msg.text || '',
          isUser: msg.isUser || false,
          timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp)
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const loadUserMedications = async () => {
    if (!user) return;
    
    try {
      const meds = await firebaseService.getUserMedications(user.id);
      setMedications(meds);
    } catch (error) {
      console.error('Error loading medications:', error);
    }
  };

  const handleSendMessage = async () => {
    if (inputText.trim() === '' || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      await firebaseService.addChatMessage(user.id, userMessage);
    } catch (error) {
      console.error('Error saving message:', error);
    }

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await geminiService.chat(
        inputText,
        messages.slice(-10),
        medications,
        user
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      await firebaseService.addChatMessage(user.id, aiMessage);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to get response');
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInputText(question);
    setTimeout(() => handleSendMessage(), 100);
  };

  const handleNewChat = async () => {
    // Save current chat as a session before starting new
    await saveCurrentAsSession();

    // Clear Firestore chat history for fresh start
    if (user) {
      await firebaseService.clearChatHistory(user.id);
    }

    const firstName = user?.personalInfo?.firstName || '';
    setMessages([{
      id: '1',
      text: `Hello${firstName ? ' ' + firstName : ''}! 👋\n\nStarting a new conversation. How can I help you?`,
      isUser: false,
      timestamp: new Date(),
    }]);
  };

  const handleLoadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setShowHistory(false);
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Chat History',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            if (user) {
              await firebaseService.clearChatHistory(user.id);
              await AsyncStorage.removeItem(SESSIONS_KEY);
              setChatSessions([]);
              const firstName = user?.personalInfo?.firstName || '';
              setMessages([{
                id: '1',
                text: `Hello${firstName ? ' ' + firstName : ''}! 👋\n\nHow can I assist you today?`,
                isUser: false,
                timestamp: new Date(),
              }]);
            }
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.headerLogo}>
            <Ionicons name="fitness" size={18} color="white" />
          </View>
          <View>
            <Text style={styles.title}>DoseBuddy</Text>
            <Text style={{ fontSize: 12, color: '#888' }}>
              {medications.length > 0 ? `Tracking ${medications.length} medication${medications.length !== 1 ? 's' : ''}` : 'Health Assistant'}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.headerBtn}>
            <Ionicons name="time-outline" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNewChat} style={styles.headerBtn}>
            <Ionicons name="add-circle-outline" size={20} color="#2E8B57" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClearHistory} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.isUser ? styles.userBubble : styles.aiBubble,
            ]}
          >
            {!message.isUser && (
              <View style={styles.aiAvatar}>
                <Ionicons name="fitness" size={16} color="white" />
              </View>
            )}
            <View style={[
              styles.messageContent,
              message.isUser ? styles.userMessageContent : styles.aiMessageContent
            ]}>
              <Text style={[
                styles.messageText,
                message.isUser ? styles.userText : styles.aiText,
              ]}>
                {message.text}
              </Text>
              <Text style={styles.timestamp}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        ))}

        {isTyping && (
          <View style={[styles.messageBubble, styles.aiBubble]}>
            <View style={styles.aiAvatar}>
              <Ionicons name="fitness" size={16} color="white" />
            </View>
            <View style={styles.typingIndicator}>
              <View style={styles.typingDot} />
              <View style={[styles.typingDot, styles.typingDotDelay1]} />
              <View style={[styles.typingDot, styles.typingDotDelay2]} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Smart Question Cards (only when chat is fresh) */}
      {messages.length <= 1 && !isTyping && (
        <View style={styles.smartCards}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {smartQuestions.map((q, index) => (
              <TouchableOpacity
                key={index}
                style={styles.smartCard}
                onPress={() => handleQuickQuestion(q.text)}
              >
                <Text style={styles.smartCardIcon}>{q.icon}</Text>
                <Text style={styles.smartCardText}>{q.text}</Text>
                <Ionicons name="arrow-forward" size={14} color="#2E8B57" style={{ marginTop: 4 }} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Quick Questions (below chat, always available) */}
      {messages.length <= 1 && !isTyping && (
        <View style={styles.quickQuestions}>
          <Text style={styles.quickQuestionsTitle}>Quick Questions</Text>
          {['What are my current medications?', 'How should I take my medications?', 'What are common side effects?', 'Can I take these together?', 'What if I miss a dose?'].map((question, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickQuestion}
              onPress={() => handleQuickQuestion(question)}
            >
              <Text style={styles.quickQuestionText}>{question}</Text>
              <Ionicons name="arrow-forward" size={16} color="#2E8B57" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask about your medications..."
          placeholderTextColor="#999"
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[styles.sendButton, (!inputText.trim() || isTyping) && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || isTyping}
        >
          {isTyping ? (
            <ActivityIndicator size="small" color="#2E8B57" />
          ) : (
            <Ionicons 
              name="send" 
              size={20} 
              color={inputText.trim() ? '#2E8B57' : '#ccc'} 
            />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.disclaimer}>
        <Ionicons name="information-circle" size={16} color="#FFA500" />
        <Text style={styles.disclaimerText}>
          AI assistant for general information. Always consult healthcare professionals.
        </Text>
      </View>

      {/* Previous Chats Modal */}
      <Modal visible={showHistory} transparent animationType="slide" onRequestClose={() => setShowHistory(false)}>
        <View style={styles.historyOverlay}>
          <View style={styles.historyPanel}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Previous Chats</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {chatSessions.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
                  <Text style={{ color: '#999', marginTop: 12, fontSize: 14 }}>No previous chats yet</Text>
                  <Text style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>Your conversations will appear here</Text>
                </View>
              ) : (
                chatSessions.map((session) => (
                  <TouchableOpacity
                    key={session.id}
                    style={styles.sessionCard}
                    onPress={() => handleLoadSession(session)}
                  >
                    <View style={styles.sessionIcon}>
                      <Ionicons name="chatbubble" size={18} color="#2E8B57" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sessionTitle} numberOfLines={1}>{session.title}</Text>
                      <Text style={styles.sessionMeta}>
                        {session.preview} • {session.timestamp.toLocaleDateString()}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#ccc" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2E8B57',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  headerBtn: {
    padding: 6,
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 20,
    paddingBottom: 10,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 15,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  aiBubble: {
    alignSelf: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2E8B57',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageContent: {
    padding: 12,
    borderRadius: 18,
  },
  userMessageContent: {
    backgroundColor: '#2E8B57',
  },
  aiMessageContent: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flex: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: 'white',
  },
  aiText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  typingIndicator: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 18,
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E8B57',
    opacity: 0.4,
  },
  typingDotDelay1: {
    animationDelay: '0.2s',
  },
  typingDotDelay2: {
    animationDelay: '0.4s',
  },
  // Smart cards
  smartCards: {
    paddingVertical: 10,
  },
  smartCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    width: 160,
    borderWidth: 1,
    borderColor: '#E8F5E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  smartCardIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  smartCardText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    lineHeight: 18,
  },
  // Quick questions
  quickQuestions: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  quickQuestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  quickQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  quickQuestionText: {
    fontSize: 14,
    color: '#2E8B57',
    flex: 1,
  },
  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 25,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sendButton: {
    padding: 8,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 10,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#856404',
    lineHeight: 16,
  },
  // History panel
  historyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  historyPanel: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '75%',
    minHeight: 400,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
    gap: 12,
  },
  sessionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  sessionMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});