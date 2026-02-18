const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async (req, res) => {
  const now = new Date().toISOString();
  const { data: tasks, error } = await supabase
    .from('note')
    .select('*')
    .eq('is_done', false)
    .eq('is_deleted', false)
    .lte('due_date', now)
    .is('notified_at', null);

  if (tasks && tasks.length > 0) {
    for (const task of tasks) {
      await resend.emails.send({
        from: 'TaskSchool <onboarding@resend.dev>',
        to: task.email,
        subject: `⏰ ถึงเวลาส่งงาน ${task.title}`,
        html: `<p>แจ้งเตือนงาน: <strong>${task.title}</strong> ถึงกำหนดส่งแล้ว!</p>`
      });
      await supabase.from('note').update({ notified_at: new Date().toISOString() }).eq('id', task.id);
    }
  }
  res.status(200).send('Cron Job Executed');
};
