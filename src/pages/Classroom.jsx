import React, { useState, useRef, useEffect } from 'react';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Users, Copy, Check, ExternalLink } from 'lucide-react';

function generateRoomId(courseId, teacherEmail) {
  const base = teacherEmail ? teacherEmail.split('@')[0].replace(/[^a-z0-9]/gi, '') : 'teacher';
  return `gunes-${base}-${Math.random().toString(36).substr(2, 6)}`;
}

// Detect if running inside Capacitor native app
function isCapacitor() {
  return window.Capacitor?.isNativePlatform?.() || window.Capacitor?.isPluginAvailable?.('App') || false;
}

export default function Classroom() {
  const { user } = useCurrentUser();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [roomId, setRoomId] = useState('');
  const [inCall, setInCall] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [copied, setCopied] = useState(false);
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  const queryClient = useQueryClient();
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
    setRoomId(id);
    setInCall(true);
  };

  const joinRoom = (id) => {
    setRoomId(id);
    setInCall(true);
  };

  const endCall = async () => {
    // Dispose Jitsi API instance
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
    const link = `https://meet.jit.si/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Load Jitsi Meet External API when in call
  useEffect(() => {
    if (!inCall || !roomId) return;

    const loadJitsi = () => {
      // Check if script already loaded
      if (window.JitsiMeetExternalAPI) {
        initJitsi();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => initJitsi();
      script.onerror = () => {
        console.error('Failed to load Jitsi API, falling back to iframe');
        // Fallback: open in browser
        if (isCapacitor()) {
          window.open(`https://meet.jit.si/${roomId}`, '_system');
        }
      };
      document.head.appendChild(script);
    };

    const initJitsi = () => {
      if (!jitsiContainerRef.current) return;
      // Clear container
      jitsiContainerRef.current.innerHTML = '';

      try {
        const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
          roomName: roomId,
          parentNode: jitsiContainerRef.current,
          width: '100%',
          height: '100%',
          configOverwrite: {
            startWithAudioMuted: !micOn,
            startWithVideoMuted: !camOn,
            disableDeepLinking: true,      // KEY: prevents "Join in app" screen
            disableThirdPartyRequests: true,
            prejoinPageEnabled: false,     // Skip pre-join screen on mobile
            disableInviteFunctions: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            MOBILE_APP_PROMO: false,       // KEY: hides app download prompt
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            SHOW_CHROME_EXTENSION_BANNER: false,
          },
          userInfo: {
            displayName: user?.full_name || 'User',
            email: user?.email || '',
          },
        });

        jitsiApiRef.current = api;

        api.addEventListener('readyToClose', () => {
          endCall();
        });
      } catch (err) {
        console.error('Jitsi init error:', err);
        // Fallback for any error
        if (jitsiContainerRef.current) {
          jitsiContainerRef.current.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;padding:20px;text-align:center;">
              <p style="font-size:14px;color:#666;">Video couldn't load in the app.</p>
              <a href="https://meet.jit.si/${roomId}" target="_blank" rel="noreferrer" 
                 style="background:#3b82f6;color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;">
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

  return (
    <div className="space-y-6 pb-24 sm:pb-0">
      <div>
        <h1 className="text-2xl font-bold">🎓 Virtual Classroom</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Start video sessions with teachers and students
        </p>
      </div>

      {!inCall ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Yeni Oda Başlat */}
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
                <button
                  onClick={() => setMicOn(!micOn)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${micOn ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}
                  >
                  {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  {micOn ? 'Mic On' : 'Mic Off'}
                  </button>
                  <button
                  onClick={() => setCamOn(!camOn)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${camOn ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}
                  >
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

          {/* Odaya Katıl */}
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
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Room ID or Link
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="gunes-crm-abc123"
                  value={roomId}
                  onChange={e => {
                    let val = e.target.value;
                    if (val.includes('meet.jit.si/')) {
                      val = val.split('meet.jit.si/')[1].split('#')[0];
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
            <a
              href={studentLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
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

          {/* Jitsi Meet Container — External API renders here */}
          <div 
            ref={jitsiContainerRef}
            className="rounded-2xl overflow-hidden border border-border shadow-lg bg-black" 
            style={{ height: '70vh', minHeight: 480 }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-white/60">
                <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Connecting to video room...</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}