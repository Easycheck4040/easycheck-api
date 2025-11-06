// lib/supabase.js
(function () {
  // 👉 Teus valores do Supabase:
  window.SUPABASE_URL  = 'https://linvygzacxppsharyxvi.supabase.co';
  window.SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnZ5Z3phY3hwcHNoYXJ5eHZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTAzNzMsImV4cCI6MjA3ODAyNjM3M30.7ED_uLD-M0aH1qr7M1WQGYtnU5qIAD6BR5j7MQzFIvI';

  // Carrega o SDK via CDN e expõe sbReady/sb
  const load = new Promise((resolve, reject) => {
    if (window.supabase) return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Falha a carregar supabase-js'));
    document.head.appendChild(s);
  });

  window.sbReady = (async () => {
    await load;
    window.sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON);
    return window.sb;
  })();
})();
