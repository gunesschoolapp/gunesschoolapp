import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ConversationList from '@/components/messages/ConversationList';
import MessageThread from '@/components/messages/MessageThread';
import StudentDetailPanel from '@/components/messages/StudentDetailPanel';
import NewConversationDialog from '@/components/messages/NewConversationDialog';
import StaffChatDialog from '@/components/messages/StaffChatDialog';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users } from 'lucide-react';

export default function Messages() {
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showStaffChat, setShowStaffChat] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showStudentPanel, setShowStudentPanel] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => base44.entities.Conversation.list('-last_message_at', 100),
    refetchInterval: 15000,
  });

  const createConvMutation = useMutation({
    mutationFn: (data) => base44.entities.Conversation.create(data),
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setSelected(conv);
    },
  });

  const handleSelect = async (conv) => {
    setSelected(conv);
    if (conv.unread_count > 0) {
      await base44.entities.Conversation.update(conv.id, { unread_count: 0 });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    }
  };

  return (
    <div className="-m-4 lg:-m-8 h-[calc(100vh-4rem)] flex">
      {/* Conversation list */}
      <div className="w-72 flex-shrink-0 flex flex-col">
        <div className="p-4 border-b flex gap-2">
          <Button
            onClick={() => setShowNew(true)}
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Öğrenci
          </Button>
          <Button
            onClick={() => setShowStaffChat(true)}
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
          >
            <Users className="w-4 h-4" />
            Çalışan
          </Button>
        </div>
        <ConversationList
          conversations={conversations}
          selectedId={selected?.id}
          onSelect={handleSelect}
          onNew={() => setShowNew(true)}
        />
      </div>

      {/* Message thread */}
      <div className="flex-1 flex flex-col min-w-0">
        <MessageThread conversation={selected} currentUser={currentUser} onStudentClick={() => setShowStudentPanel(true)} />
      </div>

      {/* Student detail panel */}
      {showStudentPanel && selected && (
        <StudentDetailPanel
          studentId={selected?.student_id || selected?.student_name}
          open={showStudentPanel}
          onOpenChange={setShowStudentPanel}
        />
      )}

      <NewConversationDialog
         open={showNew}
         onClose={() => setShowNew(false)}
         onCreate={(data) => createConvMutation.mutate(data)}
       />

      <StaffChatDialog
         open={showStaffChat}
         onClose={() => setShowStaffChat(false)}
         onCreate={(data) => createConvMutation.mutate(data)}
         currentUserEmail={currentUser?.email}
       />
      </div>
      );
      }