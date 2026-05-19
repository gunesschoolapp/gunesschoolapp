import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';

export default function PublicLeadForm() {
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', nationality: '',
    current_level: 'unknown', interested_course: '',
    message: '', how_did_you_hear: 'website',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await base44.entities.FormSubmission.create({ ...form, form_type: 'lead', status: 'new' });
    // Also create a Lead record
    await base44.entities.Lead.create({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      source: form.how_did_you_hear === 'website' ? 'website' : form.how_did_you_hear === 'social_media' ? 'social_media' : 'walk_in',
      interest_level: form.current_level,
      notes: form.message,
      status: 'new',
    });
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank you!</h2>
          <p className="text-gray-500">We have received your enquiry and will contact you shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Güneş English School</h1>
          <p className="text-gray-500 mt-1">Enquiry Form — We'll get back to you soon!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Full Name *</Label>
              <Input className="mt-1" placeholder="Your full name" required value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
            </div>
            <div>
              <Label>Email *</Label>
              <Input className="mt-1" type="email" placeholder="your@email.com" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input className="mt-1" placeholder="+44 7700 000000" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div>
              <Label>Nationality</Label>
              <Input className="mt-1" placeholder="e.g. Turkish" value={form.nationality} onChange={e => setForm({...form, nationality: e.target.value})} />
            </div>
            <div>
              <Label>Current English Level</Label>
              <Select value={form.current_level} onValueChange={v => setForm({...form, current_level: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">I don't know</SelectItem>
                  <SelectItem value="A1">A1 — Beginner</SelectItem>
                  <SelectItem value="A2">A2 — Elementary</SelectItem>
                  <SelectItem value="B1">B1 — Intermediate</SelectItem>
                  <SelectItem value="B2">B2 — Upper-Intermediate</SelectItem>
                  <SelectItem value="C1">C1 — Advanced</SelectItem>
                  <SelectItem value="C2">C2 — Proficient</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Which course are you interested in?</Label>
              <Input className="mt-1" placeholder="e.g. General English, IELTS, Kids..." value={form.interested_course} onChange={e => setForm({...form, interested_course: e.target.value})} />
            </div>
            <div className="col-span-2">
              <Label>How did you hear about us?</Label>
              <Select value={form.how_did_you_hear} onValueChange={v => setForm({...form, how_did_you_hear: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="referral">Friend / Referral</SelectItem>
                  <SelectItem value="walk_in">Walk-in</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Message</Label>
              <textarea
                className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] resize-none"
                placeholder="Any questions or additional information..."
                value={form.message}
                onChange={e => setForm({...form, message: e.target.value})}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending...' : 'Send Enquiry'}
          </Button>
        </form>
      </div>
    </div>
  );
}