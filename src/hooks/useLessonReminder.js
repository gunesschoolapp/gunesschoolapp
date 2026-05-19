import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { NotificationService } from '@/lib/NotificationService';

/**
 * useLessonReminder — Hook that checks for upcoming lessons every minute
 * and sends a 15-minute-before reminder notification.
 * 
 * Must be mounted in a component that stays alive (e.g. Layout).
 */
export function useLessonReminder(user) {
  const sentRef = useRef(new Set()); // Track already-sent reminders

  useEffect(() => {
    if (!user) return;
    const role = user.matched_role || user.role;
    // Only run for admin/teacher (they trigger reminders for students)
    if (!['admin', 'team_admin'].includes(role)) return;

    const checkUpcomingLessons = async () => {
      try {
        const [schedules, courses, students] = await Promise.all([
          base44.entities.Schedule.filter({}),
          base44.entities.Course.filter({}),
          base44.entities.Student.filter({}),
        ]);

        const now = new Date();
        const today = now.toLocaleDateString('en-US', { weekday: 'long' }); // Monday, Tuesday...
        const dayMap = {
          'Monday': ['Mon', 'Monday'],
          'Tuesday': ['Tue', 'Tuesday'],
          'Wednesday': ['Wed', 'Wednesday'],
          'Thursday': ['Thu', 'Thursday'],
          'Friday': ['Fri', 'Friday'],
          'Saturday': ['Sat', 'Saturday'],
          'Sunday': ['Sun', 'Sunday'],
        };

        for (const schedule of schedules) {
          // Check if lesson is today
          const schedDays = schedule.day_of_week || schedule.days || '';
          const isToday = dayMap[today]?.some(d => schedDays.toLowerCase().includes(d.toLowerCase()));
          if (!isToday) continue;

          // Parse lesson start time
          const startTime = schedule.start_time; // e.g. "09:00"
          if (!startTime) continue;

          const [h, m] = startTime.split(':').map(Number);
          const lessonTime = new Date(now);
          lessonTime.setHours(h, m, 0, 0);

          // Check if lesson is 15 minutes away (within a 2-min window)
          const diffMs = lessonTime - now;
          const diffMin = diffMs / 60000;

          if (diffMin >= 13 && diffMin <= 17) {
            // Find the course
            const course = courses.find(c => c.id === schedule.course_id);
            if (!course) continue;

            // Find enrolled students
            const enrolledIds = course.enrolled_students || [];
            const enrolledStudents = students.filter(s => enrolledIds.includes(s.id));

            for (const student of enrolledStudents) {
              const reminderKey = `${schedule.id}_${student.id}_${now.toDateString()}`;
              if (sentRef.current.has(reminderKey)) continue; // Already sent today

              const email = student.email;
              if (!email) continue;

              await NotificationService.sendLessonReminder({
                studentEmail: email,
                studentName: student.full_name,
                courseName: course.name,
                time: startTime,
                room: schedule.room || course.classroom,
              });

              sentRef.current.add(reminderKey);
              console.log(`🔔 Lesson reminder sent to ${student.full_name} for ${course.name} at ${startTime}`);
            }
          }
        }
      } catch (err) {
        console.error('Lesson reminder check error:', err);
      }
    };

    // Check immediately, then every 60 seconds
    checkUpcomingLessons();
    const interval = setInterval(checkUpcomingLessons, 60000);

    return () => clearInterval(interval);
  }, [user?.email]);
}

export default useLessonReminder;
