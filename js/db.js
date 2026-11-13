'use strict';
// 2ページ共通の接続先（公開用キーのみ）
const SUPABASE_URL = 'https://gnzidhwwncqkxxjnfxhb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_6ux_AK_is4t2FBB-7aTuww_OK8qZ6NE';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const localDate = (d=new Date()) => [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const categories = ['処理','設計','創作'];
