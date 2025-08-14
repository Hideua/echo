const { createClient } = require('@supabase/supabase-js');
const Resend = require('resend').Resend;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async (req, res) => {
  try {
    // Авторизация по секрету
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 1. Получаем pending доставки, время которых прошло
    const { data: deliveries, error } = await supabase
      .from('deliveries')
      .select('id, message:messages(content, recipients(email))')
      .eq('status', 'pending')
      .lte('deliver_at', new Date().toISOString());

    if (error) throw error;

    if (!deliveries.length) {
      return res.status(200).json({ status: 'No deliveries to send' });
    }

    // 2. Отправляем письма
    for (const delivery of deliveries) {
      const { message } = delivery;
      const recipientEmail = message.recipients.email;

      await resend.emails.send({
        from: 'Echo <no-reply@echo.app>',
        to: recipientEmail,
        subject: 'You have a new Echo message',
        text: message.content
      });

      // 3. Обновляем статус
      await supabase
        .from('deliveries')
        .update({ status: 'sent' })
        .eq('id', delivery.id);
    }

    res.status(200).json({ status: 'Deliveries sent', count: deliveries.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
