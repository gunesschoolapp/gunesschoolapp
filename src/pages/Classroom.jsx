import React, { useState, useRef, useEffect } from 'react';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NotificationService } from '@/lib/NotificationService';
import {
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Users,
  Copy, Check, ExternalLink, Settings, Globe, Info
} from 'lucide-react';

// ─── Available Jitsi Servers ─────────────────────────────
// meet.jit.si → 5 min limit (free)
// jitsi.riot.im → community, no limit
// meet.element.io → community, no limit  
// Custom self-hosted → no limit
const JITSI_SERVERS = [
  { domain: 'meet.jit.si', label: 'Jitsi Meet (Official)', note: '⚠️ 5 min limit' },
  { domain: 'jitsi.riot.im', label: 'Element Jitsi', note: '✅ No limit' },
  { domain: 'meet.element.io', label: 'Element Meet', note: '✅ No limit' },
  { domain: 'jitsi.member.fsf.org', label: 'FSF Jitsi', note: '✅ No limit' },
];

function getJitsiDomain() {
  return localStorage.getItem('gunes_jitsi_domain') || 'meet.jit.si';
}
function setJitsiDomain(domain) {
  localStorage.setItem('gunes_jitsi_domain', domain);
}

function generateRoomId(courseId, teacherEmail) {
  const base = teacherEmail ? teacherEmail.split('@')[0].replace(/[^a-z0-9]/gi, '') : 'teacher';
  return `gunes-${base}-${Math.random().toString(36).substr(2, 6)}`;
}

export default function Classroom() {
  const { user } = useCurrentUser();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [roomId, setRoomId] = useState('');
  const [inCall, setInCall] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [currentDomain, setCurrentDomain] = useState(getJitsiDomain());
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  const [activeVirtualRoomId, setActiveVirtualRoomId] = useState(null);

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list()
  });

  const createRoomMutation = useMutation({
    mutationFn: (data) => base44.entities.VirtualRoom.create(data),
    onSuccess: (room) => setActiveVirtualRoomId(room.id),
  });

  const endRoomMutation = useMutation({
    mutationFn: (id) => base44.entities.VirtualRoom.update(id, { status: 'ended', ended_at: new Date().toISOString() }),
  });

  const startRoom = async () => {
    const id = generateRoomId(selectedCourse, user?.email);
    const course = courses.find(c => c.id === selectedCourse);
    await createRoomMutation.mutateAsync({
      room_id: id,
      course_id: selectedCourse || null,
      course_name: course?.name || 'General Class',
      teacher_name: user?.full_name || '',
      teacher_email: user?.email || '',
      status: 'active',
      started_at: new Date().toISOString(),
    });

    // Send notifications to enrolled students
    if (selectedCourse) {
      try {
        const courseStudentIds = course?.enrolled_students || [];
        const allStudents = await base44.entities.Student.list();
        const enrolledStudents = allStudents.filter(s => 
          s.course_id === selectedCourse || courseStudentIds.includes(s.id)
        );

        const studentEmails = enrolledStudents
          .map(s => s.email)
          .filter(email => !!email);

        if (studentEmails.length > 0) {
          await NotificationService.send({
            title: 'Sanal Sınıf Başladı! 🎓',
            message: `"${course?.name || 'Dersiniz'}" için canlı ders oturumu başladı. Katılmak için tıklayın!`,
            type: 'lesson_reminder',
            icon: '⏰',
            recipients: studentEmails,
            link: '/student-classroom',
            sent_by: user?.full_name || 'Öğretmen',
          });
        }
      } catch (err) {
        console.warn('Failed to send class start notifications:', err);
      }
    }

    setRoomId(id);
    setInCall(true);
  };

  const joinRoom = (id) => {
    setRoomId(id);
    setInCall(true);
  };

  const endCall = async () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    if (activeVirtualRoomId) {
      await endRoomMutation.mutateAsync(activeVirtualRoomId);
      setActiveVirtualRoomId(null);
    }
    setInCall(false);
    setRoomId('');
  };

  const studentLink = `${window.location.origin}${window.location.pathname}#/student-classroom`;

  const copyLink = () => {
    const link = `https://${currentDomain}/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleServerChange = (domain) => {
    setJitsiDomain(domain);
    setCurrentDomain(domain);
    setShowServerSettings(false);
  };

  // Load Jitsi External API
  useEffect(() => {
    if (!inCall || !roomId) return;

    const domain = getJitsiDomain();

    const loadJitsi = () => {
      // Remove any existing Jitsi script to load from correct domain
      const existingScript = document.getElementById('jitsi-api-script');
      if (existingScript) existingScript.remove();

      const script = document.createElement('script');
      script.id = 'jitsi-api-script';
      script.src = `https://${domain}/external_api.js`;
      script.async = true;
      script.onload = () => initJitsi(domain);
      script.onerror = () => {
        console.error('Failed to load Jitsi API from', domain);
        // Fallback: open in external browser
        window.open(`https://${domain}/${roomId}`, '_blank');
      };
      document.head.appendChild(script);
    };

    const initJitsi = (domain) => {
      if (!jitsiContainerRef.current) return;
      jitsiContainerRef.current.innerHTML = '';

      try {
        const api = new window.JitsiMeetExternalAPI(domain, {
          roomName: roomId,
          parentNode: jitsiContainerRef.current,
          width: '100%',
          height: '100%',
          configOverwrite: {
            // ─── Authentication & Lobby ───
            prejoinPageEnabled: false,          // Skip pre-join lobby
            disableDeepLinking: true,           // Don't redirect to native app
            enableLobby: false,                 // No lobby/waiting room
            hideLobbyButton: true,              // Hide lobby button
            requireDisplayName: false,          // Don't require name entry
            enableWelcomePage: false,           // Skip welcome page
            enableClosePage: false,             // Don't show close page
            disableModeratorIndicator: true,    // Hide moderator badge
            startWithAudioMuted: !micOn,
            startWithVideoMuted: !camOn,
            
            // ─── Moderator bypass ───
            enableInsecureRoomNameWarning: false,
            disableThirdPartyRequests: true,
            enableNoAudioDetection: false,
            enableNoisyMicDetection: false,
            
            // ─── UI cleanup ───
            hideConferenceSubject: false,
            hideConferenceTimer: false,
            disableInviteFunctions: false,
            toolbarButtons: [
              'microphone', 'camera', 'desktop', 'chat',
              'raisehand', 'participants-pane', 'tileview',
              'select-background', 'fullscreen', 'hangup'
            ],
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            MOBILE_APP_PROMO: false,             // Hide app download
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
            SHOW_CHROME_EXTENSION_BANNER: false,
            SHOW_PROMOTIONAL_CLOSE_PAGE: false,
            GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
            DISPLAY_WELCOME_FOOTER: false,
            DISPLAY_WELCOME_PAGE_ADDITIONAL_CARD: false,
            DISPLAY_WELCOME_PAGE_CONTENT: false,
            DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,
          },
          userInfo: {
            displayName: user?.full_name || 'Teacher',
            email: user?.email || '',
          },
        });

        jitsiApiRef.current = api;

        // Auto-end when user hangs up
        api.addEventListener('readyToClose', () => {
          endCall();
        });

        // Log when joined successfully
        api.addEventListener('videoConferenceJoined', () => {
          console.log('✅ Joined Jitsi room:', roomId, 'on', domain);
        });

      } catch (err) {
        console.error('Jitsi init error:', err);
        if (jitsiContainerRef.current) {
          jitsiContainerRef.current.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;padding:20px;text-align:center;color:white;">
              <p style="font-size:16px;font-weight:bold;">Video couldn't load</p>
              <p style="font-size:13px;opacity:0.7;">Server: ${domain}</p>
              <a href="https://${domain}/${roomId}" target="_blank" rel="noreferrer" 
                 style="background:#3b82f6;color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">
                 Open in Browser
              </a>
            </div>`;
        }
      }
    };

    loadJitsi();

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [inCall, roomId]);

  const serverInfo = JITSI_SERVERS.find(s => s.domain === currentDomain);

  return (
    <div className="space-y-6 pb-24 sm:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🎓 Virtual Classroom</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Start video sessions with teachers and students
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowServerSettings(!showServerSettings)}
          className="gap-1.5"
        >
          <Globe className="w-3.5 h-3.5" />
          Server
        </Button>
      </div>

      {/* Server Settings Panel */}
      {showServerSettings && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-600" />
              <h3 className="font-semibold text-sm">Video Server Settings</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Select a Jitsi server. <strong>meet.jit.si</strong> has a 5-minute limit.
              Community servers have no time limit.
            </p>
            <div className="grid gap-2">
              {JITSI_SERVERS.map(server => (
                <button
                  key={server.domain}
                  onClick={() => handleServerChange(server.domain)}
                  className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-all ${
                    currentDomain === server.domain
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-medium">{server.label}</p>
                    <p className={`text-xs mt-0.5 ${currentDomain === server.domain ? 'text-white/70' : 'text-muted-foreground'}`}>
                      {server.domain}
                    </p>
                  </div>
                  <span className={`text-xs font-medium ${currentDomain === server.domain ? 'text-white' : ''}`}>
                    {server.note}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-start gap-2 pt-1">
              <Info className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                Recommended: <strong>Element Jitsi</strong> or <strong>FSF Jitsi</strong> for unlimited meeting time.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current server indicator */}
      {!showServerSettings && serverInfo && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Globe className="w-3 h-3" />
          <span>Server: <strong>{serverInfo.label}</strong> {serverInfo.note}</span>
        </div>
      )}

      {!inCall ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Start New Room */}
          <Card className="border-2 border-primary/20">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Video className="w-5 h-5 text-primary" />
                </div>
                <div>
                   <h2 className="font-semibold">Start New Room</h2>
                   <p className="text-xs text-muted-foreground">Invite students</p>
                 </div>
              </div>

              <div>
                 <label className="text-xs font-medium text-muted-foreground mb-1 block">
                   Select Course (optional)
                 </label>
                 <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                   <SelectTrigger>
                     <SelectValue placeholder="Select course..." />
                   </SelectTrigger>
                  <SelectContent>
                    {courses.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setMicOn(!micOn)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${micOn ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  {micOn ? 'Mic On' : 'Mic Off'}
                </button>
                <button onClick={() => setCamOn(!camOn)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${camOn ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {camOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                  {camOn ? 'Cam On' : 'Cam Off'}
                </button>
              </div>

              <Button className="w-full" onClick={startRoom}>
                 <Video className="w-4 h-4 mr-2" />
                 Start Room
               </Button>
            </CardContent>
          </Card>

          {/* Join Room */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                   <h2 className="font-semibold">Join a Room</h2>
                   <p className="text-xs text-muted-foreground">Join with Room ID</p>
                 </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Room ID or Link</label>
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="gunes-crm-abc123"
                  value={roomId}
                  onChange={e => {
                    let val = e.target.value;
                    if (val.includes('meet.jit.si/') || val.includes('jitsi.')) {
                      val = val.split('/').pop().split('#')[0];
                    }
                    setRoomId(val);
                  }}
                />
              </div>

              <Button variant="outline" className="w-full" onClick={() => joinRoom(roomId)} disabled={!roomId.trim()}>
                <Phone className="w-4 h-4 mr-2" />
                Join
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Controls */}
          <div className="flex items-center justify-between flex-wrap gap-2 bg-card border rounded-xl p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="default" className="bg-emerald-600 text-white gap-1">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block" />
                Live
              </Badge>
              <span className="text-sm font-mono text-muted-foreground">{roomId}</span>
              <a href={studentLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="w-3 h-3" />
                Student Login Link
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyLink} className="gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              <Button variant="destructive" size="sm" onClick={endCall} className="gap-1.5">
                <PhoneOff className="w-3.5 h-3.5" />
                End Session
              </Button>
            </div>
          </div>

          {/* Jitsi Container */}
          <div
            ref={jitsiContainerRef}
            className="rounded-2xl overflow-hidden border border-border shadow-lg bg-black"
            style={{ height: '70vh', minHeight: 480 }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-white/60">
                <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Connecting to {currentDomain}...</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}