/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ClassSession } from '../../types';
import { Avatar } from '../common/Avatar';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Users,
  FileText,
  Share2,
  CheckCircle2,
  Sparkles,
  Send,
} from 'lucide-react';

interface MeetingRoomModalProps {
  session: ClassSession;
  isOpen: boolean;
  onClose: () => void;
}

export const MeetingRoomModal: React.FC<MeetingRoomModalProps> = ({
  session,
  isOpen,
  onClose,
}) => {
  const { currentUser, users, completeClass } = useApp();

  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [activeTab, setActiveTab] = useState<'notes' | 'chat'>('notes');
  const [notes, setNotes] = useState(
    `# Session Notes: ${session.title}\n- Key topics:\n- Homework & practice exercises:`
  );
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: session.teacherName, text: 'Welcome everyone! Let us begin our session.', time: 'Just now' },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen || !currentUser) return null;

  const isTeacher = currentUser.id === session.teacherId;

  // Enrolled participants
  const enrolledUsers = users.filter((u) => session.enrolledUserIds.includes(u.id));

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      {
        sender: currentUser.name,
        text: inputMessage.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setInputMessage('');
  };

  const handleEndSession = () => {
    if (isTeacher && session.status !== 'Completed') {
      completeClass(session.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-5xl h-[88vh] bg-neutral-900 text-white rounded-2xl border border-neutral-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="h-14 px-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-white truncate max-w-md">
                {session.title}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {session.format} · Instructor: {session.teacherName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-neutral-800 text-xs font-mono tabular-nums text-neutral-300">
              <span className="text-neutral-500 text-[10px]">ELAPSED</span>
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>

            <button
              onClick={handleEndSession}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>{isTeacher ? 'Complete & End Session' : 'Leave Room'}</span>
            </button>
          </div>
        </div>

        {/* Main Stage Grid */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Video Tiles Area (2 cols) */}
          <div className="lg:col-span-2 p-4 bg-neutral-950 flex flex-col justify-between overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 flex-1">
              {/* Teacher Tile */}
              <div className="relative rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden flex flex-col items-center justify-center p-4">
                <Avatar
                  name={session.teacherName}
                  size="xl"
                  className="shadow-xl"
                  bgColor="#059669"
                />
                <span className="text-xs font-semibold text-white mt-3">
                  {session.teacherName} (Instructor)
                </span>
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-neutral-300 backdrop-blur-xs">
                  Host Stream · Active
                </span>
              </div>

              {/* Current User Tile */}
              <div className="relative rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden flex flex-col items-center justify-center p-4">
                {cameraOn ? (
                  <Avatar
                    name={currentUser.name}
                    avatarUrl={currentUser.avatarUrl}
                    bgColor={currentUser.avatarBgColor}
                    size="xl"
                    className="shadow-xl"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500">
                    <VideoOff className="w-8 h-8" />
                  </div>
                )}
                <span className="text-xs font-semibold text-white mt-3">
                  {currentUser.name} (You)
                </span>
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-neutral-300 backdrop-blur-xs">
                  {micOn ? 'Microphone On' : 'Muted'}
                </span>
              </div>

              {/* Other Enrolled Participants */}
              {enrolledUsers
                .filter((u) => u.id !== currentUser.id && u.id !== session.teacherId)
                .slice(0, 2)
                .map((student) => (
                  <div
                    key={student.id}
                    className="relative rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden flex flex-col items-center justify-center p-4"
                  >
                    <Avatar
                      name={student.name}
                      avatarUrl={student.avatarUrl}
                      bgColor={student.avatarBgColor}
                      size="lg"
                    />
                    <span className="text-xs font-medium text-white mt-2">
                      {student.name}
                    </span>
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-neutral-400">
                      Attendee
                    </span>
                  </div>
                ))}
            </div>

            {/* Bottom In-Call Controls */}
            <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-center gap-3">
              <button
                onClick={() => setMicOn(!micOn)}
                className={`p-3 rounded-full transition-colors cursor-pointer ${
                  micOn ? 'bg-neutral-800 hover:bg-neutral-700 text-white' : 'bg-rose-600 text-white'
                }`}
                title={micOn ? 'Mute Mic' : 'Unmute Mic'}
              >
                {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setCameraOn(!cameraOn)}
                className={`p-3 rounded-full transition-colors cursor-pointer ${
                  cameraOn ? 'bg-neutral-800 hover:bg-neutral-700 text-white' : 'bg-rose-600 text-white'
                }`}
                title={cameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
              >
                {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Right Sidebar: Notes & In-Room Chat */}
          <div className="border-l border-neutral-800 bg-neutral-900 flex flex-col">
            <div className="flex items-center border-b border-neutral-800 text-xs">
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex-1 py-3 text-center font-semibold transition-colors cursor-pointer ${
                  activeTab === 'notes'
                    ? 'text-white border-b-2 border-white bg-neutral-800/40'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Collaborative Notes
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-3 text-center font-semibold transition-colors cursor-pointer ${
                  activeTab === 'chat'
                    ? 'text-white border-b-2 border-white bg-neutral-800/40'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Session Chat ({chatMessages.length})
              </button>
            </div>

            <div className="flex-1 min-h-0 p-4 overflow-y-auto">
              {activeTab === 'notes' ? (
                <div className="h-full flex flex-col">
                  <span className="text-[10px] text-neutral-400 mb-2 uppercase tracking-wider block">
                    Shared Live Whiteboard & Code Snippets
                  </span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="flex-1 w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 font-mono text-xs focus:outline-none resize-none leading-relaxed"
                    placeholder="Type shared session notes here..."
                  />
                  <span className="text-[10px] text-neutral-500 mt-2">
                    Auto-saved locally for session participants.
                  </span>
                </div>
              ) : (
                <div className="h-full flex flex-col justify-between">
                  <div className="space-y-3 overflow-y-auto pr-1">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className="text-xs">
                        <div className="flex items-center justify-between text-[10px] text-neutral-400">
                          <strong className="text-neutral-300">{msg.sender}</strong>
                          <span>{msg.time}</span>
                        </div>
                        <p className="mt-0.5 text-neutral-200 bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                          {msg.text}
                        </p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendMessage} className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Send message to room..."
                      className="flex-1 px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:ring-1 focus:ring-neutral-700"
                    />
                    <button
                      type="submit"
                      className="p-2 rounded-lg bg-white text-neutral-900 hover:bg-neutral-200 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
