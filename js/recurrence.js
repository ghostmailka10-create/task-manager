'use strict';
// 日付はローカル日付を使用。日付文字列をUTCとして解釈しない。
function parseLocalDate(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12)}
function addLocalDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function nthWeekday(d){return Math.floor((d.getDate()-1)/7)+1}
function isLastWeekday(d){const x=addLocalDays(d,7);return x.getMonth()!==d.getMonth()}
function ruleMatches(rule,date){
  const w=date.getDay(),day=date.getDate(),month=date.getMonth()+1;
  if(rule.repeat_type==='weekly')return (rule.weekdays||[]).includes(w);
  if(rule.repeat_type==='nth_weekday')return w===rule.weekday&&((rule.nths||[]).includes(nthWeekday(date))||((rule.nths||[]).includes(-1)&&isLastWeekday(date)));
  if(rule.repeat_type==='monthly')return day===rule.month_day;
  if(rule.repeat_type==='yearly')return month===rule.year_month&&day===rule.year_day;
  return false;
}
async function allRecurringRules(uid){
  const all=[];const size=500;
  for(let from=0;;from+=size){
    const {data,error}=await db.from('recurring_rules').select('*').eq('user_id',uid).order('created_at',{ascending:true}).order('id',{ascending:true}).range(from,from+size-1);
    if(error)throw error;
    all.push(...data);
    if(data.length<size)return all;
    if(from>100000)throw new Error('繰り返し設定が多すぎます');
  }
}
async function generateRecurringTasks(uid){
  const rules=(await allRecurringRules(uid)).filter(r=>r.enabled);
  const today=parseLocalDate(localDate());
  let created=0;
  for(const rule of rules){
    const start=parseLocalDate(rule.start_date);
    const until=addLocalDays(today,rule.lead_days||0);
    const days=Math.round((until-start)/86400000);
    // 異常に古い開始日は無断で一部を捨てず、明示的にエラーを出す。
    if(days>366*5)throw new Error('「'+rule.content+'」の開始日が5年以上前です。繰り返し設定の開始日を確認してください。');
    if(days<0)continue;
    const rows=[];
    for(let i=0;i<=days;i++){
      const due=addLocalDays(start,i);
      if(!ruleMatches(rule,due))continue;
      const occurrence=localDate(due);
      const registered=localDate(addLocalDays(due,-(rule.lead_days||0)));
      // 先行登録日が未来ならまだ作らない
      if(registered>localDate(today))continue;
      rows.push({id:crypto.randomUUID(),user_id:uid,content:rule.content,category:rule.category,registered,completed:null,recurring_rule_id:rule.id,occurrence_date:occurrence});
    }
    for(let i=0;i<rows.length;i+=100){
      // UNIQUE(user_id,recurring_rule_id,occurrence_date)で同一予定日の二重生成を防止
      const {error}=await db.from('tasks').upsert(rows.slice(i,i+100),{onConflict:'user_id,recurring_rule_id,occurrence_date',ignoreDuplicates:true});
      if(error)throw new Error('「'+rule.content+'」の自動生成に失敗：'+error.message);
      created+=Math.min(100,rows.length-i); // 処理件数（新規件数とは限らない）
    }
  }
  return created;
}
