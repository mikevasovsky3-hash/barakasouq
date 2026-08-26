const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const SUPABASE_URL = "https://wykjwznojmzlbrujikft.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5a2p3em5vam16bGJydWppa2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczODUwNTksImV4cCI6MjEwMjk2MTA1OX0.5wfUCVKV9yQan1nz2BLLLzzzy9JrBBovzVeEePg09x4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function downloadAndUploadToSupabase(imageUrl) {
  try {
    // Скачиваем оригинальный файл по ссылке
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    
    const buffer = await response.buffer();
    const fileName = `migrated_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
    const filePath = `public/${fileName}`;

    // Загружаем в бакет listings
    const { error: uploadErr } = await supabase.storage
      .from('listings')
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadErr) {
      console.error('Ошибка загрузки в Supabase:', uploadErr.message);
      return null;
    }

    const { data: pubData } = supabase.storage.from('listings').getPublicUrl(filePath);
    return pubData ? pubData.publicUrl : null;
  } catch (err) {
    console.warn(`Не удалось перенести: ${imageUrl}`, err.message);
    return null;
  }
}

async function runMigration() {
  console.log('Запуск миграции картинок в Supabase Storage...');

  const { data: ads, error } = await supabase.from('ads').select('*');
  if (error || !ads) {
    console.error('Ошибка получения объявлений:', error);
    return;
  }

  for (const ad of ads) {
    const rawImages = Array.isArray(ad.images) ? ad.images : [ad.image].filter(Boolean);
    const newImages = [];
    let changed = false;

    for (const imgUrl of rawImages) {
      // Если картинка еще на ImgBB или внешнем источнике
      if (imgUrl && !imgUrl.includes('supabase.co')) {
        console.log(`Переносим фото для товара "${ad.title}"...`);
        const newUrl = await downloadAndUploadToSupabase(imgUrl);
        if (newUrl) {
          newImages.push(newUrl);
          changed = true;
        } else {
          newImages.push(imgUrl); // Оставляем старый, если не удалось скачать
        }
      } else {
        newImages.push(imgUrl);
      }
    }

    if (changed) {
      await supabase.from('ads').update({
        images: newImages,
        image: newImages[0] || ad.image
      }).eq('id', ad.id);
      console.log(`✅ Объявление "${ad.title}" обновлено новыми ссылками Supabase!`);
    }
  }

  console.log('🎉 Миграция успешно завершена!');
}

runMigration();