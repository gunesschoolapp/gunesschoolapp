import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Search, FileText, Video, Link2, Image,
  Download, ExternalLink, Trash2, Upload, BookOpen, Filter
} from 'lucide-react';
import { useCurrentUser } from '@/lib/useCurrentUser';

const TYPE_ICONS = {
  document: FileText,
  video: Video,
  link: Link2,
  image: Image,
};

const TYPE_COLORS = {
  document: 'bg-blue-100 text-blue-700',
  video: 'bg-red-100 text-red-700',
  link: 'bg-green-100 text-green-700',
  image: 'bg-purple-100 text-purple-700',
};

const CATEGORY_LABELS = {
  grammar: 'Grammar', vocabulary: 'Vocabulary', listening: 'Listening',
  reading: 'Reading', writing: 'Writing', speaking: 'Speaking',
  ielts: 'IELTS', general: 'General', other: 'Other',
};

const LEVEL_COLORS = {
  A1: 'bg-emerald-100 text-emerald-700', A2: 'bg-emerald-100 text-emerald-700',
  B1: 'bg-amber-100 text-amber-700', B2: 'bg-amber-100 text-amber-700',
  C1: 'bg-red-100 text-red-700', C2: 'bg-red-100 text-red-700',
  all: 'bg-gray-100 text-gray-600',
};

export default function ResourceLibrary() {
  const { user } = useCurrentUser();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', type: 'document', category: 'general',
    cefr_level: 'all', link_url: '', visible_to: 'all', tags: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);

  const role = user?.matched_role || user?.role;
  const canUpload = ['admin', 'team_admin', 'teacher'].includes(role);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    setLoading(true);
    const data = await base44.entities.Resource.list('-created_date', 100);
    setResources(data);
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!form.title) return;
    setUploading(true);
    let file_url = '';
    if (selectedFile) {
      const result = await base44.integrations.Core.UploadFile({ file: selectedFile });
      file_url = result.file_url;
    }
    await base44.entities.Resource.create({
      ...form,
      file_url,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      uploaded_by_name: user?.full_name || user?.email,
      uploaded_by_email: user?.email,
      download_count: 0,
    });
    setShowUpload(false);
    setForm({ title: '', description: '', type: 'document', category: 'general', cefr_level: 'all', link_url: '', visible_to: 'all', tags: '' });
    setSelectedFile(null);
    loadResources();
    setUploading(false);
  };

  const handleAccess = async (resource) => {
    await base44.entities.Resource.update(resource.id, { download_count: (resource.download_count || 0) + 1 });
    if (resource.file_url) {
      window.open(resource.file_url, '_blank');
    } else if (resource.link_url) {
      window.open(resource.link_url, '_blank');
    }
    setResources(prev => prev.map(r => r.id === resource.id ? { ...r, download_count: (r.download_count || 0) + 1 } : r));
  };

  const handleDelete = async (id) => {
    await base44.entities.Resource.delete(id);
    setResources(prev => prev.filter(r => r.id !== id));
  };

  const filtered = resources.filter(r => {
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()) ||
      r.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchType = filterType === 'all' || r.type === filterType;
    const matchCat = filterCategory === 'all' || r.category === filterCategory;
    const matchLevel = filterLevel === 'all' || r.cefr_level === filterLevel || r.cefr_level === 'all';
    return matchSearch && matchType && matchCat && matchLevel;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Resource Library</h1>
            <p className="text-sm text-muted-foreground">{resources.length} materials available</p>
          </div>
        </div>
        {canUpload && (
          <Button onClick={() => setShowUpload(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Resource
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search resources..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="document">Document</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="link">Link</SelectItem>
            <SelectItem value="image">Image</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {['A1','A2','B1','B2','C1','C2'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No resources found</p>
          <p className="text-sm">Try adjusting your filters or upload the first resource</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(resource => {
            const Icon = TYPE_ICONS[resource.type] || FileText;
            return (
              <Card key={resource.id} className="group hover:shadow-md transition-all duration-200 border border-border">
                <CardContent className="p-4 flex flex-col h-full gap-3">
                  {/* Type icon + badges */}
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${TYPE_COLORS[resource.type] || 'bg-gray-100 text-gray-600'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {resource.cefr_level && resource.cefr_level !== 'all' && (
                        <Badge className={`text-[10px] px-1.5 py-0 border-0 ${LEVEL_COLORS[resource.cefr_level]}`}>{resource.cefr_level}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Title + description */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-2">{resource.title}</h3>
                    {resource.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{resource.description}</p>
                    )}
                  </div>

                  {/* Category + uploader */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="bg-secondary px-2 py-0.5 rounded-full capitalize">{CATEGORY_LABELS[resource.category] || resource.category}</span>
                    <span className="truncate max-w-[80px]">{resource.uploaded_by_name}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm" className="flex-1 h-8 text-xs gap-1.5"
                      onClick={() => handleAccess(resource)}
                    >
                      {resource.file_url ? <><Download className="w-3 h-3" /> Open</> : <><ExternalLink className="w-3 h-3" /> Visit</>}
                    </Button>
                    {canUpload && resource.uploaded_by_email === user?.email && (
                      <Button
                        size="icon" variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(resource.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  {resource.download_count > 0 && (
                    <p className="text-[10px] text-muted-foreground text-center -mt-1">{resource.download_count} access{resource.download_count !== 1 ? 'es' : ''}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Title *</Label>
                <Input placeholder="Resource title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="link">Link</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>CEFR Level</Label>
                <Select value={form.cefr_level} onValueChange={v => setForm(p => ({ ...p, cefr_level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {['A1','A2','B1','B2','C1','C2'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Visibility</Label>
                <Select value={form.visible_to} onValueChange={v => setForm(p => ({ ...p, visible_to: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="students_only">Students Only</SelectItem>
                    <SelectItem value="staff_only">Staff Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(form.type === 'link' || form.type === 'video') && (
                <div className="col-span-2 space-y-1">
                  <Label>URL</Label>
                  <Input placeholder="https://..." value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))} />
                </div>
              )}
              {(form.type === 'document' || form.type === 'image') && (
                <div className="col-span-2 space-y-1">
                  <Label>Upload File</Label>
                  <input
                    type="file"
                    className="w-full text-sm border border-input rounded-md px-3 py-2 cursor-pointer"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </div>
              )}
              <div className="col-span-2 space-y-1">
                <Label>Description</Label>
                <Textarea placeholder="Brief description..." rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Tags <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                <Input placeholder="grammar, present tense, exercises" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
              <Button onClick={handleUpload} disabled={uploading || !form.title} className="gap-2">
                {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Uploading...' : 'Add Resource'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}