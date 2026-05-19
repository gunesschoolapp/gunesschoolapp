import React, { useState, useRef } from 'react';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Users, Monitor, Copy, Check, ExternalLink } from 'lucide-react';

function generateRoomId(courseId, teacherEmail) {
  // Odanın ID'si öğretmenin email'ine dayalı + rastgele suffix — benzersiz ve gizli
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
  const iframeRef = useRef(null);

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
    if (activeVirtualRoomId) {
      await endRoomMutation.mutateAsync(activeVirtualRoomId);
      setActiveVirtualRoomId(null);
    }
    setInCall(false);
    setRoomId('');
  };

  const studentLink = `${window.location.origin}/student-classroom`;

  const copyLink = () => {
    const link = `https://meet.jit.si/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const meetUrl = roomId
    ? `https://meet.jit.si/${roomId}#config.startWithAudioMuted=${!micOn}&config.startWithVideoMuted=${!camOn}&userInfo.displayName=${encodeURIComponent(user?.full_name || 'User')}`
    : '';

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
                    // Extract room ID from full URL if pasted
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

          {/* Jitsi Meet iframe */}
          <div className="rounded-2xl overflow-hidden border border-border shadow-lg" style={{ height: '70vh', minHeight: 480 }}>
            <iframe
              ref={iframeRef}
              src={meetUrl}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              className="w-full h-full border-0"
              title="Virtual Classroom"
            />
          </div>
        </div>
      )}
    </div>
  );
}