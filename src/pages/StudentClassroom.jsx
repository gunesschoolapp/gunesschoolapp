import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, Users, GraduationCap, BookOpen, PhoneOff, AlertCircle } from 'lucide-react';

export default function StudentClassroom() {
  const [name, setName] = useState('');
  const [passportOrId, setPassportOrId] = useState('');
  const [verified, setVerified] = useState(false);
  const [student, setStudent] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [error, setError] = useState('');
  const [inCall, setInCall] = useState(false);

  const { data: activeRooms = [], isLoading } = useQuery({
    queryKey: ['virtual-rooms-active'],
    queryFn: () => base44.entities.VirtualRoom.filter({ status: 'active' }),
    refetchInterval: 10000,
  });

  const handleVerify = async () => {
    setError('');
    if (!name.trim() || !passportOrId.trim()) {
      setError('Lütfen ad soyad ve pasaport/kimlik numaranızı girin.');
      return;
    }

    // Look up student by passport or name
    const students = await base44.entities.Student.list();
    const match = students.find(s => {
      const nameMatch = s.full_name?.toLowerCase().trim() === name.toLowerCase().trim();
      const idMatch = s.passport_number?.toLowerCase().trim() === passportOrId.toLowerCase().trim();
      return nameMatch && idMatch;
    });

    if (!match) {
      setError('Bilgiler eşleşmedi. Lütfen kayıtlı adınızı ve pasaport/kimlik numaranızı kontrol edin.');
      return;
    }

    setStudent(match);
    setVerified(true);
  };

  const joinRoom = (room) => {
    setSelectedRoom(room);
    setInCall(true);
  };

  const endCall = () => {
    setInCall(false);
    setSelectedRoom(null);
  };

  const meetUrl = selectedRoom
    ? `https://meet.jit.si/${selectedRoom.room_id}#config.startWithAudioMuted=false&config.startWithVideoMuted=false&userInfo.displayName=${encodeURIComponent(student?.full_name || name)}`
    : '';

  // --- Giriş Ekranı ---
  if (!verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-black text-foreground">Sanal Sınıf</h1>
              <p className="text-muted-foreground text-sm mt-1">Güneş English School</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Ad Soyad (kayıtlı olduğu gibi)
                </label>
                <input
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Örn: Ayşe Kaya"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleVerify()}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Pasaport / TC Kimlik No
                </label>
                <input
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Pasaport veya TC kimlik numaranız"
                  value={passportOrId}
                  onChange={e => setPassportOrId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleVerify()}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <Button className="w-full h-11" onClick={handleVerify}>
                <Video className="w-4 h-4 mr-2" />
                Giriş Yap & Dersleri Gör
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Aktif Ders Seçimi ---
  if (!inCall) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-4">
          <div className="text-center mb-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-black">Hoş geldiniz, {student?.full_name?.split(' ')[0]}! 👋</h2>
            <p className="text-sm text-muted-foreground mt-1">Aktif derslerinizi aşağıda görebilirsiniz</p>
          </div>

          {isLoading ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Yükleniyor...</CardContent></Card>
          ) : activeRooms.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold text-foreground">Şu an aktif ders yok</p>
                <p className="text-sm text-muted-foreground mt-1">Öğretmeniniz dersi başlattığında burada görünecek</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeRooms.map(room => (
                <Card key={room.id} className="border-2 border-primary/20 shadow-md">
                  <CardContent className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Video className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{room.course_name || 'Ders'}</p>
                        <p className="text-xs text-muted-foreground">Öğretmen: {room.teacher_name || '—'}</p>
                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px] mt-1 gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                          Canlı
                        </Badge>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => joinRoom(room)}>
                      Katıl
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <button
            onClick={() => { setVerified(false); setStudent(null); }}
            className="text-xs text-muted-foreground hover:text-foreground underline w-full text-center"
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    );
  }

  // --- Video Görüşme ---
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white">
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-600 text-white gap-1 text-xs">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block" />
            Canlı
          </Badge>
          <span className="text-sm text-gray-300">{selectedRoom?.course_name}</span>
        </div>
        <Button variant="destructive" size="sm" onClick={endCall} className="gap-1.5">
          <PhoneOff className="w-3.5 h-3.5" />
          Dersten Çık
        </Button>
      </div>
      <div className="flex-1">
        <iframe
          src={meetUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-full border-0"
          style={{ minHeight: 'calc(100vh - 52px)' }}
          title="Virtual Classroom"
        />
      </div>
    </div>
  );
}