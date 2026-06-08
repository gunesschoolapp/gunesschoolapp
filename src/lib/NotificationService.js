import { base44 } from '@/api/base44Client';

/**
 * NotificationService — Centralized helper for creating in-app notifications.
 * Notifications are stored in Firestore `Notification` collection and displayed
 * in the sidebar badge + NotificationCenter page.
 */

export const NotificationService = {

  /**
   * Create a notification for one or more recipients.
   * @param {Object} opts
   * @param {string} opts.title - Short title
   * @param {string} opts.message - Full message body
   * @param {string} opts.type - lesson_reminder | new_resource | payment | announcement | custom
   * @param {string} opts.icon - Emoji icon for display
   * @param {string[]} opts.recipients - Array of student emails OR 'all'
   * @param {string} [opts.link] - Optional link (e.g. '/Resources')
   * @param {string} [opts.sent_by] - Name of sender
   */
  async send({ title, message, type = 'announcement', icon = '🔔', recipients = [], link = '', sent_by = 'System', image_url = '', is_popup = false }) {
    const recipientList = Array.isArray(recipients) ? recipients : [recipients];

    const promises = recipientList.map(recipient =>
      base44.entities.Notification.create({
        notification_type: type,
        channel: 'in_app',
        message: `${icon} ${title}\n${message}`,
        title,
        status: 'sent',
        read: false,
        recipient_email: recipient,
        recipient_type: 'student',
        link,
        sent_by,
        sent_at: new Date().toISOString(),
        image_url,
        is_popup,
      })
    );

    return Promise.all(promises);
  },

  /**
   * Send lesson reminder (15 min before class).
   */
  async sendLessonReminder({ studentEmail, studentName, courseName, time, room }) {
    return this.send({
      title: 'Lesson Starting Soon!',
      message: `${courseName} starts at ${time}${room ? ` in ${room}` : ''}. Get ready!`,
      type: 'lesson_reminder',
      icon: '⏰',
      recipients: [studentEmail],
      link: '/StudentSelfPortal',
      sent_by: 'Auto Reminder',
    });
  },

  /**
   * Send new resource notification to specific students.
   */
  async sendNewResource({ teacherName, resourceName, recipientEmails }) {
    return this.send({
      title: 'New Resource Available',
      message: `${teacherName} shared "${resourceName}". Check your Resources page.`,
      type: 'new_resource',
      icon: '📄',
      recipients: recipientEmails,
      link: '/Resources',
      sent_by: teacherName,
    });
  },

  /**
   * Send payment confirmation notification.
   */
  async sendPaymentConfirmation({ studentEmail, packageName, amount }) {
    return this.send({
      title: 'Payment Confirmed',
      message: `Your payment of £${amount} for "${packageName}" has been received. Welcome aboard!`,
      type: 'payment',
      icon: '✅',
      recipients: [studentEmail],
      link: '/Packages',
      sent_by: 'System',
    });
  },

  /**
   * Admin custom notification.
   */
  async sendCustom({ title, message, icon = '📢', recipientEmails, sentBy = 'Admin', image_url = '', is_popup = false }) {
    return this.send({
      title,
      message,
      type: 'custom',
      icon,
      recipients: recipientEmails,
      sent_by: sentBy,
      image_url,
      is_popup,
    });
  },
};

export default NotificationService;
