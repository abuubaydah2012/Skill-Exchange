/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import {
  Search,
  Send,
  Paperclip,
  MoreVertical,
  ShieldAlert,
  UserX,
  FileText,
  Check,
  CheckCheck,
  AlertCircle,
} from 'lucide-react';

export const MessagesView: React.FC = () => {
  const {
    currentUser,
    users,
    conversations,
    messages,
    sendMessage,
    markConversationAsRead,
    blockUser,
  } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string } | null>(null);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      } else {
        // Create conversation placeholder
        const target = users.find((u) => u.id === targetUserId);
        if (target) {
          sendMessage(targetUserId, `Hi ${target.name.split(' ')[0]}, I found your Skill Exchange profile!`);
        }
      }
    }
  }, [searchParams, currentUser, conversations, users, sendMessage]);

  // Set default active conversation if none selected
  useEffect(() => {
    if (!activeConversationId && userConversations.length > 0) {
      setActiveConversationId(userConversations[0].id);
    }
  }, [activeConversationId]);

  // Mark active conversation read
  useEffect(() => {
    if (activeConversationId) {
      markConversationAsRead(activeConversationId);
    }
  }, [activeConversationId, markConversationAsRead]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConversationId]);

  if (!currentUser) return null;

  // Conversations involving current user
  const userConversations = conversations.filter((c) =>
    c.participantIds.includes(currentUser.id)
  );

  // Filter conversations
  const filteredConversations = userConversations.filter((c) => {
    const otherId = c.participantIds.find((id) => id !== currentUser.id);
    const otherUser = users.find((u) => u.id === otherId);
    if (!otherUser) return false;
    if (searchQuery.trim()) {
      return (
        otherUser.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessageText.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const activeOtherUserId = activeConv?.participantIds.find((id) => id !== currentUser.id);
  const activeOtherUser = users.find((u) => u.id === activeOtherUserId);

  const activeMessages = activeConversationId
    ? messages.filter((m) => m.conversationId === activeConversationId)
    : [];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;
    if (!activeOtherUserId) return;

    sendMessage(
      activeOtherUserId,
      inputText.trim(),
      attachedFile?.name,
      attachedFile?.size
    );

    setInputText('');
    setAttachedFile(null);
  };

  const handleSimulateAttachment = () => {
    const sampleFiles = [
      { name: 'learning_plan_syllabus.pdf', size: '1.4 MB' },
      { name: 'practice_exercise_code.zip', size: '2.1 MB' },
      { name: 'pronunciation_drills.mp3', size: '4.8 MB' },
    ];
    const picked = sampleFiles[Math.floor(Math.random() * sampleFiles.length)];
    setAttachedFile(picked);
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        {/* Left Column: Conversations List */}
        <div className="w-full md:w-80 border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-neutral-50/50 dark:bg-neutral-950/40">
          {/* Search Header */}
          <div className="p-3.5 border-b border-neutral-200 dark:border-neutral-800">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500">
                No active conversations found.
              </div>
            ) : (
              filteredConversations.map((c) => {
                const otherId = c.participantIds.find((id) => id !== currentUser.id);
                const other = users.find((u) => u.id === otherId);
                if (!other) return null;

                const isSelected = c.id === activeConversationId;
                const unread = c.unreadCountForUser[currentUser.id] || 0;

                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveConversationId(c.id)}
                    className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-white dark:bg-neutral-900 border-l-2 border-neutral-900 dark:border-white'
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
        </div>

        {/* Right Column: Chat Thread */}
        {activeOtherUser && activeConv ? (
          <div className="flex-1 flex flex-col bg-white dark:bg-neutral-900 min-w-0">
            {/* Thread Header */}
            <div className="p-3.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  name={activeOtherUser.name}
                  avatarUrl={activeOtherUser.avatarUrl}
                  bgColor={activeOtherUser.avatarBgColor}
                  size="sm"
                  isVerified={activeOtherUser.isProfileVerified}
                />
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                    {activeOtherUser.name}
                  </h3>
                  <p className="text-[10px] text-neutral-500 truncate">
                    {activeOtherUser.headline} · {activeOtherUser.location}
                  </p>
                </div>
              </div>

              {/* Chat action options */}
              <div className="relative">
                <button
                  onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showOptionsDropdown && (
                  <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-1 z-30">
                    <button
                      onClick={() => {
                        setShowOptionsDropdown(false);
                        navigate(`/profile/${activeOtherUser.id}`);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowOptionsDropdown(false);
                        blockUser(activeOtherUser.id);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1.5"
                    >
                      <UserX className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Block User</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowOptionsDropdown(false);
                        navigate(`/complaints?targetUser=${activeOtherUser.id}`);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Report User</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Message History Bubble List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-neutral-50/30 dark:bg-neutral-950/30">
              {activeMessages.map((msg) => {
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

                      {/* Mock Attachment Badge */}
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
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMine && <CheckCheck className="w-3 h-3 text-sky-500" />}
                    </div>
                  </div>
                );
              })}
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
                    onClick={() => setAttachedFile(null)}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs px-1"
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
                  title="Attach sample syllabus/notes file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Reply to ${activeOtherUser.name.split(' ')[0]}...`}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() && !attachedFile}
                  className="p-2 text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-neutral-500">
            Select a conversation on the left or send a direct message from the Discover page.
          </div>
        )}
      </div>
    </div>
  );
};
