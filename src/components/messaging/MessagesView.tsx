/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { messageApi, userApi } from '../../services/api';
import { UserProfile, Conversation } from '../../types';
import {
  Search,
  Send,
  Paperclip,
  MoreVertical,
  ShieldAlert,
  UserX,
  FileText,
  CheckCheck,
  Loader2,
  X,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export const MessagesView: React.FC = () => {
  const {
    currentUser,
    users,
    conversations,
    messages,
    sendMessage,
    markConversationAsRead,
    loadMessagesForConversation,
    refreshConversations,
    blockUser,
  } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<UserProfile | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Composer state
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Refresh conversations from MongoDB Atlas on mount
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Live Teacher Search via MongoDB Atlas backend
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    const timeoutId = setTimeout(async () => {
      try {
        // Query backend for real registered teachers from MongoDB
        const res = await messageApi.searchTeachers(trimmed);
        if (res.success && Array.isArray(res.data)) {
          // Strictly exclude current user and ensure only teachers are returned
          const filtered = res.data.filter(
            (u: any) => u.id !== currentUser?.id && u.role === 'teacher'
          );
          setSearchResults(filtered);
        } else {
          // Fallback to userApi query
          const userRes = await userApi.getUsers({ role: 'teacher', search: trimmed });
          if (userRes.success && Array.isArray(userRes.data)) {
            const filtered = userRes.data.filter(
              (u: any) => u.id !== currentUser?.id && u.role === 'teacher'
            );
            setSearchResults(filtered);
          } else {
            setSearchResults([]);
          }
        }
      } catch (err: any) {
        console.warn('[Messages] Search teachers error:', err);
        setSearchError('Could not query teachers. Please try again.');
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, currentUser?.id]);

  // If a ?user= parameter is passed, select or initialize conversation
  useEffect(() => {
    const targetUserId = searchParams.get('user');
    if (targetUserId && currentUser) {
      const existingConv = conversations.find(
        (c) =>
          c.participantIds.includes(currentUser.id) && c.participantIds.includes(targetUserId)
      );
      if (existingConv) {
        setActiveConversationId(existingConv.id);
        const other = users.find((u) => u.id === targetUserId);
        if (other) setSelectedRecipient(other);
      } else {
        const target = users.find((u) => u.id === targetUserId);
        if (target) {
          setSelectedRecipient(target);
          setActiveConversationId(null);
        }
      }
    }
  }, [searchParams, currentUser, conversations, users]);

  // Conversations involving current user
  const userConversations = currentUser
    ? conversations.filter((c) => c.participantIds.includes(currentUser.id))
    : [];

  // Helper to resolve the other participant in a conversation
  const resolveOtherParticipant = (conv: Conversation): UserProfile | null => {
    if (!currentUser) return null;
    const otherId = conv.participantIds.find((id) => id !== currentUser.id);
    if (!otherId) return null;

    // 1. Check local users cache
    const fromUsers = users.find((u) => u.id === otherId);
    if (fromUsers) return fromUsers;

    // 2. Check populated participants in conversation object
    const fromParticipants = conv.participants?.find((p: any) => (p._id?.toString() || p.id) === otherId);
    if (fromParticipants) {
      return {
        id: fromParticipants._id?.toString() || fromParticipants.id || otherId,
        name: fromParticipants.name || 'Member',
        email: fromParticipants.email || '',
        role: fromParticipants.role || 'teacher',
        avatarUrl: fromParticipants.avatarUrl || '',
        avatarBgColor: fromParticipants.avatarBgColor || '#059669',
        headline: fromParticipants.headline || '',
        bio: '',
        location: '',
        languages: ['English'],
        teachingSkills: [],
        learningInterests: [],
        certificates: [],
        experience: [],
        education: [],
        portfolioLinks: [],
        accountVerificationStatus: 'Verified',
        isProfileVerified: true,
        rating: 5.0,
        reviewCount: 0,
        completedSessionsCount: 0,
        totalEarnings: 0,
        createdAt: new Date().toISOString(),
      };
    }

    return null;
  };

  // Set default active conversation if none selected and not starting a new one
  useEffect(() => {
    if (!activeConversationId && !selectedRecipient && userConversations.length > 0) {
      setActiveConversationId(userConversations[0].id);
      const other = resolveOtherParticipant(userConversations[0]);
      if (other) setSelectedRecipient(other);
    }
  }, [activeConversationId, selectedRecipient, userConversations]);

  // Mark active conversation read & load messages from backend
  useEffect(() => {
    if (activeConversationId) {
      loadMessagesForConversation(activeConversationId);
      markConversationAsRead(activeConversationId);
    }
  }, [activeConversationId, markConversationAsRead, loadMessagesForConversation]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConversationId]);

  if (!currentUser) return null;

  const activeConv = activeConversationId
    ? conversations.find((c) => c.id === activeConversationId)
    : null;

  const activeOtherUser = activeConv
    ? resolveOtherParticipant(activeConv)
    : selectedRecipient;

  const effectiveRecipient = selectedRecipient || activeOtherUser;

  const activeMessages = activeConversationId
    ? messages.filter((m) => m.conversationId === activeConversationId)
    : [];

  const handleSelectTeacher = (teacher: UserProfile) => {
    // Check if conversation already exists with this teacher
    const existingConv = conversations.find(
      (c) => c.participantIds.includes(currentUser.id) && c.participantIds.includes(teacher.id)
    );

    if (existingConv) {
      setActiveConversationId(existingConv.id);
      setSelectedRecipient(teacher);
      loadMessagesForConversation(existingConv.id);
      markConversationAsRead(existingConv.id);
    } else {
      // Start fresh draft conversation
      setActiveConversationId(null);
      setSelectedRecipient(teacher);
    }
    setSearchQuery('');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;
    if (!effectiveRecipient) return;

    const textToSend = inputText.trim();
    const fileToSend = attachedFile;
    setInputText('');
    setAttachedFile(null);
    setIsSending(true);

    try {
      const result = await sendMessage(
        effectiveRecipient.id,
        textToSend,
        fileToSend?.name,
        fileToSend?.size
      );

      // If backend created/returned conversation, immediately switch to it
      if (result && result.conversation && result.conversation.id) {
        setActiveConversationId(result.conversation.id);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSimulateAttachment = () => {
    const sampleFiles = [
      { name: 'learning_plan_syllabus.pdf', size: '1.4 MB' },
      { name: 'practice_exercise_code.zip', size: '2.1 MB' },
      { name: 'session_notes_cheatsheet.pdf', size: '920 KB' },
    ];
    const picked = sampleFiles[Math.floor(Math.random() * sampleFiles.length)];
    setAttachedFile(picked);
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        {/* Left Column: Search & Conversations List */}
        <div className="w-full md:w-80 border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-neutral-50/50 dark:bg-neutral-950/40">
          {/* Teacher Search Bar */}
          <div className="p-3.5 border-b border-neutral-200 dark:border-neutral-800">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teachers by name..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white transition-all"
              />
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 text-sky-500 animate-spin absolute right-2.5" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 absolute right-1.5 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Sidebar Content Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60">
            {/* Case A: Active Search Results */}
            {searchQuery.trim().length > 0 ? (
              <div>
                <div className="px-3.5 py-2 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase bg-neutral-100/60 dark:bg-neutral-800/40 flex items-center justify-between">
                  <span>Teachers ({searchResults.length})</span>
                  {isSearching && <span className="lowercase font-normal">searching...</span>}
                </div>

                {isSearching && searchResults.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-500 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 text-sky-500 animate-spin" />
                    <span>Searching registered teachers...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-6 text-center">
                    <UserX className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">No teachers found</p>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 max-w-[200px] mx-auto">
                      No registered teachers matched "{searchQuery}". Try searching by another name or skill.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800/40">
                    {searchResults.map((teacher) => {
                      const hasExistingConv = conversations.some(
                        (c) =>
                          c.participantIds.includes(currentUser.id) &&
                          c.participantIds.includes(teacher.id)
                      );
                      const isSelected = effectiveRecipient?.id === teacher.id;

                      return (
                        <button
                          key={teacher.id}
                          onClick={() => handleSelectTeacher(teacher)}
                          className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-sky-50/70 dark:bg-sky-950/40 border-l-2 border-sky-600'
                              : 'hover:bg-neutral-100/70 dark:hover:bg-neutral-800/50'
                          }`}
                        >
                          <Avatar
                            name={teacher.name}
                            avatarUrl={teacher.avatarUrl}
                            bgColor={teacher.avatarBgColor || '#059669'}
                            size="sm"
                            isVerified={teacher.isProfileVerified}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                                {teacher.name}
                              </span>
                              {teacher.rating ? (
                                <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-0.5">
                                  ★ {teacher.rating.toFixed(1)}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                              {teacher.headline || teacher.teachingSkills?.[0]?.name || 'Teacher'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {hasExistingConv ? (
                                <span className="text-[10px] font-medium text-sky-600 dark:text-sky-400">
                                  Active conversation
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5" /> Start chat
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Case B: Standard Conversations List */
              <div>
                <div className="px-3.5 py-2 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase bg-neutral-100/60 dark:bg-neutral-800/40">
                  Conversations ({userConversations.length})
                </div>

                {userConversations.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-500">
                    <MessageSquare className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                    <p className="font-semibold text-neutral-800 dark:text-neutral-200">No active conversations</p>
                    <p className="text-[11px] text-neutral-400 mt-1 max-w-[200px] mx-auto">
                      Search for a teacher above to start direct messaging.
                    </p>
                  </div>
                ) : (
                  userConversations.map((c) => {
                    const other = resolveOtherParticipant(c);
                    if (!other) return null;

                    const isSelected = c.id === activeConversationId;
                    const unread = c.unreadCountForUser?.[currentUser.id] || 0;

                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setActiveConversationId(c.id);
                          setSelectedRecipient(other);
                          markConversationAsRead(c.id);
                        }}
                        className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-white dark:bg-neutral-900 border-l-2 border-neutral-900 dark:border-white shadow-2xs'
                            : 'hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40'
                        }`}
                      >
                        <Avatar
                          name={other.name}
                          avatarUrl={other.avatarUrl}
                          bgColor={other.avatarBgColor}
                          size="sm"
                          isVerified={other.isProfileVerified}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                              {other.name}
                            </span>
                            {unread > 0 && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-sky-600 rounded-full tabular-nums">
                                {unread}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                            {c.lastMessageText || 'Draft conversation'}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chat Thread */}
        {effectiveRecipient ? (
          <div className="flex-1 flex flex-col bg-white dark:bg-neutral-900 min-w-0">
            {/* Thread Header */}
            <div className="p-3.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  name={effectiveRecipient.name}
                  avatarUrl={effectiveRecipient.avatarUrl}
                  bgColor={effectiveRecipient.avatarBgColor}
                  size="sm"
                  isVerified={effectiveRecipient.isProfileVerified}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                      {effectiveRecipient.name}
                    </h3>
                    <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                      {effectiveRecipient.role}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-500 truncate">
                    {effectiveRecipient.headline || (effectiveRecipient.teachingSkills?.[0]?.name ? `Teaching: ${effectiveRecipient.teachingSkills[0].name}` : 'Skill Exchange Instructor')}
                    {effectiveRecipient.location ? ` · ${effectiveRecipient.location}` : ''}
                  </p>
                </div>
              </div>

              {/* Chat action options */}
              <div className="relative">
                <button
                  onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg cursor-pointer"
                  title="More options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showOptionsDropdown && (
                  <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-1 z-30">
                    <button
                      onClick={() => {
                        setShowOptionsDropdown(false);
                        navigate(`/profile/${effectiveRecipient.id}`);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowOptionsDropdown(false);
                        blockUser(effectiveRecipient.id);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserX className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Block User</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowOptionsDropdown(false);
                        navigate(`/complaints?targetUser=${effectiveRecipient.id}`);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Report User</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Message History Bubble List or New Conversation Prompt */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-neutral-50/30 dark:bg-neutral-950/30">
              {activeMessages.length > 0 ? (
                activeMessages.map((msg) => {
                  const isMine = msg.senderId === currentUser.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-md p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                          isMine
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-br-xs'
                            : 'bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-bl-xs'
                        }`}
                      >
                        <p>{msg.text}</p>

                        {/* Attachment Badge */}
                        {msg.attachmentName && (
                          <div
                            className={`mt-2 p-2 rounded-lg flex items-center gap-2 border text-[11px] ${
                              isMine
                                ? 'bg-neutral-800 dark:bg-neutral-100 border-neutral-700 dark:border-neutral-200 text-neutral-200 dark:text-neutral-800'
                                : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                            }`}
                          >
                            <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                            <div className="truncate">
                              <strong className="block truncate">{msg.attachmentName}</strong>
                              <span className="text-[10px] opacity-75">{msg.attachmentSize}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-neutral-400 mt-1 px-1">
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMine && <CheckCheck className="w-3 h-3 text-sky-500" />}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center my-auto">
                  <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-3 border border-sky-100 dark:border-sky-900">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Start a conversation with {effectiveRecipient.name}
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mt-1">
                    {effectiveRecipient.headline || 'Ask questions about courses, lesson scheduling, or skill swaps.'}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-300">
                    Type your first message below and press Send.
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer */}
            <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              {attachedFile && (
                <div className="mb-2 p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <FileText className="w-3.5 h-3.5 text-sky-600" />
                    <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                      {attachedFile.name} ({attachedFile.size})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs px-1 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}

              <form onSubmit={handleSend} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSimulateAttachment}
                  className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Attach syllabus or study notes"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Message ${effectiveRecipient.name.split(' ')[0]}...`}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
                />

                <button
                  type="submit"
                  disabled={isSending || (!inputText.trim() && !attachedFile)}
                  className="p-2 text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-40 transition-colors cursor-pointer flex items-center justify-center"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-neutral-500">
            <MessageSquare className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mb-3" />
            <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">No conversation selected</h4>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm">
              Search for any teacher by name in the search bar on the left to start a direct message thread.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
