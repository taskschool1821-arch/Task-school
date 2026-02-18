const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

// ดึงค่าจาก Environment Variables (เดี๋ยวเราไปตั้งค่าใน Render)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

async function checkAndSend() {
  console.log("Checking for tasks...");
  const now = new Date().toISOString();
  
  // ดึงงานที่ถึงกำหนดและยังไม่เคยแจ้งเตือน
  const { data: tasks, error } = await supabase
    .from('note')
    .select('*')
    .eq('is_done', false)
    .eq('is_deleted', false)
    .lte('due_date', now) 
    .is('notified_at', null);

  if (error) {
    console.error("Error fetching tasks:", error);
    return;
  }

  if (tasks && tasks.length > 0) {
    for (const task of tasks) {
      try {
        await resend.emails.send({
          from: 'TaskSchool <onboarding@resend.dev>',
          to: task.email,
          subject: `⏰ ถึงเวลาส่งงาน: ${task.title}`,
          html: `<p>แจ้งเตือนงาน: <strong>${task.title}</strong> ถึงกำหนดส่งแล้ว!</p>`
        });

        // อัปเดตว่าแจ้งเตือนแล้ว
        await supabase
          .from('note')
          .update({ notified_at: new Date().toISOString() })
          .eq('id', task.id);
        
        console.log(`Successfully notified: ${task.title}`);
      } catch (err) {
        console.error("Failed to send email:", err);
      }
    }
  }
}

// ทำงานทุก 1 นาที
setInterval(checkAndSend, 60000);