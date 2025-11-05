import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';
import { FingerprintUtil } from '../../utils/fingerprint.util';
import { SoundService } from '../../services/sound.service';
import { BRAND_CONFIG } from '../../../core/constants/brand';

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
  soundEnabled = signal(true);
  
  // Форма
  newMessage = '';
  clientName = '';
  clientEmail = '';
  clientPhone = '';
  
  // WebSocket
  private socket: Socket | null = null;
  private readonly API_URL = 'https://car-api-production.up.railway.app'; // Railway API URL
  
  // Fingerprint
  private fingerprintUtil = FingerprintUtil.getInstance();
  private userFingerprint: string | null = null;
  
  // Sound
  private soundService = inject(SoundService);
  
  // Debounce для обновления данных сессии
  private updateSessionTimeout: any = null;
  
  // Brand config для логотипа
  protected readonly brand = BRAND_CONFIG;
  
  // Дефолтные данные админа
  protected readonly defaultAdminName = 'Поддержка';
  protected readonly defaultAdminAvatar = 'П';
  
  async ngOnInit() {
    await this.initializeFingerprint();
    this.loadUserData();
    this.checkSoundSettings();
    await this.initializeChat();
  }
  
  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.stopMessagePolling();
    // Очищаем debounce таймаут
    if (this.updateSessionTimeout) {
      clearTimeout(this.updateSessionTimeout);
    }
  }
  
  private async initializeFingerprint() {
    try {
      // Сначала проверяем сохраненный фингерпринт
      this.userFingerprint = this.fingerprintUtil.getStoredFingerprint();
      
      if (!this.userFingerprint) {
        // Генерируем новый фингерпринт
        this.userFingerprint = await this.fingerprintUtil.generateFingerprint();
        this.fingerprintUtil.storeFingerprint(this.userFingerprint);
        console.log('New fingerprint generated:', this.userFingerprint);
      } else {
        console.log('Using stored fingerprint:', this.userFingerprint);
      }
    } catch (error) {
      console.error('Error initializing fingerprint:', error);
      // Fallback - используем случайный ID
      this.userFingerprint = 'fp_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      this.fingerprintUtil.storeFingerprint(this.userFingerprint);
    }
  }

  private async initializeChat() {
    // Сначала проверяем, есть ли активные сессии
    await this.checkForActiveSessions();
    
    // Если нет активных сессий, создаем новую
    if (!this.currentSession()) {
      this.createChatSession();
    }
  }
  
  private loadUserData() {
    // Загружаем сохраненные данные пользователя
    const savedName = localStorage.getItem('chat_user_name');
    const savedEmail = localStorage.getItem('chat_user_email');
    const savedPhone = localStorage.getItem('chat_user_phone');
    const savedSessionId = localStorage.getItem('chat_session_id');
    
    if (savedName) this.clientName = savedName;
    if (savedEmail) this.clientEmail = savedEmail;
    if (savedPhone) this.clientPhone = savedPhone;
    
    // Если есть сохраненная сессия, пытаемся её использовать
    if (savedSessionId) {
      this.checkExistingSession(savedSessionId);
    }
  }
  
  private saveUserData() {
    // Сохраняем данные пользователя
    if (this.clientName) localStorage.setItem('chat_user_name', this.clientName);
    if (this.clientEmail) localStorage.setItem('chat_user_email', this.clientEmail);
    if (this.clientPhone) localStorage.setItem('chat_user_phone', this.clientPhone);
    
    // Сохраняем ID сессии
    const session = this.currentSession();
    if (session) {
      localStorage.setItem('chat_session_id', session.sessionId);
    }
  }

  // Обновляем данные пользователя в сессии с debouncing
  private updateSessionUserData(immediate: boolean = false) {
    const session = this.currentSession();
    if (!session || (!this.clientName && !this.clientEmail && !this.clientPhone)) {
      return;
    }
    
    // Очищаем предыдущий таймаут
    if (this.updateSessionTimeout) {
      clearTimeout(this.updateSessionTimeout);
    }
    
    // Обновляем данные в localStorage сразу
    this.saveUserData();
    
    // Если нужно обновить немедленно (например, перед отправкой сообщения)
    if (immediate) {
      this.updateSessionUserDataRequest(session.sessionId);
      return;
    }
    
    // Debounce: обновляем на сервере через 1 секунду после последнего изменения
    this.updateSessionTimeout = setTimeout(() => {
      this.updateSessionUserDataRequest(session.sessionId);
    }, 1000);
  }
  
  private updateSessionUserDataRequest(sessionId: string) {
    fetch(`${this.API_URL}/chat/session/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: this.clientName?.trim(),
        clientEmail: this.clientEmail?.trim(),
        clientPhone: this.clientPhone?.trim()
      })
    }).then(response => {
      if (response.ok) {
        console.log('Session data updated successfully');
      }
    }).catch(error => {
      console.error('Error updating session data:', error);
    });
  }
  
  private async checkForActiveSessions() {
    try {
      console.log('Checking for active sessions...');
      
      // Проверяем сохраненную сессию в localStorage
      const savedSessionId = localStorage.getItem('chat_session_id');
      if (savedSessionId) {
        console.log('Found saved session ID:', savedSessionId);
        const sessionExists = await this.checkExistingSession(savedSessionId);
        if (sessionExists) {
          return; // Сессия найдена и активна
        }
      }
      
      // Если нет сохраненной сессии или она неактивна, создаем новую
      console.log('No active session found, will create new one');
    } catch (error) {
      console.error('Error checking for active sessions:', error);
    }
  }

  private async loadUserChatHistory() {
    if (!this.userFingerprint) return;
    
    try {
      console.log('Loading chat history for fingerprint:', this.userFingerprint);
      const response = await fetch(`${this.API_URL}/chat/history/${this.userFingerprint}`);
      const history = await response.json();
      
      if (history.user && history.messages && history.messages.length > 0) {
        console.log('Chat history loaded:', {
          user: history.user.id,
          messagesCount: history.messages.length,
          sessionsCount: history.sessions.length
        });
        
        // Загружаем сообщения в чат
        this.messages.set(history.messages);
        
        // Если есть активная сессия, используем её
        const activeSession = history.sessions.find((s: any) => s.isActive);
        if (activeSession) {
          this.currentSession.set(activeSession);
          this.connectToChat(activeSession.sessionId);
        }
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }

  private async checkExistingSession(sessionId: string): Promise<boolean> {
    try {
      console.log('Checking existing session:', sessionId);
      const response = await fetch(`${this.API_URL}/chat/session/${sessionId}`);
      const session = await response.json();
      
      if (session && session.isActive) {
        console.log('Using existing session:', session);
        this.currentSession.set(session);
        this.connectToChat(sessionId);
        // Загружаем сообщения для существующей сессии
        this.loadMessages(sessionId);
        return true;
      } else {
        console.log('Session is not active, will create new one');
        return false;
      }
    } catch (error) {
      console.log('Session not found, will create new one');
      return false;
    }
  }
  
  private createChatSession() {
    const sessionId = this.generateSessionId();
    const sessionData: Partial<ChatSession> = {
      sessionId,
      projectSource: 'car-market-client',
      isActive: true,
      clientName: this.clientName,
      clientEmail: this.clientEmail,
      clientPhone: this.clientPhone
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
      this.saveUserData(); // Сохраняем данные пользователя
      this.connectToChat(sessionId);
      // Загружаем сообщения для новой сессии
      this.loadMessages(sessionId);
      console.log('New session created and connected:', sessionId);
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
    console.log('Connecting to chat server with sessionId:', sessionId);
    this.socket = io(this.API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000
    });
    
    this.socket.on('connect', () => {
      console.log('Connected to chat server');
      this.isConnected.set(true);
      
      // Останавливаем polling при подключении WebSocket
      this.stopMessagePolling();
      
      // Присоединяемся к сессии
      this.socket?.emit('join-session', {
        sessionId,
        userType: 'client'
      });
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      this.isConnected.set(false);
      // Запускаем polling только когда WebSocket отключен
      this.startMessagePolling(sessionId);
    });
    
    this.socket.on('reconnect', () => {
      console.log('Reconnected to chat server');
      this.isConnected.set(true);
      // Останавливаем polling при переподключении
      this.stopMessagePolling();
    });
    
    this.socket.on('new-message', (message: ChatMessage) => {
      console.log('Received new message:', message);
      this.messages.update(messages => [...messages, message]);
      this.scrollToBottom();
      
      // Воспроизводим звук только для сообщений от админа
      if (message.senderType === 'admin') {
        this.soundService.playMessageSound();
      }
    });
    
    this.socket.on('user-typing', (data: { userType: string; isTyping: boolean }) => {
      if (data.userType === 'admin') {
        this.isTyping.set(data.isTyping);
      }
    });
    
    this.socket.on('error', (error: any) => {
      console.error('Chat error:', error);
    });

    // Загружаем существующие сообщения только один раз при подключении
    this.loadMessages(sessionId);
    
    // Polling будет запущен автоматически только при disconnect
  }
  
  toggleChat() {
    this.isOpen.update(open => !open);
    if (this.isOpen()) {
      this.scrollToBottom();
    }
  }
  
  sendMessage() {
    if (!this.newMessage.trim()) return;
    
    // Проверяем обязательные поля
    if (!this.clientName?.trim()) {
      alert('Пожалуйста, введите ваше имя');
      return;
    }
    
    if (!this.clientPhone?.trim()) {
      alert('Пожалуйста, введите ваш номер телефона');
      return;
    }
    
    const session = this.currentSession();
    if (!session) {
      console.log('No current session available');
      return;
    }
    
    console.log('Sending message with session:', session);
    
    // Сохраняем данные пользователя
    this.saveUserData();
    
    // Обновляем данные пользователя в сессии немедленно (перед отправкой сообщения)
    this.updateSessionUserData(true);
    
    const messageText = this.newMessage.trim();
    const messageData = {
      sessionId: session.sessionId,
      message: messageText,
      senderType: 'client' as const,
      clientName: this.clientName.trim(),
      clientEmail: this.clientEmail?.trim() || '',
      clientPhone: this.clientPhone.trim(),
      projectSource: 'car-market-client'
    };
    
    // Очищаем поле ввода
    this.newMessage = '';
    
    // Воспроизводим звук отправки
    this.soundService.playSendSound();
    
    // Отправляем через WebSocket если доступен
    if (this.socket && this.socket.connected) {
      console.log('Sending via WebSocket:', messageData);
      this.socket.emit('send-message', messageData);
      // WebSocket вернет сообщение через событие 'new-message'
    } else {
      console.log('WebSocket not available, using HTTP fallback');
      // Fallback - добавляем сообщение мгновенно и отправляем через HTTP
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
      // Fallback - отправляем через HTTP
      console.log('Sending HTTP request to:', `${this.API_URL}/chat/message`);
      console.log('Request data:', JSON.stringify(messageData, null, 2));
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

  private getClientIP(): string {
    // Простой способ получения IP (может не работать в некоторых случаях)
    return 'unknown';
  }

  private pollingInterval: any = null;

  private startMessagePolling(sessionId: string) {
    // Не запускаем polling если WebSocket подключен
    if (this.isConnected()) {
      return;
    }
    
    // Очищаем предыдущий интервал если есть
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    // Обновляем сообщения каждые 10 секунд (реже, так как это fallback)
    this.pollingInterval = setInterval(() => {
      // Если WebSocket подключился, останавливаем polling
      if (this.isConnected()) {
        this.stopMessagePolling();
        return;
      }
      console.log('Polling for new messages (WebSocket offline)...');
      this.loadMessages(sessionId, true); // silent mode для polling
    }, 10000); // Увеличил интервал до 10 секунд
  }

  private stopMessagePolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Управление звуком
  toggleSound() {
    const newState = this.soundService.toggleSound();
    this.soundEnabled.set(newState);
  }

  // Проверить настройки звука при инициализации
  private checkSoundSettings() {
    this.soundEnabled.set(this.soundService.isSoundEnabled());
  }

  // Автоматическое сохранение при изменении данных
  onNameChange() {
    this.saveUserData();
    // Обновляем на сервере с debouncing
    this.updateSessionUserData();
  }

  onPhoneChange() {
    this.saveUserData();
    // Обновляем на сервере с debouncing
    this.updateSessionUserData();
  }

  onEmailChange() {
    this.saveUserData();
    // Обновляем на сервере с debouncing
    this.updateSessionUserData();
  }
  
  private loadMessages(sessionId: string, silent: boolean = false) {
    if (!silent) {
      console.log('Loading messages for session:', sessionId);
    }
    fetch(`${this.API_URL}/chat/messages/${sessionId}`)
      .then(response => {
        if (!silent) {
          console.log('Messages response status:', response.status);
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(messages => {
        if (!silent) {
          console.log('Loaded messages:', messages);
        }
        
        const currentMessages = this.messages();
        
        // Проверяем, есть ли новые сообщения
        const newMessages = messages.filter((msg: ChatMessage) => 
          !currentMessages.some(current => current.id === msg.id)
        );
        
        // Если нет новых сообщений, не обновляем массив (предотвращаем перерисовку)
        if (newMessages.length === 0 && currentMessages.length > 0) {
          return; // Выходим, ничего не меняя
        }
        
        // Проверяем, есть ли новые сообщения от админа
        const newAdminMessages = newMessages.filter((msg: ChatMessage) => 
          msg.senderType === 'admin'
        );
        
        // Воспроизводим звук для новых сообщений от админа
        if (newAdminMessages.length > 0) {
          this.soundService.playMessageSound();
        }
        
        // Если это первая загрузка (нет сообщений), устанавливаем все сообщения
        if (currentMessages.length === 0) {
          this.messages.set(messages);
        } else {
          // Иначе добавляем только новые сообщения (без дублирования)
          this.messages.update(messages => {
            const existingIds = new Set(messages.map((m: ChatMessage) => m.id));
            const toAdd = newMessages.filter((m: ChatMessage) => m.id && !existingIds.has(m.id));
            return [...messages, ...toAdd].sort((a, b) => {
              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return dateA - dateB;
            });
          });
        }
        
        this.scrollToBottom();
      })
      .catch(error => {
        if (!silent) {
          console.error('Error loading messages:', error);
          console.error('Error details:', error.message);
        }
        // Не очищаем сообщения при ошибке, если они уже есть
        if (this.messages().length === 0) {
          this.messages.set([]);
        }
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
  
  // Получить логотип компании (первые буквы)
  getBrandLogo(): string {
    const words = this.brand.shortName.split(' ');
    if (words.length >= 2) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    return this.brand.shortName.substring(0, 2).toUpperCase();
  }
}
