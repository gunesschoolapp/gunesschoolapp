import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export const DEFAULT_CLASSROOMS = [
  { id: 'sinif1', label: 'Sınıf 1', floor: 'Üst Kat', icon: '🏫', color: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  { id: 'sinif2', label: 'Sınıf 2', floor: 'Üst Kat', icon: '🏫', color: 'bg-violet-50 border-violet-200', badge: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  { id: 'sinif3', label: 'Sınıf 3', floor: 'Alt Kat',  icon: '🏢', color: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
];

export async function seedClassrooms() {
  for (const c of DEFAULT_CLASSROOMS) {
    const ref = doc(db, 'Classroom', c.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        label: c.label,
        floor: c.floor,
        icon: c.icon,
        color: c.color,
        badge: c.badge,
        dot: c.dot,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString()
      });
    }
  }
}

export function useClassroomsQuery() {
  return useQuery({
    queryKey: ['classrooms'],
    queryFn: async () => {
      try {
        await seedClassrooms();
      } catch (err) {
        console.error('Failed to seed classrooms:', err);
      }
      const list = await base44.entities.Classroom.list();
      return list.length === 0 ? DEFAULT_CLASSROOMS : list;
    }
  });
}

export const getClassroomOptions = (classrooms) => {
  return [
    ...classrooms.map(c => ({ value: c.id, label: `${c.label} (${c.floor})` })),
    { value: 'online', label: 'Online' },
  ];
};
