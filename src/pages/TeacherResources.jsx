import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '@/lib/AuthContext';
import {
  FileText, Upload, Trash2, Download, Eye, Users, BookOpen,
  X, Check, Search, ChevronDown, File, Clock, Paperclip
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { NotificationService } from '@/lib/NotificationService';

// ─── Upload Form ────────────────────────────────────────
function UploadForm({ courses, students, onSave, onCancel, existing }) {
  const [form, setForm] = useState(existing || { name: '', description: '', category: 'lesson_material' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedCourses, setSelectedCourses] = useState(existing?.visible_courses || []);
  const [selectedStudents, setSelectedStudents] = useState(existing?.visible_students || []);
  const [shareMode, setShareMode] = useState(existing?.share_mode || 'courses');
  const [studentSearch, setStudentSearch] = useState('');
  const fileRef = useRef(null);

  const CATEGORIES = [
    { value: 'lesson_material', label: '📚 Lesson Material' },
    { value: 'homework', label: '📝 Homework' },
    { value: 'exam', label: '📋 Exam / Test' },
    { value: 'worksheet', label: '📄 Worksheet' },
    { value: 'reading', label: '📖 Reading Material' },
    { value: 'other', label: '📁 Other' },
  ];

  const filteredStudents = students.filter(s =>
    s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const toggleCourse = (id) => {
    setSelectedCourses(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };
  const toggleStudent = (id) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (!form.name) return;
    if (!existing && !file) return;
    setUploading(true);

    try {
      let fileUrl = existing?.file_url;
      let fileName = existing?.file_name;
      let fileSize = existing?.file_size;
      let fileType = existing?.file_type;

      if (file) {
        const storageRef = ref(storage, `resources/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            reject,
            async () => {
              fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
              fileName = file.name;
              fileSize = file.size;
              fileType = file.type;
              resolve();
            }
          );
        });
      }

      await onSave({
        ...form,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        share_mode: shareMode,
        visible_courses: selectedCourses,
        visible_students: selectedStudents,
      });
    } catch (err) {
      console.error('Upload error:', err);
    }
    setUploading(false);
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-5">
      <h3 className="text-lg font-bold">{existing ? 'Edit Resource' : 'Upload New Resource'}</h3>

      {/* File Drop Zone */}
      {!existing && (
        <div
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${file ? 'border-emerald-300 bg-emerald-50' : 'border-border hover:border-primary hover:bg-primary/5'}`}
        >
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.png,.mp3,.mp4" className="hidden" onChange={e => setFile(e.target.files?.[0])} />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <File className="w-8 h-8 text-emerald-600" />
              <div className="text-left">
                <p className="font-semibold text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="ml-4 text-muted-foreground hover:text-destructive">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">Click or drag file here</p>
              <p className="text-xs text-muted-foreground/60 mt-1">PDF, Word, PowerPoint, Excel, Images, Audio, Video</p>
            </>
          )}
        </div>
      )}

      {/* Name & Category */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Document Name *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. 1. Kur İngilizce Giriş Cümle Kurma Örnekleri" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Category</label>
          <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
        <textarea className="w-full border rounded-lg px-3 py-2 text-sm mt-1" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description..." />
      </div>

      {/* Visibility Settings */}
      <div className="border rounded-xl p-4 bg-slate-50">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Who can see this?</label>

        <div className="flex gap-2 mt-3 mb-4">
          {[{ v: 'courses', l: '📚 By Course', i: BookOpen }, { v: 'students', l: '👤 Specific Students', i: Users }, { v: 'both', l: '📚+👤 Course + Students', i: Users }].map(m => (
            <button key={m.v} onClick={() => setShareMode(m.v)} className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${shareMode === m.v ? 'bg-primary text-white border-primary' : 'bg-white border-border hover:border-primary/50'}`}>
              {m.l}
            </button>
          ))}
        </div>

        {/* Course Selection */}
        {(shareMode === 'courses' || shareMode === 'both') && (
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Select Courses</label>
            <div className="grid grid-cols-2 gap-2">
              {courses.map(c => (
                <button key={c.id} onClick={() => toggleCourse(c.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs text-left transition-all ${selectedCourses.includes(c.id) ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-border hover:border-blue-200'}`}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedCourses.includes(c.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                    {selectedCourses.includes(c.id) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="truncate font-medium">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Student Selection */}
        {(shareMode === 'students' || shareMode === 'both') && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Select Students</label>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
              <input className="w-full border rounded-lg pl-8 pr-3 py-1.5 text-xs" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search students..." />
            </div>
            {selectedStudents.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedStudents.map(sid => {
                  const s = students.find(st => st.id === sid);
                  return (
                    <span key={sid} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs">
                      {s?.full_name || sid}
                      <button onClick={() => toggleStudent(sid)}><X className="w-3 h-3" /></button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="max-h-40 overflow-y-auto border rounded-lg bg-white">
              {filteredStudents.map(s => (
                <button key={s.id} onClick={() => toggleStudent(s.id)} className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-slate-50 border-b last:border-0 ${selectedStudents.includes(s.id) ? 'bg-emerald-50' : ''}`}>
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedStudents.includes(s.id) ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'}`}>
                    {selectedStudents.includes(s.id) && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="font-medium">{s.full_name}</span>
                  <span className="text-muted-foreground ml-auto">{s.email}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Progress */}
      {uploading && (
        <div className="space-y-1">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground text-center">{progress}% uploading...</p>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={uploading}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit} disabled={uploading || (!existing && !file) || !form.name}>
          <Upload className="w-4 h-4 mr-2" />
          {existing ? 'Update' : 'Upload & Share'}
        </Button>
      </div>
    </div>
  );
}

// ─── Resource Card ──────────────────────────────────────
function ResourceCard({ resource, courses, students, isTeacher, onDelete, onDownload }) {
  const categoryLabels = { lesson_material: '📚 Lesson', homework: '📝 Homework', exam: '📋 Exam', worksheet: '📄 Worksheet', reading: '📖 Reading', other: '📁 Other' };
  const sharedWith = [];
  if (resource.visible_courses?.length) {
    resource.visible_courses.forEach(cid => {
      const c = courses.find(co => co.id === cid);
      if (c) sharedWith.push(c.name);
    });
  }
  if (resource.visible_students?.length) {
    sharedWith.push(`${resource.visible_students.length} student(s)`);
  }

  return (
    <div className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow group">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{resource.name}</h4>
          {resource.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{resource.description}</p>}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>{categoryLabels[resource.category] || resource.category}</span>
            <span>•</span>
            <span>{resource.file_name}</span>
            {resource.file_size && <><span>•</span><span>{(resource.file_size / 1024 / 1024).toFixed(1)} MB</span></>}
          </div>
          {sharedWith.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Eye className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-blue-600">{sharedWith.join(', ')}</span>
            </div>
          )}
          {resource.teacher_name && (
            <div className="flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">by {resource.teacher_name} • {new Date(resource.created_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onDownload(resource)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Download">
            <Download className="w-4 h-4" />
          </button>
          {isTeacher && (
            <button onClick={() => onDelete(resource)} className="p-1.5 rounded-lg hover:bg-red-50 text-destructive" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────
export default function TeacherResources() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [resources, setResources] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');

  const role = user?.matched_role || user?.role;
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const isAdmin = ['admin', 'team_admin'].includes(role);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, crs, sts] = await Promise.all([
        base44.entities.Resource.filter({}),
        base44.entities.Course.filter({}),
        base44.entities.Student.filter({}),
      ]);

      // Filter resources based on role
      let filtered = res;
      if (isStudent) {
        filtered = res.filter(r => {
          if (r.visible_students?.includes(user.id)) return true;
          if (r.visible_courses?.some(cid => {
            const course = crs.find(c => c.id === cid);
            return course?.enrolled_students?.includes(user.id);
          })) return true;
          return false;
        });
      } else if (isTeacher) {
        filtered = res.filter(r => r.teacher_id === user.id || r.teacher_email === user.email);
      }
      // Admin sees all

      setResources(filtered);
      setCourses(crs);
      setStudents(sts);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSave = async (data) => {
    try {
      await base44.entities.Resource.create({
        ...data,
        teacher_id: user.id,
        teacher_email: user.email,
        teacher_name: user.full_name,
      });

      // Send notification to affected students
      try {
        const recipientEmails = new Set();
        // Students from selected courses
        if (data.visible_courses?.length) {
          for (const cid of data.visible_courses) {
            const course = courses.find(c => c.id === cid);
            if (course?.enrolled_students?.length) {
              for (const sid of course.enrolled_students) {
                const s = students.find(st => st.id === sid);
                if (s?.email) recipientEmails.add(s.email);
              }
            }
          }
        }
        // Directly selected students
        if (data.visible_students?.length) {
          for (const sid of data.visible_students) {
            const s = students.find(st => st.id === sid);
            if (s?.email) recipientEmails.add(s.email);
          }
        }
        if (recipientEmails.size > 0) {
          await NotificationService.sendNewResource({
            teacherName: user.full_name,
            resourceName: data.name,
            recipientEmails: [...recipientEmails],
          });
        }
      } catch (notifErr) {
        console.error('Notification send error:', notifErr);
      }

      toast({ title: '✅ Resource shared!' });
      setShowForm(false);
      loadData();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (resource) => {
    if (!confirm('Delete this resource?')) return;
    try {
      if (resource.file_url) {
        try { await deleteObject(ref(storage, resource.file_url)); } catch {}
      }
      await base44.entities.Resource.delete(resource.id);
      toast({ title: 'Resource deleted' });
      loadData();
    } catch (err) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
  };

  const handleDownload = (resource) => {
    if (resource.file_url) window.open(resource.file_url, '_blank');
  };

  const categories = ['all', 'lesson_material', 'homework', 'exam', 'worksheet', 'reading', 'other'];
  const categoryLabels = { all: 'All', lesson_material: 'Lessons', homework: 'Homework', exam: 'Exams', worksheet: 'Worksheets', reading: 'Reading', other: 'Other' };
  const filtered = filter === 'all' ? resources : resources.filter(r => r.category === filter);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Paperclip className="w-7 h-7 text-primary" />
            {isStudent ? 'My Resources' : 'Share Resources'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isStudent ? 'Documents shared by your teachers' : 'Upload and share documents with your students'}
          </p>
        </div>
        {(isTeacher || isAdmin) && !showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Upload className="w-4 h-4 mr-2" /> Upload Document
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <UploadForm courses={courses} students={students} onSave={handleSave} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${filter === c ? 'bg-primary text-white' : 'bg-slate-100 text-muted-foreground hover:bg-slate-200'}`}>
            {categoryLabels[c]}
          </button>
        ))}
      </div>

      {/* Resource List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">{isStudent ? 'No resources shared with you yet.' : 'No resources uploaded yet.'}</p>
          {(isTeacher || isAdmin) && <Button variant="outline" className="mt-3" onClick={() => setShowForm(true)}>Upload First Document</Button>}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(r => (
            <ResourceCard key={r.id} resource={r} courses={courses} students={students} isTeacher={isTeacher || isAdmin} onDelete={handleDelete} onDownload={handleDownload} />
          ))}
        </div>
      )}
    </div>
  );
}
