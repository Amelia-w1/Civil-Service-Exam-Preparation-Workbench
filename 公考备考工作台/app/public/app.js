// 公考备考工作台 · 前端逻辑（桌面端 · 左侧导航）
let S = null;
let curPage = 'today';

const $ = s => document.querySelector(s);
function esc(s){return (s==null?'':String(s)).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),1600);}
async function api(method,path,body){const r=await fetch(path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return r.json();}
function daysLeft(d){
  if(!d)return null;
  // 兼容 "2027-3-10" / "2027/3/10" 等非标准格式，避免返回 NaN
  const m=String(d).match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  let dt;
  if(m){dt=new Date(+m[1],+m[2]-1,+m[3]);}
  else{dt=new Date(d);}
  if(isNaN(dt.getTime()))return null;
  const ms=dt.setHours(0,0,0,0)-new Date().setHours(0,0,0,0);
  return Math.ceil(ms/86400000);
}
function pct(x,y){return y?Math.round(x/y*100):0}

async function boot(){
  await refresh();
  bindNav();
  bindTab();
  bindTopbar();
  render();
  // 顶栏日期
  const d=new Date();
  $('#tbDate').textContent=d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日';
  $('#tbWday').textContent='周'+'日一二三四五六'[d.getDay()];
}
async function refresh(){S=await api('GET','/api/state');}

// 错题录入的待上传图片数组（存的是后端返回的 URL）
let eAddImages=[];

function renderErrPreview(){
  const box=$('#e_preview');
  if(!box)return;
  box.innerHTML = eAddImages.length
    ? eAddImages.map((url,i)=>`<div class="thumb-box"><img src="${esc(url)}" alt="原题 ${i+1}"><button class="thumb-x" data-rm="${i}" title="移除">×</button></div>`).join('')
    : '';
  box.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{ eAddImages.splice(+b.dataset.rm,1); renderErrPreview(); });
}
async function uploadFiles(fileList){
  if(!fileList||!fileList.length)return;
  for(const f of fileList){
    if(!f.type.startsWith('image/')){toast('仅支持图片');continue;}
    if(f.size>8*1024*1024){toast(f.name+' 超过 8MB');continue;}
    const data = await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f);});
    const r = await api('POST','/api/upload',{data,name:f.name});
    if(r&&r.url){ eAddImages.push(r.url); renderErrPreview(); }
    else { toast('上传失败：'+(r&&r.error||'未知错误')); }
  }
}

function bindNav(){
  document.querySelectorAll('.nav-item').forEach(el=>el.onclick=()=>{
    document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));
    el.classList.add('active');curPage=el.dataset.page;render();
  });
}
function bindTopbar(){
  $('#exportBtn').onclick=()=>{
    const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download='公考数据_'+new Date().toISOString().slice(0,10)+'.json';a.click();
    toast('数据已导出');
  };
  $('#importBtn').onclick=()=>$('#fileImport').click();
  $('#fileImport').onchange=async(e)=>{
    const f=e.target.files[0];if(!f)return;
    const txt=await f.text();try{const d=JSON.parse(txt);
      await api('POST','/api/import',d);await refresh();render();toast('数据已导入');
    }catch(err){toast('文件格式错误');}
  };
}

function bindTab(){
  document.querySelectorAll('.tab-item').forEach(el=>el.onclick=()=>{ curPage=el.dataset.page; render(); });
}
function bindMore(){
  document.querySelectorAll('.more-item').forEach(el=>el.onclick=()=>{ curPage=el.dataset.page; render(); });
}
function updateActive(){
  const tabs=['today','xingce','quiz','error'];
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page===curPage));
  document.querySelectorAll('.tab-item').forEach(t=>{
    const on = tabs.includes(t.dataset.page) ? t.dataset.page===curPage
            : (t.dataset.page==='more' && !tabs.includes(curPage));
    t.classList.toggle('active', on);
  });
}
function viewMore(){
  const items=[
    {p:'checkin',icon:'📅',name:'月打卡'},
    {p:'countdown',icon:'⏰',name:'考试倒计时'},
    {p:'shenlun',icon:'✍️',name:'申论素材'},
    {p:'politics',icon:'📰',name:'时政热点'},
    {p:'weakpoint',icon:'🔍',name:'易错考点'},
    {p:'mock',icon:'📈',name:'模考分析'},
    {p:'overview',icon:'📊',name:'全局进度'},
    {p:'settings',icon:'⚙️',name:'设置'}
  ];
  const grid=items.map(x=>`<div class="more-item" data-page="${x.p}"><div class="mi-icon">${x.icon}</div><div class="mi-name">${x.name}</div></div>`).join('');
  return `
  <div class="page-head"><div><h2>☰ 全部功能</h2><div class="sub">更多备考模块</div></div></div>
  <div class="more-grid">${grid}</div>
  <div class="card" style="margin-top:16px">
    <div class="card-title"><span class="icon">📱</span>手机 App 提示</div>
    <div class="bullet">浏览器打开后，点「分享 / ⋯」→「<b>添加到主屏幕</b>」，即可像 App 一样从主屏启动。</div>
    <div class="bullet">需通过 <b>https</b> 地址访问（内网穿透 / 虚拟组网）才能安装；用电脑 IP 的 http 只能当书签。</div>
  </div>`;
}

function render(){
  // 顶栏计数
  const p=S.profile;
  $('#cntGk').textContent=daysLeft(p.gkDate)??'—';
  $('#cntSk').textContent=daysLeft(p.skDate)??'—';
  const checkIns=S.progress.checkIns||[];
  const todayS=todayStr();
  $('#cntDay').textContent=checkIns.length?checkIns.length:(S.progress.totalDays||1);
  $('#brandStage').textContent=(p.gkDate?'国考+省考':'公考')+' · '+(p.stage||'基础学习期');
  // 今日完成度
  const t=S.today,prog=S.progress;
  const done=prog.today&&prog.today.date===t.date?prog.today.completed:[];
  $('#todayDone').textContent=Math.round(done.length/t.tasks.length*100)+'%';

  // 渲染页面
  const screen=$('#screen');
  let view;
  if(curPage==='more') view=viewMore;
  else view={today:viewToday,overview:viewOverview,countdown:viewCountdown,xingce:viewXingce,
    error:viewError,politics:viewPolitics,weakpoint:viewWeakpoint,shenlun:viewShenlun,
    mock:viewMock,settings:viewSettings,quiz:viewQuiz,checkin:viewCheckin}[curPage]||viewToday;
  screen.innerHTML=view();
  screen.classList.remove('fade');void screen.offsetWidth;screen.classList.add('fade');
  bindActions();
  bindMore();
  updateActive();
}

function todayStr(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}

/* ============ 页面：每日任务 ============ */
function viewToday(){
  const t=S.today;
  const prog=S.progress;
  const done=prog.today&&prog.today.date===t.date?prog.today.completed:[];
  const tasks=t.tasks.map(x=>`<div class="task ${done.includes(x.id)?'done':''}" data-task="${x.id}">
    <div class="box">${done.includes(x.id)?'✓':''}</div><div class="tname">${esc(x.name)}</div><span class="tkind">${esc(x.kind)}</span></div>`).join('');
  const pts=t.knowledge.points.map(x=>`<div class="bullet">${esc(x)}</div>`).join('');
  const drill=t.drill.map(x=>`<div class="bullet">${esc(x)}</div>`).join('');
  const words=t.shenlun.dailyWords.map(w=>`<div class="bullet"><b>${esc(w.oral)}</b> → <span style="color:var(--brand)">${esc(w.standard)}</span> <span class="muted">（${esc(w.topic)}）</span></div>`).join('')||'<div class="muted">暂无</div>';
  const quote=t.shenlun.dailyQuote?`<div class="quote">${esc(t.shenlun.dailyQuote.text)}</div><div class="muted">适用话题：${esc(t.shenlun.dailyQuote.topic)}（${esc(t.shenlun.dailyQuote.pos)}）</div>`:'<div class="muted">暂无金句</div>';
  const review=t.reviewDue&&t.reviewDue.length?t.reviewDue.map(e=>`<div class="err-item"><div class="eh">${esc(e.module)} · ${esc(e.point)} <button class="btn sm" data-review="${e.id}">复盘</button></div><div class="eb">${esc(e.solution||'')}</div></div>`).join(''):'<div class="muted">暂无待复盘错题。</div>';

  return `
  <div class="page-head"><div><h2>📅 今日备考</h2><div class="sub">${esc(t.date)} · 重点模块：<b style="color:var(--brand)">${esc(t.focus)}</b></div></div>
    <div class="right-action">
      <div class="stat" style="min-width:110px"><div class="num">${Math.round(done.length/t.tasks.length*100)}%</div><div class="lbl">任务完成</div></div>
    </div></div>

  <div class="card">
    <div class="card-title"><span class="icon">✅</span>今日任务 <span class="tag">${t.tasks.length}项</span></div>
    <div class="task-list">${tasks}</div>
  </div>

  <div class="row2">
  <div class="card">
    <div class="card-title"><span class="icon">📖</span>知识点 · ${esc(t.knowledge.title)} ${t.weak ? '<span class="tag" style="background:#E07F8E;color:#fff">🔥 薄弱强化</span>' : ''}</div>
      ${t.weakHint ? '<div class="section-label" style="color:#E07F8E">' + esc(t.weakHint) + '</div>' : ''}
      ${pts}
  </div>
    <div class="card">
      <div class="card-title"><span class="icon">📝</span>刷题重点</div>
      ${drill}
      <div class="row2" style="margin-top:10px">
        <input class="input" id="qnum" type="number" placeholder="今日刷题量(题)">
        <button class="btn" id="qlog">记录</button>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-title"><span class="icon">📕</span>错题复盘 <span class="tag">待复盘 ${t.reviewDue.length}</span></div>
    ${review}
  </div>

  <div class="row2">
    <div class="card">
      <div class="card-title"><span class="icon">📝</span>申论 · 规范词 <span class="tag">口语→公考表达</span></div>
      ${words}
    </div>
    <div class="card">
      <div class="card-title"><span class="icon">💡</span>申论 · 今日金句</div>
      ${quote}
    </div>
  </div>

  <div class="card">
    <div class="card-title"><span class="icon">➡️</span>明日规划</div>
    <div class="bullet">${esc(t.tomorrow)}</div>
  </div>`;
}

/* ============ 页面：今日总览 ============ */
function viewOverview(){
  const p=S.progress,mp=p.moduleProgress||{};
  const modBars=Object.keys(mp).map(m=>{const v=Math.min(100,(mp[m].mastered||0)*20);
    return `<div class="section-label">${esc(m)} · ${esc(mp[m].status)}</div><div class="bar"><i style="width:${v}%"></i></div>`;}).join('');
  return `
  <div class="page-head"><div><h2>📊 今日总览</h2><div class="sub">进度看板 · 一屏掌握全部数据</div></div></div>
  <div class="card">
    <div class="stat-row">
      <div class="stat"><div class="num">${p.totalDays||1}</div><div class="lbl">学习天数</div></div>
      <div class="stat"><div class="num">${p.totalQuestions||0}</div><div class="lbl">刷题总量</div></div>
      <div class="stat"><div class="num">${p.totalErrors||0}</div><div class="lbl">错题数</div></div>
      <div class="stat"><div class="num">${p.mockCount||0}</div><div class="lbl">模考次数</div></div>
      <div class="stat"><div class="num">${S.errors.filter(e=>!e.reviewed).length}</div><div class="lbl">待复盘</div></div>
    </div>
  </div>
  <div class="card">
    <div class="card-title"><span class="icon">📈</span>模块掌握度</div>
    ${modBars||'<div class="muted">尚无数据</div>'}
  </div>
  <div class="card">
    <div class="card-title"><span class="icon">🎯</span>薄弱模块 TOP3</div>
    ${weakTop3()}
  </div>`;
}

function weakTop3(){
  const errs=S.errors;if(!errs.length)return '<div class="muted">录入错题后自动生成</div>';
  const map={};errs.forEach(e=>{map[e.module]=(map[e.module]||0)+1;});
  const arr=Object.keys(map).map(k=>({k,v:map[k]})).sort((a,b)=>b.v-a.v).slice(0,3);
  return arr.map(x=>`<div class="bullet"><b>${esc(x.k)}</b> · ${x.v} 道错题 <span class="chip weak">需重点突破</span></div>`).join('');
}

/* ============ 页面：考试倒计时 ============ */
function viewCountdown(){
  const p=S.profile;
  const gk=daysLeft(p.gkDate),sk=daysLeft(p.skDate);
  return `
  <div class="page-head"><div><h2>⏰ 考试倒计时</h2><div class="sub">目标日 · 阶段规划</div></div></div>
  <div class="row2">
    <div class="card">
      <div class="card-title"><span class="icon">📘</span>国考 <span class="tag">${esc(p.gkDate||'未设置')}</span></div>
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:54px;font-weight:800;color:var(--brand)">${gk==null?'—':gk}</div>
        <div class="muted">${gk==null?'请在「设置」中填写日期':'天'} </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title"><span class="icon">📗</span>省考 <span class="tag">${esc(p.skDate||'未设置')}</span></div>
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:54px;font-weight:800;color:var(--brand)">${sk==null?'—':sk}</div>
        <div class="muted">${sk==null?'请在「设置」中填写日期':'天'} </div>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-title"><span class="icon">🗓️</span>阶段规划建议</div>
    <div class="bullet"><b>基础期（≥90天）</b>：分模块精学 + 每日30题 + 错题入库</div>
    <div class="bullet"><b>强化期（60天）</b>：专项突破 + 套题训练 + 周模考</div>
    <div class="bullet"><b>冲刺期（30天）</b>：真题模考 + 查漏补缺 + 时政冲刺</div>
    <div class="bullet"><b>临考期（7天）</b>：规范表达 + 错题复盘 + 调整状态</div>
  </div>
  <div class="card">
    <div class="card-title"><span class="icon">📐</span>生成备考方案</div>
    <div class="row2">
      <button class="btn ghost" id="plan30">30 天备考方案</button>
      <button class="btn ghost" id="plan7">7 天冲刺计划</button>
    </div>
    <div id="planOut" style="margin-top:10px"></div>
  </div>`;
}

/* ============ 页面：板块学习（行测） ============ */
function viewXingce(){
  const mp=S.progress.moduleProgress||{};
  const k=S.today.knowledge;
  const pts=k.points.map(x=>`<div class="bullet">${esc(x)}</div>`).join('');
  const drill=k.drill.map(x=>`<div class="bullet">${esc(x)}</div>`).join('');
  const mods=Object.keys(mp).map(m=>{
    const v=Math.min(100,(mp[m].mastered||0)*20);
    return `<div class="mod" data-module="${esc(m)}"><div><div class="mn">${esc(m)}</div><div class="ms">${esc(mp[m].status)} · 掌握 ${mp[m].mastered||0} 考点</div>
      <div class="bar" style="width:160px;margin-top:6px"><i style="width:${v}%"></i></div></div>
      <div class="right">${mp[m].weak&&mp[m].weak.length?'<span class="chip weak">弱: '+esc(mp[m].weak.slice(0,2).join('/'))+'</span>':'<span class="chip ok">稳</span>'} <span style="color:var(--brand);font-size:12px;margin-left:4px">开始练习 ›</span></div></div>`;
  }).join('');
  return `
  <div class="page-head"><div><h2>📚 板块学习</h2><div class="sub">行测五大模块 · 申论专项 · 智能轮动</div></div></div>
  <div class="card">
    <div class="card-title"><span class="icon">📊</span>模块进度</div>
    ${mods}
  </div>
  <div class="row2">
    <div class="card">
      <div class="card-title"><span class="icon">📖</span>今日推送 · ${esc(k.module)} <span class="tag">${esc(k.title)}</span></div>
      ${pts}
    </div>
    <div class="card">
      <div class="card-title"><span class="icon">✍️</span>刷题重点</div>
      ${drill}
    </div>
  </div>
  <div class="card">
    <div class="card-title"><span class="icon">📕</span>五大模块速览</div>
    <div class="row2">
      <div>
        <div class="section-label">言语理解</div>
        <div class="bullet">逻辑填空：对应法（解释/转折/因果/并列）</div>
        <div class="bullet">中心理解：行文脉络（总—分—总/转折/对策）</div>
        <div class="bullet">细节判断：偷换/无中生有/绝对化</div>
        <div class="bullet">语句排序：抓标志词 + 逻辑顺序</div>
      </div>
      <div>
        <div class="section-label">判断推理</div>
        <div class="bullet">图推：位置（平移/旋转/翻转）、属性（对称/曲直）</div>
        <div class="bullet">类比：外延/内涵/语义/语法关系</div>
        <div class="bullet">定义：主语—谓语—宾语拆解</div>
        <div class="bullet">逻辑：翻译推理（→）+ 加强削弱</div>
      </div>
    </div>
    <div class="row2" style="margin-top:10px">
      <div>
        <div class="section-label">资料分析</div>
        <div class="bullet">基期/现期/增长率/比重/倍数</div>
        <div class="bullet">速算：截位直除、分数比较</div>
        <div class="bullet">常考：综合判断题（4 选 1 排除法）</div>
      </div>
      <div>
        <div class="section-label">数量关系 + 常识</div>
        <div class="bullet">数量：只攻工程/行程/容斥/利润</div>
        <div class="bullet">常识：时政+法律+文史+科技</div>
        <div class="bullet">策略：数量放弃难题，常识不纠结</div>
      </div>
    </div>
  </div>`;
}

/* ============ 页面：错题收集 ============ */
function viewError(){
  const errs=S.errors;
  const list=errs.length?errs.map(e=>{
    return `<div class="err-item ${e.reviewed?'done':''}"><div class="eh"><span>${esc(e.module)} · ${esc(e.point)}</span>
      ${e.reviewed?'<span class="reason" style="background:#E5F4E2;color:#3F8A4A">已复盘</span>':'<span class="reason">'+esc(e.reason||'')+'</span>'}</div>
      ${(e.images&&e.images.length)?'<div class="err-imgs">'+e.images.map(im=>`<a href="${esc(im)}" target="_blank" rel="noopener"><img class="err-thumb" src="${esc(im)}" alt="原题"></a>`).join('')+'</div>':''}
      <div class="eb"><b>错选：</b>${esc(e.myAnswer||'-')} ｜ <b>正确：</b>${esc(e.correct||'-')}<br><b>思路：</b>${esc(e.solution||'')}</div>
      ${!e.reviewed?'<button class="btn sm" data-review="'+e.id+'" style="margin-top:8px">标记复盘完成</button>':''}</div>`;
  }).join(''):'<div class="muted">还没有错题，刷题后录入即可。系统会在录入第3天自动标记「待复盘」。</div>';
  return `
  <div class="page-head"><div><h2>📕 错题收集</h2><div class="sub">自动归类原因 · 第3天自动复盘</div></div>
  <div class="right-action"><span class="chip weak">错题 ${errs.length}</span><span class="chip ok">已复盘 ${errs.filter(e=>e.reviewed).length}</span></div></div>
  <div class="row2">
    <div class="card">
      <div class="card-title"><span class="icon">➕</span>录入新错题</div>
      <div class="photo-bar">
        <label class="photo-btn" for="e_camera">
          <span>📷 拍照</span><input type="file" id="e_camera" accept="image/*" capture="environment" multiple style="display:none">
        </label>
        <label class="photo-btn alt" for="e_pick">
          <span>🖼️ 上传</span><input type="file" id="e_pick" accept="image/*" multiple style="display:none">
        </label>
        <button class="photo-btn ghost" id="e_ocr" title="拍照后点此自动识别（需先在设置填 OCR Key）"><span>✨ AI识别</span></button>
        <span class="muted" style="font-size:12px;margin-left:auto">支持多图 · 单张≤8MB</span>
      </div>
      <div id="e_preview" class="photo-preview"></div>
      <label class="fld">模块</label>
      <select class="input" id="e_mod"><option>言语理解</option><option>判断推理</option><option>资料分析</option><option>数量关系</option><option>常识判断</option><option>申论</option></select>
      <label class="fld">考点</label><input class="input" id="e_point" placeholder="如：基期量公式、转折对应">
      <label class="fld">错误原因</label>
      <select class="input" id="e_reason"><option value="知识点不熟">知识点不熟</option><option value="粗心">粗心</option><option value="审题错">审题错</option><option value="技巧缺失">技巧缺失</option></select>
      <div class="row2"><div><label class="fld">我的错选</label><input class="input" id="e_my"></div>
        <div><label class="fld">正确答案</label><input class="input" id="e_cor"></div></div>
      <label class="fld">正确思路</label><textarea class="input" id="e_sol" rows="2" placeholder="简要写下正确解题思路"></textarea>
      <button class="btn" id="e_add">保存错题</button>
    </div>
    <div class="card">
      <div class="card-title"><span class="icon">📋</span>错题列表 <span class="tag">${errs.length}条</span></div>
      ${list}
    </div>
  </div>`;
  setTimeout(renderErrPreview, 0);
}

/* ============ 页面：时政热点 ============ */
function viewPolitics(){
  const pol=S.politics;
  const cards=pol.map(x=>`<div class="card" style="border-left:4px solid var(--brand-2)">
    <div class="card-title"><span class="icon">📰</span>${esc(x.event)} <span class="tag">${esc(x.cat)}</span></div>
    <div class="eb" style="font-size:13.5px;line-height:1.7;color:var(--ink)">${esc(x.point)}</div>
    <div style="margin-top:8px"><span class="chip">📌 可考：${esc(x.angle)}</span><span class="muted" style="margin-left:8px">${esc(x.date)}</span></div>
  </div>`).join('');
  return `
  <div class="page-head"><div><h2>📰 时政热点</h2><div class="sub">每日必看 · 紧扣公考考情</div></div></div>
  ${cards||'<div class="card"><div class="muted">暂无时政，请在下方添加</div></div>'}
  <div class="card">
    <div class="card-title"><span class="icon">➕</span>添加时政</div>
    <div class="row2"><div><label class="fld">分类</label><select class="input" id="p_cat"><option>时政要闻</option><option>会议文件</option><option>政策解读</option><option>科技成就</option><option>经济数据</option><option>社会热点</option></select></div>
      <div><label class="fld">事件</label><input class="input" id="p_event" placeholder="如：二十届三中全会"></div></div>
    <label class="fld">核心要点</label><textarea class="input" id="p_point" rows="2" placeholder="事件核心内容 + 数据 + 意义"></textarea>
    <label class="fld">可考角度</label><input class="input" id="p_angle" placeholder="如：申论经济话题 / 常识时政">
    <button class="btn" id="p_add">添加时政</button>
  </div>`;
}

/* ============ 页面：易错考点 ============ */
function viewWeakpoint(){
  const errs=S.errors;
  const map={};
  errs.forEach(e=>{
    if(!map[e.module])map[e.module]={total:0,reviewed:0,points:{},reasons:{}};
    map[e.module].total++;
    if(e.reviewed)map[e.module].reviewed++;
    map[e.module].points[e.point]=(map[e.module].points[e.point]||0)+1;
    map[e.module].reasons[e.reason]=(map[e.module].reasons[e.reason]||0)+1;
  });
  const mods=Object.keys(map);
  if(!mods.length)return `<div class="card"><div class="card-title">🎯 易错考点</div><div class="muted">录入错题后，这里会自动汇总你的高频错点、错误原因分布与补强建议。</div></div>`;
  const html=mods.map(m=>{
    const pts=Object.entries(map[m].points).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const rea=Object.entries(map[m].reasons).sort((a,b)=>b[1]-a[1]);
    return `<div class="card">
      <div class="card-title"><span class="icon">📍</span>${esc(m)} <span class="tag">${map[m].total}道错题</span></div>
      <div class="section-label">高频考点</div>
      ${pts.map(p=>`<div class="bullet"><b>${esc(p[0])}</b> · 错 ${p[1]} 次</div>`).join('')}
      <div class="section-label">错误原因分布</div>
      <div>${rea.map(r=>`<span class="chip weak">${esc(r[0])} · ${r[1]}</span>`).join('')}</div>
      <div class="section-label">补强建议</div>
      <div class="bullet">针对 <b>${pts[0]?pts[0][0]:''}</b> 专项加练 20 题</div>
      <div class="bullet">若主因是「知识点不熟」：回看行测模块对应考点</div>
      <div class="bullet">若主因是「审题错/粗心」：限时刷题训练注意力</div>
    </div>`;
  }).join('');
  return `<div class="page-head"><div><h2>🎯 易错考点</h2><div class="sub">按模块自动汇总 · 定位薄弱点</div></div></div>${html}`;
}

/* ============ 页面：申论素材 ============ */
function viewShenlun(){
  const sl=S.shenlun;
  const dw=(sl.dailyWords||[]).map(w=>`<div class="bullet"><b>${esc(w.oral)}</b> → <span style="color:var(--brand)">${esc(w.standard)}</span> <span class="muted">（${esc(w.topic)}）</span></div>`).join('');
  const dq=sl.dailyQuote?`<div class="quote">${esc(sl.dailyQuote.text)}</div><div class="muted">适用：${esc(sl.dailyQuote.topic)}（${esc(sl.dailyQuote.pos)}）</div>`:'<div class="muted">暂无</div>';
  const myWords=(sl.myWords||[]).map(w=>`<div class="bullet"><b>${esc(w.oral)}</b> → <span style="color:var(--brand)">${esc(w.standard)}</span> <span class="muted">· ${esc(w.topic)} · ${esc(w.date)}</span></div>`).join('');
  const myQuotes=(sl.myQuotes||[]).map(q=>`<div class="quote">${esc(q.text)}</div><div class="muted">适用：${esc(q.topic)}（${esc(q.pos)}）</div>`).join('');
  const docs=(sl.docs||[]).map(d=>`<tr><td><b>${esc(d.type)}</b></td><td>${esc(d.title)}</td><td>${esc(d.salutation)}</td><td>${esc(d.sign)}</td><td>${esc(d.note)}</td></tr>`).join('');
  return `
  <div class="page-head"><div><h2>📝 申论素材</h2><div class="sub">每日自动推送 · 规范词 · 金句 · 框架 · 公文</div></div></div>
  <div class="card" style="border-left:4px solid var(--brand)">
    <div class="card-title"><span class="icon">🔄</span>今日自动推送 <span class="tag">每天更新</span></div>
    <div class="section-label">规范词 5 条（口语 → 公考表达）</div>
    ${dw||'<div class="muted">暂无</div>'}
    <div class="section-label">金句 1 条</div>
    ${dq}
  </div>
  <div class="row2">
    <div class="card">
      <div class="card-title"><span class="icon">📝</span>我的规范词收藏</div>
      ${myWords||'<div class="muted">你添加的规范词会显示在这里</div>'}
      <div class="section-label">新增一条</div>
      <input class="input" id="w_oral" placeholder="材料口语原词">
      <input class="input" id="w_std" placeholder="公考规范词">
      <input class="input" id="w_topic" placeholder="话题">
      <button class="btn" id="w_add">添加规范词</button>
    </div>
    <div class="card">
      <div class="card-title"><span class="icon">💡</span>我的金句收藏</div>
      ${myQuotes||'<div class="muted">你添加的金句会显示在这里</div>'}
      <input class="input" id="q_text" placeholder="金句内容">
      <input class="input" id="q_topic" placeholder="适用话题">
      <button class="btn" id="q_add">添加金句</button>
    </div>
  </div>
  <div class="card">
    <div class="card-title"><span class="icon">📐</span>四段式万能框架</div>
    <div class="bullet"><b>概括题：</b>抄材料关键词 + 规范词提炼 + 分类罗列</div>
    <div class="bullet"><b>分析题：</b>表态 + 多角度分析（原因/影响/本质）+ 对策</div>
    <div class="bullet"><b>对策题：</b>问题 + 原因 + 针对性对策（可操作性）</div>
    <div class="bullet"><b>公文/讲话稿：</b>标题 + 称谓 + 正文（背景—问题—对策—号召）+ 落款</div>
  </div>
  <div class="card">
    <div class="card-title"><span class="icon">📄</span>公文格式速查</div>
    <table class="table"><tr><th>文种</th><th>标题</th><th>称谓</th><th>落款</th><th>备注</th></tr>${docs||'<tr><td colspan="5" class="muted">暂无数据</td></tr>'}</table>
  </div>`;
}

/* ============ 页面：模考分析 ============ */
function viewMock(){
  const mocks=S.mocks;
  const list=mocks.length?mocks.map(m=>`<div class="card">
    <div class="card-title"><span class="icon">📈</span>模考 · ${esc(m.date)} <span class="tag">总分正确率 ${m.overall}%</span></div>
    <div class="stat-row">
      ${Object.keys(m.scores).map(k=>{const v=m.scores[k];return `<div class="stat"><div class="num">${v.right}/${v.total}</div><div class="lbl">${esc(k)}</div><div class="muted">${pct(v.right,v.total)}%</div></div>`;}).join('')}
    </div>
    <div class="section-label">失分 TOP3</div>
    ${m.top3.map(x=>`<div class="bullet"><b>${esc(x.module)}</b> · 正确率 <span style="color:var(--weak)">${x.rate}%</span>（${x.right}/${x.total}）</div>`).join('')}
    <div class="section-label">补强方案</div>
    <div class="bullet">${esc(m.plan||'针对 TOP3 模块加练专项 30 题/日')}</div>
  </div>`).join(''):'';
  return `
  <div class="page-head"><div><h2>📈 模考分析</h2><div class="sub">成绩录入 · 失分诊断 · 补强方案</div></div></div>
  <div class="row2">
    <div class="card">
      <div class="card-title"><span class="icon">🧪</span>录入模考成绩</div>
      <div class="muted" style="margin-bottom:8px">格式：对/总（例 32/40）</div>
      <div class="row2"><div><label class="fld">言语理解</label><input class="input" id="m_yan" placeholder="32/40"></div>
        <div><label class="fld">判断推理</label><input class="input" id="m_pan" placeholder="35/40"></div></div>
      <div class="row2"><div><label class="fld">资料分析</label><input class="input" id="m_zil" placeholder="15/20"></div>
        <div><label class="fld">常识判断</label><input class="input" id="m_chang" placeholder="12/20"></div></div>
      <div class="row2"><div><label class="fld">数量关系</label><input class="input" id="m_shu" placeholder="8/15"></div>
        <div><label class="fld">申论</label><input class="input" id="m_shen" placeholder="65/100"></div></div>
      <button class="btn" id="m_add">分析并提交</button>
    </div>
    <div class="card">
      <div class="card-title"><span class="icon">📊</span>历史模考</div>
      ${list||'<div class="muted">还没有模考记录</div>'}
    </div>
  </div>`;
}

/* ============ 页面：月历打卡 ============ */
let calYear,calMonth; // 当前显示的月

function viewCheckin(){
  const t=new Date();
  calYear=calYear||t.getFullYear();
  calMonth=calMonth||(t.getMonth()+1);
  const checkIns=S.progress.checkIns||[];
  const todayS=todayStr();
  const done=(S.progress.today&&S.progress.today.date===todayS)?S.progress.today.completed.length:0;
  const total=S.today.tasks.length;
  const isCheckedToday=checkIns.includes(todayS);

  // 计算本月网格（1 = 周日，7 = 周六）
  const first=new Date(calYear,calMonth-1,1);
  const last=new Date(calYear,calMonth,0);
  const startWeekday=first.getDay();
  const days=last.getDate();
  const cells=[];
  for(let i=0;i<startWeekday;i++)cells.push(null);
  for(let d=1;d<=days;d++)cells.push(d);
  while(cells.length%7)cells.push(null);

  const cellsHTML=cells.map(d=>{
    if(!d)return '<div class="cal-cell empty"></div>';
    const ds=calYear+'-'+String(calMonth).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const checked=checkIns.includes(ds);
    const isToday=ds===todayS;
    return `<div class="cal-cell ${checked?'checked':''} ${isToday?'today':''}" title="${ds}${checked?' · 已打卡':''}">${d}</div>`;
  }).join('');

  const monthLabel=calYear+'年'+calMonth+'月';
  const monthCheckIns=checkIns.filter(x=>x.startsWith(calYear+'-'+String(calMonth).padStart(2,'0'))).length;
  const monthTotal=days;

  return `
  <div class="page-head"><div><h2>📅 月打卡</h2><div class="sub">坚持每天打卡 · 记录备考足迹</div></div>
  <div class="right-action">
    <button class="btn" id="checkinBtn" ${isCheckedToday?'disabled style="background:#A8C99A;cursor:not-allowed"':''}>${isCheckedToday?'✓ 今日已打卡':'打卡今日'}</button>
  </div></div>
  <div class="row2">
    <div class="card">
      <div class="cal-head">
        <button class="cal-nav" id="calPrev">‹</button>
        <div class="cal-title">${monthLabel}</div>
        <button class="cal-nav" id="calNext">›</button>
      </div>
      <div class="cal-week"><div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div></div>
      <div class="cal-grid">${cellsHTML}</div>
      <div class="cal-legend">
        <span><i class="dot empty"></i> 未打卡</span>
        <span><i class="dot checked"></i> 已打卡</span>
        <span><i class="dot today"></i> 今日</span>
      </div>
    </div>
    <div class="card">
      <div class="card-title"><span class="icon">📊</span>本月打卡统计</div>
      <div class="stat-row">
        <div class="stat"><div class="num">${monthCheckIns}</div><div class="lbl">已打卡</div></div>
        <div class="stat"><div class="num">${monthTotal-monthCheckIns}</div><div class="lbl">未打卡</div></div>
        <div class="stat"><div class="num">${Math.round(monthCheckIns/monthTotal*100)}%</div><div class="lbl">完成率</div></div>
      </div>
      <div class="section-label">累计</div>
      <div class="stat-row">
        <div class="stat"><div class="num">${checkIns.length}</div><div class="lbl">累计打卡</div></div>
        <div class="stat"><div class="num">${S.progress.totalQuestions||0}</div><div class="lbl">累计刷题</div></div>
      </div>
      <div class="section-label">今日任务</div>
      <div class="bar"><i style="width:${Math.round(done/total*100)}%"></i></div>
      <div class="muted" style="margin-top:4px">完成 ${done}/${total} 项任务后即可打卡</div>
    </div>
  </div>
  <div class="card">
    <div class="card-title"><span class="icon">💡</span>打卡规则</div>
    <div class="bullet">每天点击「打卡今日」即可在月历上记录一次。</div>
    <div class="bullet">完成今日全部任务后自动推荐打卡（建议）。</div>
    <div class="bullet">连续打卡天数越多，备考信心越稳；中断也无妨，关键在坚持。</div>
  </div>`;
}

/* ============ 页面：题库练习 ============ */
let quizState={mode:'menu', questions:[], cur:0, answers:{}, right:0, wrong:0};

function viewQuiz(){
  if(quizState.mode==='menu')return viewQuizMenu();
  if(quizState.mode==='doing')return viewQuizDoing();
  if(quizState.mode==='done')return viewQuizDone();
  return viewQuizMenu();
}

function viewQuizMenu(){
  const bank=S.quizBank||{};
  const total=bank._total||0;
  const byMod=bank._byMod||{};
  const wrongCount=S.errors.filter(e=>e.fromBank).length;
  return `
  <div class="page-head"><div><h2>📚 题库练习</h2><div class="sub">抽题练习 · 错题自动入库</div></div>
  <div class="right-action"><span class="chip">题库 ${total} 题</span><span class="chip weak">错题 ${wrongCount}</span></div></div>

  <div class="card">
    <div class="card-title"><span class="icon">🎯</span>选择练习模式</div>
    <div class="quiz-grid">
      <div class="quiz-mode" data-mode="random" data-module="全部"><div class="qm-icon">🎲</div><div class="qm-name">随机抽题</div><div class="qm-sub">从全部 ${total} 题随机抽 10 道</div></div>
      <div class="quiz-mode" data-mode="wrong" data-module="全部"><div class="qm-icon">📕</div><div class="qm-name">错题练习</div><div class="qm-sub">从错题本抽 ${wrongCount} 道</div></div>
    </div>
    <div class="section-label">按模块专项</div>
    <div class="quiz-grid">
      ${['资料分析','言语理解','判断推理','数量关系','常识判断'].map(m=>`<div class="quiz-mode" data-mode="random" data-module="${m}"><div class="qm-icon">${modEmoji(m)}</div><div class="qm-name">${m}</div><div class="qm-sub">${byMod[m]||0} 题</div></div>`).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-title"><span class="icon">➕</span>录入新题</div>
    <div class="row2">
      <div><label class="fld">模块</label><select class="input" id="qb_mod"><option>资料分析</option><option>言语理解</option><option>判断推理</option><option>数量关系</option><option>常识判断</option></select></div>
      <div><label class="fld">题型</label><input class="input" id="qb_type" placeholder="如：基期量"></div>
    </div>
    <label class="fld">题干</label><textarea class="input" id="qb_q" rows="2"></textarea>
    <div class="row2">
      <div><label class="fld">A</label><input class="input" id="qb_a"></div>
      <div><label class="fld">B</label><input class="input" id="qb_b"></div>
    </div>
    <div class="row2">
      <div><label class="fld">C</label><input class="input" id="qb_c"></div>
      <div><label class="fld">D</label><input class="input" id="qb_d"></div>
    </div>
    <div class="row2">
      <div><label class="fld">答案</label><select class="input" id="qb_ans"><option>A</option><option>B</option><option>C</option><option>D</option></select></div>
      <div><label class="fld">考点</label><input class="input" id="qb_point" placeholder="如：基期量公式"></div>
    </div>
    <label class="fld">解析</label><textarea class="input" id="qb_parse" rows="2"></textarea>
    <button class="btn" id="qb_add">添加题目</button>
  </div>`;
}

function modEmoji(m){return {'资料分析':'📊','言语理解':'📖','判断推理':'🧩','数量关系':'🔢','常识判断':'🌐'}[m]||'📘';}

function viewQuizDoing(){
  const q=quizState.questions[quizState.cur];
  if(!q)return viewQuizDone();
  const my=quizState.answers[q.id];
  const submitted=!!quizState.submitted[q.id];
  const opts=q.options.map((opt,i)=>{
    const letter='ABCD'[i];
    let cls='qopt';
    if(submitted){
      if(letter===quizState.correct[q.id])cls+=' qopt-right';
      else if(letter===my)cls+=' qopt-wrong';
    }else if(my===letter)cls+=' qopt-sel';
    return `<div class="${cls}" data-opt="${letter}"><span class="ol">${letter}</span><span class="ot">${esc(opt)}</span></div>`;
  }).join('');
  const result=quizState.submitted[q.id]?(quizState.correct[q.id]===my?`<div class="qres ok">✓ 回答正确</div>`:`<div class="qres no">✗ 回答错误，正确答案：${quizState.correct[q.id]}</div>`):'';
  const parse=quizState.submitted[q.id]?`<div class="qparse"><b>解析：</b>${esc(quizState.parse[q.id]||'')}<br><span class="muted">考点：${esc(q.point||'')}</span></div>`:'';
  return `
  <div class="page-head"><div><h2>📚 正在答题</h2><div class="sub">第 ${quizState.cur+1} / ${quizState.questions.length} 题 · 模块：${esc(q.module)} · ${esc(q.type||'')}</div></div>
  <div class="right-action"><button class="btn ghost" id="quizExit">退出</button></div></div>
  <div class="card">
    <div class="bar"><i style="width:${(quizState.cur+1)/quizState.questions.length*100}%"></i></div>
    <div class="qtitle">${esc(q.q)}</div>
    <div class="qopts">${opts}</div>
    ${result}
    ${parse}
    <div class="row2" style="margin-top:14px">
      ${!submitted?`<button class="btn" id="quizSubmit" ${!my?'disabled style="background:#ccc;cursor:not-allowed"':''}>提交答案</button>`:''}
      ${submitted?`<button class="btn" id="quizNext">${quizState.cur<quizState.questions.length-1?'下一题 →':'查看结果'}</button>`:''}
    </div>
  </div>`;
}

function viewQuizDone(){
  const n=quizState.questions.length;
  const rate=Math.round(quizState.right/n*100);
  return `
  <div class="page-head"><div><h2>📊 练习结果</h2><div class="sub">${n} 题 · 答对 ${quizState.right} · 答错 ${quizState.wrong}</div></div>
  <div class="right-action"><button class="btn ghost" id="quizAgain">再来一组</button> <button class="btn" id="quizBack">返回题库</button></div></div>
  <div class="card">
    <div style="text-align:center;padding:20px">
      <div style="font-size:48px;font-weight:800;color:${rate>=70?'var(--ok)':rate>=60?'var(--warn)':'var(--weak)'}">${rate}%</div>
      <div class="muted">正确率</div>
    </div>
    <div class="stat-row">
      <div class="stat"><div class="num">${quizState.right}</div><div class="lbl">答对</div></div>
      <div class="stat"><div class="num">${quizState.wrong}</div><div class="lbl">答错</div></div>
      <div class="stat"><div class="num">${n}</div><div class="lbl">总题数</div></div>
    </div>
    ${quizState.wrong>0?'<div class="section-label">错题已自动收录到「错题收集」模块</div>':''}
  </div>`;
}

/* ============ 页面：设置 ============ */
function viewSettings(){
  const p=S.profile;
  return `
  <div class="page-head"><div><h2>⚙️ 设置</h2><div class="sub">个人信息 · 考试目标 · 备考节奏</div></div></div>
  <div class="card">
    <div class="card-title"><span class="icon">👤</span>个人信息</div>
    <label class="fld">你的称呼</label><input class="input" id="s_name" value="${esc(p.name)}" placeholder="如：小王">
    <div class="row2">
      <div><label class="fld">国考笔试日期</label><input class="input" id="s_gk" value="${esc(p.gkDate)}" placeholder="2026-11-29"></div>
      <div><label class="fld">省考笔试日期</label><input class="input" id="s_sk" value="${esc(p.skDate)}" placeholder="2027-03-xx"></div>
    </div>
    <label class="fld">备考阶段</label>
    <select class="input" id="s_stage">
      <option ${p.stage==='零基础起步'?'selected':''}>零基础起步</option>
      <option ${p.stage==='基础学习中'?'selected':''}>基础学习中</option>
      <option ${p.stage==='强化刷题期'?'selected':''}>强化刷题期</option>
      <option ${p.stage==='考前冲刺'?'selected':''}>考前冲刺</option>
    </select>
    <div class="row2">
      <div><label class="fld">每日可用时长</label>
        <select class="input" id="s_time">
          <option ${p.dailyTime==='2h'?'selected':''}>2 小时以内</option>
          <option ${p.dailyTime==='3-4h'?'selected':''}>3-4 小时</option>
          <option ${p.dailyTime==='5-6h'?'selected':''}>5-6 小时</option>
          <option ${p.dailyTime==='8h+'?'selected':''}>8 小时以上</option>
        </select>
      </div>
      <div><label class="fld">学习开始日期</label><input class="input" id="s_start" value="${esc(p.startDate||'2026-07-29')}"></div>
    </div>
    <button class="btn" id="s_save">保存设置</button>
  </div>
  <div class="card">
    <div class="card-title"><span class="icon">❓</span>备考答疑 · 高频</div>
    <div class="bullet"><b>行测时间分配？</b> 资料20′+言语30′+判断30′+常识10′+数量10′，留5′涂卡。</div>
    <div class="bullet"><b>数量关系怎么攻？</b> 只攻工程/行程/容斥/利润等高频简单题，难题直接跳过保正确率。</div>
    <div class="bullet"><b>申论怎么提分？</b> 小题抄材料+规范词；大作文立意从材料高频词提炼，四段式展开。</div>
    <div class="bullet"><b>岗位怎么选？</b> 结合专业、应届/往届身份、进面分差，优先"限条件"岗位降竞争。</div>
    <div class="bullet"><b>错题怎么用？</b> 录入即归类原因，3天后自动复盘，重点看「知识点不熟」类。</div>
  </div>`;
}

/* ============ 动作绑定 ============ */
function bindActions(){
  // 任务打卡
  document.querySelectorAll('[data-task]').forEach(el=>el.onclick=async()=>{
    const id=el.dataset.task,done=el.classList.contains('done');
    await api('POST','/api/today/task',{id,done:!done});await refresh();render();
  });
  // 刷题量
  const qlog=$('#qlog');if(qlog)qlog.onclick=async()=>{const n=parseInt($('#qnum').value)||0;if(!n){toast('请输入刷题量');return;}
    await api('POST','/api/question/log',{n});await refresh();render();toast('已记录 '+n+' 题');};
  // 复盘
  document.querySelectorAll('[data-review]').forEach(el=>el.onclick=async()=>{
    const id=Number(el.dataset.review);await api('POST','/api/error/review',{id,result:'已掌握'});await refresh();render();toast('复盘完成');});
  // 申论
  const wadd=$('#w_add');if(wadd)wadd.onclick=async()=>{await api('POST','/api/shenlun/word',{oral:$('#w_oral').value,topic:$('#w_topic').value,standard:$('#w_std').value});await refresh();render();toast('规范词已添加');};
  const qadd=$('#q_add');if(qadd)qadd.onclick=async()=>{await api('POST','/api/shenlun/quote',{text:$('#q_text').value,topic:$('#q_topic').value});await refresh();render();toast('金句已添加');};
  // 错题（支持拍照/上传图片附件 + AI 识别）
  const eadd=$('#e_add');if(eadd)eadd.onclick=async()=>{
    eadd.disabled=true; eadd.textContent='保存中...';
    const images = eAddImages.slice();
    try{
      await api('POST','/api/error',{module:$('#e_mod').value,point:$('#e_point').value,reason:$('#e_reason').value,myAnswer:$('#e_my').value,correct:$('#e_cor').value,solution:$('#e_sol').value,images});
      eAddImages=[]; renderErrPreview();
      ['#e_point','#e_my','#e_cor','#e_sol'].forEach(s=>{const el=$(s); if(el) el.value='';});
      await refresh(); render(); toast('错题已录入'+(images.length?'（含'+images.length+'张原题）':''));
    } finally { eadd.disabled=false; eadd.textContent='保存错题'; }
  };
  const cam=$('#e_camera');if(cam)cam.onchange=ev=>{uploadFiles(ev.target.files); ev.target.value='';};
  const pk=$('#e_pick');if(pk)pk.onchange=ev=>{uploadFiles(ev.target.files); ev.target.value='';};
  const ocr=$('#e_ocr');if(ocr)ocr.onclick=async()=>{
    if(!eAddImages.length){toast('请先拍照或上传原题图片');return;}
    ocr.disabled=true; ocr.textContent='识别中...';
    const r=await api('POST','/api/ocr',{url:eAddImages[0]});
    ocr.disabled=false; ocr.innerHTML='<span>✨ AI识别</span>';
    if(r.error){toast(r.error);} else {toast('已识别（占位演示）');}
  };
  // 模考
  const madd=$('#m_add');if(madd)madd.onclick=async()=>{
    const sc={};[['言语理解',$('#m_yan').value],['判断推理',$('#m_pan').value],['资料分析',$('#m_zil').value],['常识判断',$('#m_chang').value],['数量关系',$('#m_shu').value],['申论',$('#m_shen').value]].forEach(([m,v])=>{if(v){const[a,b]=v.split('/');sc[m]={right:Number(a)||0,total:Number(b)||0};}});
    await api('POST','/api/mock',{scores:sc,plan:''});await refresh();render();toast('模考已分析');};
  // 时政
  const padd=$('#p_add');if(padd)padd.onclick=async()=>{await api('POST','/api/politics',{cat:$('#p_cat').value,event:$('#p_event').value,point:$('#p_point').value,angle:$('#p_angle').value});await refresh();render();toast('时政已添加');};
  // 计划
  const p30=$('#plan30');if(p30)p30.onclick=async()=>{const d=await api('GET','/api/plan?type=30');$('#planOut').innerHTML='<div class="section-label">30天方案</div>'+d.rows.map(r=>`<div class="bullet">D${r.day}（${esc(r.date)}）·<b>${esc(r.focus)}</b>：${esc(r.title)}</div>`).join('');};
  const p7=$('#plan7');if(p7)p7.onclick=async()=>{const d=await api('GET','/api/plan?type=7');$('#planOut').innerHTML='<div class="section-label">7天冲刺</div>'+d.rows.map(r=>`<div class="bullet">D${r.day}（${esc(r.date)}）·<b>${esc(r.focus)}</b>：${esc(r.title)}</div>`).join('');};
  // 设置
  const ss=$('#s_save');if(ss)ss.onclick=async()=>{await api('POST','/api/profile',{name:$('#s_name').value,gkDate:$('#s_gk').value,skDate:$('#s_sk').value,stage:$('#s_stage').value,dailyTime:$('#s_time').value,startDate:$('#s_start').value});await refresh();render();toast('设置已保存');};

  // 月历打卡
  const ci=$('#checkinBtn');if(ci)ci.onclick=async()=>{await api('POST','/api/checkin',{});await refresh();render();toast('今日已打卡 💜');};
  const cp=$('#calPrev');if(cp)cp.onclick=()=>{calMonth--;if(calMonth<1){calMonth=12;calYear--;}render();};
  const cn=$('#calNext');if(cn)cn.onclick=()=>{calMonth++;if(calMonth>12){calMonth=1;calYear++;}render();};

  // 板块学习 · 模块项 → 进入该模块题库练习
  document.querySelectorAll('.mod[data-module]').forEach(el=>el.onclick=async()=>{
    const m=el.dataset.module;
    const qs=await api('GET','/api/quiz?module='+encodeURIComponent(m)+'&n=10');
    if(!qs.length){toast(m+' 模块暂无题目，先去题库录入几道吧');return;}
    curPage='quiz';
    quizState={mode:'doing',questions:qs,cur:0,answers:{},submitted:{},correct:{},parse:{},right:0,wrong:0};
    render();
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page==='quiz'));
  });
  // 题库练习
  document.querySelectorAll('.quiz-mode').forEach(el=>el.onclick=async()=>{
    const mode=el.dataset.mode,module=el.dataset.module;
    const url='/api/quiz?mode='+mode+'&module='+encodeURIComponent(module)+'&n=10';
    const qs=await api('GET',url);
    if(!qs.length){toast('该模式下暂无题目');return;}
    quizState={mode:'doing',questions:qs,cur:0,answers:{},submitted:{},correct:{},parse:{},right:0,wrong:0};
    render();
  });
  const qbAdd=$('#qb_add');if(qbAdd)qbAdd.onclick=async()=>{
    const body={module:$('#qb_mod').value,type:$('#qb_type').value,q:$('#qb_q').value,
      options:[$('#qb_a').value,$('#qb_b').value,$('#qb_c').value,$('#qb_d').value],
      answer:$('#qb_ans').value,point:$('#qb_point').value,parse:$('#qb_parse').value};
    if(!body.q||!body.options.some(Boolean)){toast('请填写题干与至少一个选项');return;}
    await api('POST','/api/questionbank/add',body);await refresh();render();toast('题目已入库');
  };
  // 答题
  document.querySelectorAll('.qopt').forEach(el=>el.onclick=()=>{
    const q=quizState.questions[quizState.cur];
    quizState.answers[q.id]=el.dataset.opt;render();
  });
  const qSubmit=$('#quizSubmit');if(qSubmit)qSubmit.onclick=async()=>{
    const q=quizState.questions[quizState.cur];
    const ans=quizState.answers[q.id];
    const r=await api('POST','/api/quiz/submit',{id:q.id,answer:ans});
    quizState.submitted[q.id]=true;
    quizState.correct[q.id]=r.answer;
    quizState.parse[q.id]=r.parse;
    if(r.right)quizState.right++;else quizState.wrong++;
    await refresh();render();
  };
  const qNext=$('#quizNext');if(qNext)qNext.onclick=()=>{
    if(quizState.cur<quizState.questions.length-1){quizState.cur++;render();}
    else{quizState.mode='done';render();}
  };
  const qExit=$('#quizExit');if(qExit)qExit.onclick=()=>{quizState={mode:'menu',questions:[],cur:0,answers:{},right:0,wrong:0};render();};
  const qAgain=$('#quizAgain');if(qAgain)qAgain.onclick=async()=>{
    const module=$('#quizAgain').dataset.module||'全部';
    const qs=await api('GET','/api/quiz?mode=random&module='+encodeURIComponent(module)+'&n=10');
    quizState={mode:'doing',questions:qs,cur:0,answers:{},submitted:{},correct:{},parse:{},right:0,wrong:0};
    render();
  };
  const qBack=$('#quizBack');if(qBack)qBack.onclick=()=>{quizState={mode:'menu',questions:[],cur:0,answers:{},right:0,wrong:0};render();};
}

boot();

/* 注册 Service Worker（PWA 离线 / 可安装）。仅在 https 或 localhost 下生效 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
