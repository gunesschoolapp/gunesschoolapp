import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Phone, Mail, Calendar, MapPin, FileText, User, Receipt, Download, Plus, BookOpen, Award, Trash2, Edit2, File, Paperclip, UserX, Link2, AlertCircle, CheckCircle2, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { generateInvoicePDF, INVOICE_TEMPLATES } from '@/components/payments/InvoiceGenerator';
import TemplatePickerDialog from '@/components/TemplatePickerDialog';
import InvoiceMatchSummary from '@/components/students/InvoiceMatchSummary';

const CEFR_COLORS = {
  A1: 'bg-red-50 text-red-700', A2: 'bg-orange-50 text-orange-700',
  B1: 'bg-yellow-50 text-yellow-700', B2: 'bg-blue-50 text-blue-700',
  C1: 'bg-green-50 text-green-700', C2: 'bg-purple-50 text-purple-700',
};

const ATTENDANCE_STATUS_COLORS = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-amber-100 text-amber-700',
  excused: 'bg-blue-100 text-blue-700',
};

const ATTENDANCE_STATUS_LABELS = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
};

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('info');

  const { data: personnel } = useQuery({
    queryKey: ['personnel', currentUser?.email],
    queryFn: () => base44.entities.Personnel.filter({ email: currentUser?.email }),
    enabled: !!currentUser?.email,
  });

  const canEdit = personnel?.[0]?.permissions?.includes('Students') || currentUser?.role === 'admin';

  const { data: student } = useQuery({
    queryKey: ['student', id],
    queryFn: () => base44.entities.Student.list().then(items => items.find(s => s.id === id)),
  });

  const { data: studentPayments = [] } = useQuery({
    queryKey: ['student-payments', id],
    queryFn: () => base44.entities.Payment.filter({ student_id: id }),
  });

  const { data: studentInvoices = [] } = useQuery({
    queryKey: ['student-invoices', id],
    queryFn: () => base44.entities.Invoice.filter({ student_id: id }),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['student-certificates', id],
    queryFn: () => base44.entities.Certificate.filter({ student_id: id }).catch(() => []),
  });

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['student-attendance', id],
    queryFn: () => base44.entities.Attendance.filter({ student_id: id }).catch(() => []),
  });

  const qc = useQueryClient();
  const [showNewPaymentDialog, setShowNewPaymentDialog] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedPaymentForPDF, setSelectedPaymentForPDF] = useState(null);
  const [showNewCertDialog, setShowNewCertDialog] = useState(false);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newDocForm, setNewDocForm] = useState({ name: '', notes: '' });
  const [documentFile, setDocumentFile] = useState(null);
  const [newCertForm, setNewCertForm] = useState({
    course_id: '', completion_date: format(new Date(), 'yyyy-MM-dd'), notes: ''
  });
  const [editForm, setEditForm] = useState({});
  const [newPaymentForm, setNewPaymentForm] = useState({
    course_id: '', amount: '', payment_date: format(new Date(), 'yyyy-MM-dd'),
    status: 'pending', payment_method: 'bank_transfer',
    installment_number: 1, total_installments: 1, notes: ''
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Student.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student', id] }),
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data) => base44.entities.Payment.create({ ...data, student_id: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-payments', id] });
      setShowNewPaymentDialog(false);
    },
  });

  const deleteCertificateMutation = useMutation({
    mutationFn: (certId) => base44.entities.Certificate.delete(certId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-certificates', id] }),
  });

  const createCertificateMutation = useMutation({
    mutationFn: (data) => base44.entities.Certificate.create({ ...data, student_id: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-certificates', id] });
      setShowNewCertDialog(false);
      setNewCertForm({ course_id: '', completion_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    },
  });

  const addDocumentMutation = useMutation({
    mutationFn: async (data) => {
      const newDoc = { id: Date.now().toString(), name: data.name, file_url: data.file_url, notes: data.notes, uploaded_date: new Date().toISOString() };
      return base44.entities.Student.update(id, { documents: [...(student?.documents || []), newDoc] });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', id] });
      setShowAddDocument(false);
      setNewDocForm({ name: '', notes: '' });
      setDocumentFile(null);
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (docId) => {
      const updatedDocs = (student?.documents || []).filter(d => d.id !== docId);
      return base44.entities.Student.update(id, { documents: updatedDocs });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student', id] }),
  });

  const handleAddDocument = async () => {
    if (!documentFile || !newDocForm.name) return;
    const uploadRes = await base44.integrations.Core.UploadFile({ file: documentFile });
    await addDocumentMutation.mutateAsync({ ...newDocForm, file_url: uploadRes.file_url });
  };

  const handleDownloadPDF = async (payment, templateId, options = {}) => {
    const course = courses.find(c => c.id === payment.course_id);
    await generateInvoicePDF({ payment, student, course, template: templateId, lang: options.lang || 'en' });
  };

  const openEditDialog = () => {
    setEditForm({
      full_name: student.full_name || '',
      email: student.email || '',
      phone: student.phone || '',
      address: student.address || '',
      date_of_birth: student.date_of_birth || '',
      nationality: student.nationality || '',
      passport_number: student.passport_number || '',
      passport_expiry: student.passport_expiry || '',
      enrollment_date: student.enrollment_date || '',
      enrollment_status: student.enrollment_status || 'not_started',
      cefr_level: student.cefr_level || '',
      course_price: student.course_price || '',
      source: student.source || '',
      notes: student.notes || '',
      emergency_contact_name: student.emergency_contact_name || '',
      emergency_contact_phone: student.emergency_contact_phone || '',
      emergency_contact_relation: student.emergency_contact_relation || '',
    });
    setShowEditDialog(true);
  };

  if (!student) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-muted-foreground">
          <p>Student not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/Students')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>
      </div>
    );
  }

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const isLessonStarted = student.enrollment_status === 'started';
  const enrolledCourses = student.course_id ? courses.filter(c => c.id === student.course_id) : [];
  const attendanceStats = {
    present: attendanceRecords.filter(a => a.status === 'present').length,
    absent: attendanceRecords.filter(a => a.status === 'absent').length,
    late: attendanceRecords.filter(a => a.status === 'late').length,
    excused: attendanceRecords.filter(a => a.status === 'excused').length,
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => navigate('/Students')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-base font-black text-primary">{getInitials(student.full_name)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-black truncate">{student.full_name}</h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge className={isLessonStarted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
              {isLessonStarted ? 'Active' : 'Not Started'}
            </Badge>
            {student.cefr_level && <Badge className={CEFR_COLORS[student.cefr_level]}>{student.cefr_level}</Badge>}
          </div>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={openEditDialog} className="flex-shrink-0">
            <Edit2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Quick action: toggle lesson status */}
      {canEdit && (
        <Button
          className={`w-full gap-2 ${isLessonStarted ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
          onClick={() => updateMutation.mutate({ enrollment_status: isLessonStarted ? 'not_started' : 'started' })}
        >
          {isLessonStarted ? <><UserX className="w-4 h-4" /> Mark as Not Started</> : <><BookOpen className="w-4 h-4" /> Mark as Active</>}
        </Button>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="info" className="text-xs px-1">Info</TabsTrigger>
          <TabsTrigger value="courses" className="text-xs px-1 gap-1">
            <BookOpen className="w-3 h-3" /> Courses {enrolledCourses.length > 0 && <span className="ml-1 bg-primary/20 text-primary text-xs rounded-full px-1">{enrolledCourses.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs px-1 gap-1">
            <ClipboardList className="w-3 h-3" /> Attendance {attendanceRecords.length > 0 && <span className="ml-1 bg-primary/20 text-primary text-xs rounded-full px-1">{attendanceRecords.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs px-1">
            Docs {(student?.documents?.length || 0) > 0 && <span className="ml-1 bg-primary/20 text-primary text-xs rounded-full px-1">{student.documents.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs px-1">
            Invoices {studentPayments.length > 0 && <span className="ml-1 bg-primary/20 text-primary text-xs rounded-full px-1">{studentPayments.length}</span>}
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-3 mt-4">
          {/* Contact */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {student.phone && (
                <a href={`tel:${student.phone}`} className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium text-primary">{student.phone}</span>
                </a>
              )}
              {student.email && (
                <a href={`mailto:${student.email}`} className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium text-primary truncate">{student.email}</span>
                </a>
              )}
              {student.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{student.address}</span>
                </div>
              )}
              {!student.phone && !student.email && !student.address && (
                <p className="text-sm text-muted-foreground italic">No contact information added</p>
              )}
            </CardContent>
          </Card>

          {/* Enrollment */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">Enrollment Information</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {student.enrollment_date && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Enrollment Date</span>
                  <span className="text-sm font-medium">{format(new Date(student.enrollment_date), 'PP')}</span>
                </div>
              )}
              {student.course_price && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Course Fee</span>
                  <span className="text-sm font-medium">£{Number(student.course_price).toFixed(2)}</span>
                </div>
              )}
              {student.cefr_level && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">CEFR Level</span>
                  <Badge className={CEFR_COLORS[student.cefr_level]}>{student.cefr_level}</Badge>
                </div>
              )}
              {student.source && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Source</span>
                  <span className="text-sm">{student.source}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personal */}
          {(student.date_of_birth || student.nationality || student.passport_number) && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {student.date_of_birth && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Date of Birth</span>
                    <span className="text-sm">{format(new Date(student.date_of_birth), 'PP')}</span>
                  </div>
                )}
                {student.nationality && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Nationality</span>
                    <span className="text-sm">{student.nationality}</span>
                  </div>
                )}
                {student.passport_number && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Passport/ID</span>
                    <span className="text-sm font-mono">{student.passport_number}</span>
                  </div>
                )}
                {student.passport_expiry && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Passport Expiry</span>
                    <span className="text-sm">{format(new Date(student.passport_expiry), 'PP')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Emergency */}
          {student.emergency_contact_name && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Name</span>
                  <span className="text-sm font-medium">{student.emergency_contact_name}</span>
                </div>
                {student.emergency_contact_phone && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Phone</span>
                    <a href={`tel:${student.emergency_contact_phone}`} className="text-sm text-primary">{student.emergency_contact_phone}</a>
                  </div>
                )}
                {student.emergency_contact_relation && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Relationship</span>
                    <span className="text-sm">{student.emergency_contact_relation}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {student.notes && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{student.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-3 mt-4">
          <p className="text-sm font-semibold text-muted-foreground">Enrolled Courses</p>
          {enrolledCourses.length > 0 ? (
            enrolledCourses.map(course => (
              <Card key={course.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{course.name}</p>
                        {course.teacher && <p className="text-xs text-muted-foreground">Instructor: {course.teacher}</p>}
                        {course.schedule && <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{course.schedule}</p>}
                        {course.room && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{course.room}</p>}
                        {course.description && <p className="text-xs text-muted-foreground mt-1">{course.description}</p>}
                      </div>
                    </div>
                    {course.status && (
                      <Badge className={`text-xs flex-shrink-0 ${course.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {course.status}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No courses enrolled</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-3 mt-4">
          {attendanceRecords.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-4">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{attendanceStats.present}</p>
                  <p className="text-xs text-muted-foreground">Present</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{attendanceStats.absent}</p>
                  <p className="text-xs text-muted-foreground">Absent</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{attendanceStats.late}</p>
                  <p className="text-xs text-muted-foreground">Late</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{attendanceStats.excused}</p>
                  <p className="text-xs text-muted-foreground">Excused</p>
                </CardContent>
              </Card>
            </div>
          )}
          {attendanceRecords.length > 0 ? (
            <div className="space-y-2">
              {[...attendanceRecords].sort((a, b) => new Date(b.date) - new Date(a.date)).map(record => {
                const courseName = courses.find(c => c.id === record.course_id)?.name || 'Course';
                return (
                  <Card key={record.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{courseName}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(record.date), 'PPP')}
                          </p>
                          {record.teacher_comment && <p className="text-xs text-muted-foreground mt-1 italic">"{record.teacher_comment}"</p>}
                        </div>
                        <Badge className={`text-xs flex-shrink-0 ${ATTENDANCE_STATUS_COLORS[record.status] || 'bg-gray-100 text-gray-700'}`}>
                          {ATTENDANCE_STATUS_LABELS[record.status] || record.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No attendance records</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">Documents</p>
            {canEdit && (
              <Button size="sm" className="gap-1" onClick={() => { setNewDocForm({ name: '', notes: '' }); setDocumentFile(null); setShowAddDocument(true); }}>
                <Plus className="w-4 h-4" /> Add
              </Button>
            )}
          </div>
          {(student?.documents?.length || 0) > 0 ? (
            student.documents.map(doc => (
              <Card key={doc.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <File className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{doc.name}</p>
                        {doc.uploaded_date && <p className="text-xs text-muted-foreground">{format(new Date(doc.uploaded_date), 'PP')}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => window.open(doc.file_url, '_blank')}>
                        <Download className="w-3.5 h-3.5" /> Open
                      </Button>
                      {canEdit && (
                        <Button size="sm" variant="ghost" className="text-red-500 px-2" onClick={() => deleteDocumentMutation.mutate(doc.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No documents</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-3 mt-4">
          {student.course_price && (
            <InvoiceMatchSummary
              coursePrice={student.course_price}
              invoices={studentInvoices}
              onNavigate={() => navigate(`/Invoices?student=${id}`)}
            />
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">Invoices ({studentInvoices.length})</p>
            {canEdit && (
              <Button size="sm" className="gap-1" onClick={() => navigate(`/Invoices?student=${id}`)}>
                <Plus className="w-4 h-4" /> Manage
              </Button>
            )}
          </div>

          {studentInvoices.length > 0 ? (
            studentInvoices.map(inv => {
              const statusColors = { draft: 'bg-gray-100 text-gray-700', sent: 'bg-blue-100 text-blue-700', paid: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700', overdue: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-700' };
              const statusLabels = { draft: 'Draft', sent: 'Sent', paid: 'Paid', pending: 'Pending', overdue: 'Overdue', cancelled: 'Cancelled' };
              const matched = Math.abs((inv.amount || 0) - (student.course_price || 0)) < 0.01;
              return (
                <Card key={inv.id} className={matched ? 'border-emerald-200' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${matched ? 'bg-emerald-100' : 'bg-primary/10'}`}>
                          <Receipt className={`w-4 h-4 ${matched ? 'text-emerald-600' : 'text-primary'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-sm">{inv.invoice_number}</p>
                            {matched && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{inv.issue_date} · {inv.due_date ? `Due: ${inv.due_date}` : ''}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-sm">£{(inv.amount || 0).toLocaleString('en-GB')}</p>
                        <Badge className={`text-xs ${statusColors[inv.status] || 'bg-gray-100 text-gray-700'}`}>
                          {statusLabels[inv.status] || inv.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No invoices for this student</p>
                {canEdit && (
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate(`/Invoices?student=${id}`)}>
                    <Plus className="w-4 h-4 mr-1" /> Create Invoice
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Legacy payment records */}
          {studentPayments.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Payment Records</p>
              {studentPayments.map(payment => {
                const course = courses.find(c => c.id === payment.course_id);
                const statusColors = { paid: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700', overdue: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-700' };
                const statusLabels = { paid: 'Paid', pending: 'Pending', overdue: 'Overdue', cancelled: 'Cancelled' };
                return (
                  <Card key={payment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Receipt className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{course?.name || 'Course'}</p>
                            <p className="text-xs text-muted-foreground">{payment.payment_date} · Installment {payment.installment_number || 1}/{payment.total_installments || 1}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <p className="font-bold text-sm">£{(payment.amount || 0).toLocaleString('en-GB')}</p>
                            <Badge className={`text-xs ${statusColors[payment.status] || 'bg-gray-100 text-gray-700'}`}>
                              {statusLabels[payment.status] || payment.status}
                            </Badge>
                          </div>
                          <Button size="sm" variant="outline" className="px-2" onClick={() => { setSelectedPaymentForPDF(payment); setShowTemplatePicker(true); }}>
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Student Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg w-full max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Full Name</Label>
                <Input className="mt-1" value={editForm.full_name || ''} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input className="mt-1" value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label>Email</Label>
                <Input className="mt-1" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>

            <div className="border rounded-xl p-3 bg-muted/30 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Enrollment Status</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <Select value={editForm.enrollment_status || 'not_started'} onValueChange={v => setEditForm(f => ({ ...f, enrollment_status: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="started">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Enrollment Date</Label>
                  <Input className="mt-1" type="date" value={editForm.enrollment_date || ''} onChange={e => setEditForm(f => ({ ...f, enrollment_date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Course Fee (£)</Label>
                  <Input className="mt-1" type="number" value={editForm.course_price || ''} onChange={e => setEditForm(f => ({ ...f, course_price: e.target.value }))} />
                </div>
                <div>
                  <Label>CEFR Level</Label>
                  <Select value={editForm.cefr_level || ''} onValueChange={v => setEditForm(f => ({ ...f, cefr_level: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {['A1','A2','B1','B2','C1','C2'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Passport/ID</Label>
                <Input className="mt-1" value={editForm.passport_number || ''} onChange={e => setEditForm(f => ({ ...f, passport_number: e.target.value }))} />
              </div>
              <div>
                <Label>Expiry</Label>
                <Input className="mt-1" type="date" value={editForm.passport_expiry || ''} onChange={e => setEditForm(f => ({ ...f, passport_expiry: e.target.value }))} />
              </div>
              <div>
                <Label>Nationality</Label>
                <Input className="mt-1" value={editForm.nationality || ''} onChange={e => setEditForm(f => ({ ...f, nationality: e.target.value }))} />
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input className="mt-1" type="date" value={editForm.date_of_birth || ''} onChange={e => setEditForm(f => ({ ...f, date_of_birth: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Address</Label>
              <Input className="mt-1" value={editForm.address || ''} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Emergency Contact Name</Label>
                <Input className="mt-1" value={editForm.emergency_contact_name || ''} onChange={e => setEditForm(f => ({ ...f, emergency_contact_name: e.target.value }))} />
              </div>
              <div>
                <Label>Emergency Phone</Label>
                <Input className="mt-1" value={editForm.emergency_contact_phone || ''} onChange={e => setEditForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} />
              </div>
              <div>
                <Label>Relationship</Label>
                <Input className="mt-1" value={editForm.emergency_contact_relation || ''} onChange={e => setEditForm(f => ({ ...f, emergency_contact_relation: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea className="mt-1" value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => { updateMutation.mutate(editForm); setShowEditDialog(false); }}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Document Dialog */}
      <Dialog open={showAddDocument} onOpenChange={setShowAddDocument}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Document Name *</Label>
              <Input className="mt-1" placeholder="Passport, ID, etc." value={newDocForm.name} onChange={e => setNewDocForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>File *</Label>
              <div className="border-2 border-dashed rounded-xl p-4 text-center mt-1">
                <input type="file" id="doc-file" className="hidden" onChange={e => setDocumentFile(e.target.files?.[0] || null)} />
                <label htmlFor="doc-file" className="cursor-pointer block">
                  <Paperclip className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{documentFile?.name || 'Choose file'}</p>
                </label>
              </div>
            </div>
            <div>
              <Label>Note</Label>
              <Input className="mt-1" value={newDocForm.notes} onChange={e => setNewDocForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAddDocument(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleAddDocument} disabled={!newDocForm.name || !documentFile}>Upload</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Template Picker */}
      {selectedPaymentForPDF && (
        <TemplatePickerDialog
          open={showTemplatePicker}
          onClose={() => { setShowTemplatePicker(false); setSelectedPaymentForPDF(null); }}
          onDownload={(templateId, opts) => handleDownloadPDF(selectedPaymentForPDF, templateId, opts)}
          templates={INVOICE_TEMPLATES}
          title="Select Invoice Template"
          type="invoice"
          studentName={student?.full_name}
          studentEmail={student?.email}
          courseName={courses.find(c => c.id === selectedPaymentForPDF.course_id)?.name}
          amount={selectedPaymentForPDF.amount}
          invoiceDate={selectedPaymentForPDF.payment_date}
          dueDate={selectedPaymentForPDF.due_date}
          status={selectedPaymentForPDF.status}
        />
      )}
    </div>
  );
}