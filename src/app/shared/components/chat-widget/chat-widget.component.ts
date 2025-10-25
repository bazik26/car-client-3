import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';

interface ChatMessage {
  id?: number;
  sessionId: string;
  message: string;
  senderType: 'client' | 'admin';
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  adminId?: number;
  isRead?: boolean;
  createdAt?: Date;
}

interface ChatSession {
  id?: number;
  sessionId: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  projectSource: string;
  isActive?: boolean;
  assignedAdminId?: number;
  lastMessageAt?: Date;
  unreadCount?: number;
  createdAt?: Date;
}

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.scss'
})
export class ChatWidgetComponent implements OnInit, OnDestroy {
  // Состояние чата
  isOpen = signal(false);
  isConnected = signal(false);
  isTyping = signal(false);
  messages = signal<ChatMessage[]>([]);
  currentSession = signal<ChatSession | null>(null);
  
  // Форма
  newMessage = '';
  clientName = '';
  clientEmail = '';
  clientPhone = '';
  
  // WebSocket
  private socket: Socket | null = null;
  private readonly API_URL = 'https://car-api-production.up.railway.app'; // Railway API URL
  
  ngOnInit() {
    this.initializeChat();
  }
  
  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
  
  private initializeChat() {
    // Создаем сессию чата
    this.createChatSession();
  }
  
  private createChatSession() {
    const sessionId = this.generateSessionId();
    const sessionData: Partial<ChatSession> = {
      sessionId,
      projectSource: 'car-market-client',
      isActive: true
    };
    
    // Создаем сессию через API
    console.log('Creating session with data:', sessionData);
    console.log('API URL:', `${this.API_URL}/chat/session`);
    
    fetch(`${this.API_URL}/chat/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionData)
    })
    .then(response => {
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(session => {
      console.log('Session created successfully:', session);
      this.currentSession.set(session);
      this.connectToChat(sessionId);
    })
    .catch(error => {
      console.error('Error creating session:', error);
      console.log('Falling back to local session');
      // Fallback - создаем локальную сессию
      this.currentSession.set({
        sessionId,
        projectSource: 'car-market-client',
        isActive: true,
        createdAt: new Date()
      } as ChatSession);
      this.connectToChat(sessionId);
    });
  }
  
  private connectToChat(sessionId: string) {
    this.socket = io(this.API_URL, {
      transports: ['websocket', 'polling']
    });
    
    this.socket.on('connect', () => {
      console.log('Connected to chat server');
      this.isConnected.set(true);
      
      // Присоединяемся к сессии
      this.socket?.emit('join-session', {
        sessionId,
        userType: 'client'
      });
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      this.isConnected.set(false);
    });
    
    this.socket.on('new-message', (message: ChatMessage) => {
      console.log('Received new message:', message);
      this.messages.update(messages => [...messages, message]);
      this.scrollToBottom();
    });
    
    this.socket.on('user-typing', (data: { userType: string; isTyping: boolean }) => {
      if (data.userType === 'admin') {
        this.isTyping.set(data.isTyping);
      }
    });
    
    this.socket.on('error', (error: any) => {
      console.error('Chat error:', error);
    });

    // Загружаем существующие сообщения
    this.loadMessages(sessionId);
  }
  
  toggleChat() {
    this.isOpen.update(open => !open);
    if (this.isOpen()) {
      this.scrollToBottom();
    }
  }
  
  sendMessage() {
    if (!this.newMessage.trim()) return;
    
    const session = this.currentSession();
    if (!session) return;
    
    const messageText = this.newMessage.trim();
    const messageData = {
      sessionId: session.sessionId,
      message: messageText,
      senderType: 'client' as const,
      clientName: this.clientName || 'Аноним',
      clientEmail: this.clientEmail,
      clientPhone: this.clientPhone,
      projectSource: 'car-market-client'
    };
    
    // Сначала добавляем сообщение в интерфейс для мгновенного отображения
    const tempMessage = {
      id: Date.now(), // временный ID
      sessionId: session.sessionId,
      message: messageText,
      senderType: 'client' as const,
      clientName: this.clientName || 'Аноним',
      clientEmail: this.clientEmail,
      clientPhone: this.clientPhone,
      createdAt: new Date(),
      isRead: false
    };
    
    this.messages.update(messages => [...messages, tempMessage]);
    this.scrollToBottom();
    
    // Очищаем поле ввода
    this.newMessage = '';
    
    // Отправляем через WebSocket если доступен
    if (this.socket) {
      this.socket.emit('send-message', messageData);
    } else {
      // Fallback - отправляем через HTTP
      fetch(`${this.API_URL}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData)
      })
      .then(response => {
        console.log('HTTP response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(message => {
        console.log('Message sent via HTTP:', message);
        // Заменяем временное сообщение на реальное
        this.messages.update(messages => {
          const filtered = messages.filter(m => m.id !== tempMessage.id);
          return [...filtered, message];
        });
        this.scrollToBottom();
      })
      .catch(error => {
        console.error('Error sending message:', error);
        console.error('Error details:', error.message);
        // Удаляем временное сообщение при ошибке
        this.messages.update(messages => messages.filter(m => m.id !== tempMessage.id));
        // Показываем уведомление об ошибке
        alert('Ошибка отправки сообщения. Попробуйте еще раз.');
      });
    }
  }
  
  onTyping() {
    if (!this.socket) return;
    
    const session = this.currentSession();
    if (!session) return;
    
    this.socket.emit('typing', {
      sessionId: session.sessionId,
      userType: 'client',
      isTyping: true
    });
    
    // Останавливаем индикатор набора через 1 секунду
    setTimeout(() => {
      this.socket?.emit('typing', {
        sessionId: session.sessionId,
        userType: 'client',
        isTyping: false
      });
    }, 1000);
  }
  
  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }
  
  private loadMessages(sessionId: string) {
    console.log('Loading messages for session:', sessionId);
    fetch(`${this.API_URL}/chat/messages/${sessionId}`)
      .then(response => {
        console.log('Messages response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(messages => {
        console.log('Loaded messages:', messages);
        this.messages.set(messages);
        this.scrollToBottom();
      })
      .catch(error => {
        console.error('Error loading messages:', error);
        console.error('Error details:', error.message);
        // Устанавливаем пустой массив при ошибке
        this.messages.set([]);
      });
  }

  private scrollToBottom() {
    setTimeout(() => {
      const chatMessages = document.querySelector('.chat-messages');
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }, 100);
  }
  
  formatTime(date: Date | string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
}
