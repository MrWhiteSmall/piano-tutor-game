import './style.css';
import { chapters as referenceChapters, lessons as referenceLessons, rightMap, leftMap, noteName, solfege, isBlack } from './curriculum.js';
import { chapters, lessons, versions, songs, PROGRESS_KEY, lessonKeyMap, expressedLesson } from './journey.js';
import { Practice } from './engine.js';
import { PianoAudio } from './audio.js';

const icon = (name, size=20) => {
  const paths={sprout:'M12 21v-9M12 16C4 16 3 11 3 7c7-1 9 3 9 7M12 12c0-6 4-9 9-9 1 6-3 10-9 9',pulse:'M2 12h5l3-8 4 16 3-8h5',keys:'M4 3h16v18H4zM9 3v10m6-10v10M9 13v8m6-8v8',hand:'M8 12V6a2 2 0 014 0v7-8a2 2 0 014 0v8-5a2 2 0 014 0v8c0 4-3 6-6 6h-1c-2 0-4-1-5-3l-4-5a2 2 0 013-2l2 2',duet:'M8 18V5l12-2v13M8 8l12-2M8 18c0 4-6 4-6 1s6-4 6-1m12-2c0 4-6 4-6 1s6-4 6-1',flag:'M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0',arrow:'M5 12h14m-5-5 5 5-5 5',play:'m9 5 11 7-11 7z',pause:'M8 5v14m8-14v14',check:'m5 12 4 4 10-10',lock:'M7 10V7a5 5 0 0110 0v3M5 10h14v11H5z',book:'M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3zM12 6v16',volume:'m11 4-5 5H2v6h4l5 5zM15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14',headphones:'M4 14v-3a8 8 0 0116 0v3M4 12H2v8h5v-8zm16 0h2v8h-5v-8',midi:'M3 6h18v12H3zM7 10v1m5-1v1m5-1v1M8 15h8',chevron:'m9 5 7 7-7 7',back:'m14 5-7 7 7 7',repeat:'M20 7h-9a7 7 0 100 14h6M16 3l4 4-4 4',star:'m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',close:'m6 6 12 12M6 18 18 6',help:'M9 9a3 3 0 116 0c0 2-3 2-3 5m0 3v.1M22 12a10 10 0 11-20 0 10 10 0 0120 0',sun:'M12 3v2m0 14v2M3 12h2m14 0h2M6 6l1 1m10 10 1 1M6 18l1-1M17 7l1-1M16 12a4 4 0 11-8 0 4 4 0 018 0',map:'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16m6-14v16'};
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(paths[name]||paths.keys).split('~').map(d=>`<path d="${d}"/>`).join('')}</svg>`;
};
const app=document.querySelector('#app');
const audio=new PianoAudio();
let storageAvailable=true;
let progress={};
try { const saved=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{}'); if(saved&&typeof saved==='object'&&!Array.isArray(saved))progress=Object.fromEntries(Object.entries(saved).filter(([k,v])=>Number(k)>=1&&Number(k)<=30&&v&&Number.isFinite(v.accuracy)&&v.accuracy>=80)); } catch { storageAvailable=false; }
let selected=lessons.find(l=>!progress[l.id])||lessons[29];
let expanded=selected.chapter;
let mode='learn', active=false, practice=null, names=!selected.hideNames, metro=false, demo=false, demoIndex=0, octave=0, countIn=0, dialogState=null;
let bpm=selected.bpm, beatNumber=0, clockTimer=null, demoTimers=[], sessionToken=0;
let expression=preferredExpression(selected), previewStage=Math.max(1,selected.stage), comparison=null;
const pressed=new Map(), pointers=new Map(), midiInputs=new Map(), pendingKeys=new Set();
let midiStatus='连接 MIDI', midiAccess=null, selectedTab='practice';
const completeCount=()=>Object.keys(progress).length;
const unlocked=id=>id===1||Boolean(progress[id-1]);
const keyMap=()=>mode==='free'?Object.fromEntries(Object.entries({...rightMap,...leftMap}).map(([code,n])=>[code,n+octave*12])):lessonKeyMap(selected);
const keyFor=n=>Object.entries(keyMap()).find(([,v])=>v===n)?.[0].replace('Key','')||'';
const performanceLesson=()=>expressedLesson(selected,expression);
const target=()=>demo?performanceLesson().events[demoIndex]:(practice?.current||performanceLesson().events[0]);
const pool=()=>mode==='free'?Array.from({length:88},(_,i)=>i+21):selected.pool;
function preferredExpression(lesson){return progress[lesson.id]?.expression||(lesson.stage===5?progress[lesson.id-1]?.expression:null)||lesson.expression;}
const pct=()=>Math.round(completeCount()/30*100);
const num=n=>String(n).padStart(2,'0');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function handIllustration(){return `<svg class="hand-art" viewBox="0 0 190 145" aria-hidden="true"><g fill="#eee9dc" stroke="#84928a" stroke-width="1.2"><path d="M55 115c-4-14-16-34-15-40 0-6 7-7 11-2l13 17V36c0-10 12-10 12 0v39-53c0-10 13-10 13 0v50-55c0-10 13-10 13 0v55-42c0-10 13-10 13 0v52c4-17 14-26 18-20 2 3-5 23-8 43-3 20-17 28-35 28-18 0-28-5-35-18z"/></g><g font-size="11" font-family="monospace" text-anchor="middle" fill="#254e3e"><text x="43" y="61">1</text><text x="70" y="20">2</text><text x="83" y="9">3</text><text x="102" y="7">4</text><text x="119" y="24">5</text></g><circle cx="43" cy="56" r="13" fill="#dbe8be"/><text x="43" y="60" font-size="11" text-anchor="middle" fill="#254e3e">1</text><path d="M146 109c12-8 18-8 27-4m-24-5 5 9-9 2" fill="none" stroke="#84928a"/><text x="129" y="130" font-size="9" fill="#78847c">放松，轻轻落下</text></svg>`;}

function render(){
  app.innerHTML=`<aside class="sidebar">
    <a class="brand" href="#" aria-label="琴屿首页"><span class="brand-mark">${icon('keys',23)}</span><span>琴屿<span class="brand-en">PIANO, LITTLE BY LITTLE.</span></span></a>
    <div class="side-label">你的音乐，从这里发生</div>
    <nav class="main-nav" aria-label="主导航">
      <button data-mode="learn" class="nav-item ${mode==='learn'?'selected':''}">${icon('map')}学习旅程 <span class="nav-badge">30 关</span></button>
      <button data-mode="free" class="nav-item ${mode==='free'?'selected':''}">${icon('keys')}自由琴房 <span class="nav-small">88 KEYS</span></button>
      <button data-mode="guide" class="nav-item ${mode==='guide'?'selected':''}">${icon('book')}随身乐理手册</button>
    </nav>
    <div class="journey-label"><span>5 首作品 · 每首 6 次成长</span><span>SONGS</span></div>
    <div class="chapter-list">${chapters.map((ch,i)=>`<div class="chapter ${i===expanded?'expanded':''}"><button class="chapter-head" data-chapter="${i}" aria-expanded="${i===expanded}"><span class="chapter-icon ${lessons.filter(l=>l.chapter===i).every(l=>progress[l.id])?'finished':''}">${icon(ch.icon,18)}</span><span class="chapter-name"><small>作品 ${num(i+1)} · 六次成长</small>${ch.title}</span><span class="chapter-tail">${i===expanded?'−':'+'}</span></button>${i===expanded?`<div class="lesson-list">${lessons.filter(l=>l.chapter===i).map(l=>`<button class="lesson-link ${l.id===selected.id&&mode==='learn'?'current':''}" data-lesson="${l.id}" ${!unlocked(l.id)?'disabled':''}><span class="lesson-number">${progress[l.id]?icon('check',13):num(l.id)}</span><span>${l.title}</span>${!unlocked(l.id)?icon('lock',12):l.id===selected.id?'<span class="tiny-dot"></span>':''}</button>`).join('')}</div>`:''}</div>`).join('')}</div>
    <div class="side-bottom"><div class="progress-caption"><span>每一小步，都算数。</span><strong>${completeCount()}<small> / 30</small></strong></div><div class="progress-track"><i style="width:${pct()}%"></i></div><p>${pct()===100?'恭喜！把音乐带到真实琴键上。':'今天，也给自己一点音乐的时间。'}</p></div>
  </aside>
  <div class="workspace"><header class="topbar"><div class="breadcrumb">我的琴屿 <span>/</span> ${mode==='learn'?'学习旅程':mode==='free'?'自由琴房':'乐理手册'}</div><div class="top-actions"><span class="saved-status"><i></i>${storageAvailable?'进度自动保存在此浏览器':'本次进度暂存在内存'}</span><button class="midi-button" data-action="midi">${icon('midi',17)}<span>${esc(midiStatus)}</span></button><button class="help-button" data-action="help" aria-label="使用帮助">${icon('help',19)}</button></div></header>
  <main class="${mode==='learn'?'song-page':''}">${mode==='guide'?guideView():mode==='free'?freeView():learnView()}</main>
  <footer class="page-footer"><span>不必一开始就弹得很好。愿意开始，就很好。</span><span>MADE FOR YOUR FIRST NOTE <span class="footer-spark">✳</span></span></footer></div>
  <div id="toast" role="status" aria-live="polite"></div>
  <dialog id="modal" aria-labelledby="modal-title"></dialog>`;
  bind();refreshKeys();
}
function learnView(){return `<div class="mobile-lessons"><label for="lesson-select">当前旅程</label><select id="lesson-select" aria-label="选择关卡">${chapters.map((ch,i)=>`<optgroup label="${num(i+1)} · ${ch.title}">${lessons.filter(l=>l.chapter===i).map(l=>`<option value="${l.id}" ${l.id===selected.id?'selected':''} ${unlocked(l.id)?'':'disabled'}>${num(l.id)} · ${l.title}${progress[l.id]?' ✓':unlocked(l.id)?'':' · 待解锁'}</option>`).join('')}</optgroup>`).join('')}</select></div><section class="page-heading"><div><h1>${selected.song}<span class="song-heading-stage">${selected.title}</span></h1><p>同一段旋律，第 ${selected.stage+1} / 6 版。${versions[selected.stage].change}</p></div><div class="lesson-stamp"><span>LESSON</span><strong>${num(selected.id)}</strong><small>/ 30</small></div></section>
  ${growthView()}
  <section class="lesson-intro"><div class="intro-symbol">${icon(chapters[selected.chapter].icon,25)}</div><div class="intro-body"><div class="intro-kicker">这一版，只学一点新东西 <span class="pill">约 ${selected.events.length>10?'5':'3'} 分钟</span></div><p>${selected.theory}</p></div></section>
  <section class="practice-panel"><div class="panel-heading"><div class="panel-tabs"><button class="panel-tab ${selectedTab==='practice'?'active':''}" data-tab="practice">${icon('keys',17)}跟着弹一弹</button><button class="panel-tab ${selectedTab==='tip'?'active':''}" data-tab="tip">${icon('hand',17)}指法小贴士</button></div><label class="hint-toggle"><input id="names" type="checkbox" ${names?'checked':''}><span class="switch"></span>音名提示</label></div>
    <div id="practice-body">${selectedTab==='tip'?tipView():scoreView()}</div>
    <div class="practice-controls"><div class="transport"><button class="primary-button" data-action="start">${icon(active?'pause':'play',16)}<span>${active?'暂停练习':practice?'重新练习':'开始练习'}</span></button><button class="text-button" data-action="demo">${icon('headphones',17)}<span>${demo?'停止示范':'先听示范'}</span></button><button class="icon-button" data-action="restart" aria-label="重置本关练习">${icon('repeat',18)}</button></div><div class="tempo"><span class="beat-dot ${metro?'on':''}"></span><button class="text-button metro-button ${metro?'enabled':''}" data-action="metro">节拍器 ${metro?'开':'关'}</button><input id="bpm" type="range" min="48" max="100" step="2" value="${bpm}" aria-label="练习速度"><span id="bpm-label">${bpm}</span><small>BPM</small></div></div>
    <div class="session-status"><span id="feedback" aria-live="polite">${active?'跟着目标音，轻轻落下你的手指。':'准备好了吗？点击「开始练习」，或先听一遍示范。'}</span><span id="session-count">${practice?.index||0} / ${selected.events.length} 个音组</span></div>
  </section>
  ${expressionView()}
  ${keyboardView()}
  <div class="bottom-notes"><div>${icon('check',15)}<span>过关目标：弹奏准确率 ≥ 80% + 答对乐理小测${selected.timed?' · 本关检查节奏':''}${selected.hold?'与时值':''}${selected.articulation?' · 按所选奏法检查离键':''}</span></div><button class="text-button" data-action="help">电脑键盘怎么弹 ${icon('arrow',14)}</button></div>`;}
function growthView(){return `<section class="growth-section" aria-labelledby="growth-title"><div class="growth-heading"><h2 id="growth-title">让这一首，慢慢长大</h2><span>同一段旋律 · 六次变化</span></div><ol class="version-path">${versions.map((v,i)=>{const id=selected.chapter*6+i+1;return `<li><button data-lesson="${id}" class="version-step ${i===selected.stage?'current':''} ${progress[id]?'completed':''}" ${unlocked(id)?'':'disabled'} ${i===selected.stage?'aria-current="step"':''}><span>${progress[id]?icon('check',13):i+1}</span>${v.short}${!unlocked(id)?icon('lock',11):''}</button></li>`;}).join('')}</ol><div class="listening-lab"><div class="listening-copy"><h3>先听听，变化在哪里</h3><p id="listen-for">${versions[previewStage].listen}</p></div><div class="listening-controls"><label class="preview-label">试听版本<select id="preview-version">${versions.map((v,i)=>`<option value="${i}" ${i===previewStage?'selected':''}>第 ${i+1} 版 · ${v.short}</option>`).join('')}</select></label><button data-action="compare" class="listen-button">${icon(comparison?.kind==='compare'?'pause':'headphones',16)}${comparison?.kind==='compare'?'停止对比':'前后对比'}</button><button data-action="preview" class="preview-button">${icon(comparison?.kind==='preview'?'pause':'play',14)}${comparison?.kind==='preview'?'停止试听':'试听这版'}</button></div></div><div class="comparison-status" id="comparison-status" role="status" aria-live="polite">${comparison?comparisonLabel():'未解锁的版本也能试听。对比播放同一句、相同速度。'}</div></section>`;}
function expressionView(){return selected.articulation?`<section class="expression-section" aria-labelledby="expression-title"><div><h2 id="expression-title">这一次，你想怎样表达？</h2><p>音高和节奏相同，试试不同离键方式。两种都可以过关。</p></div><div class="expression-options" role="group" aria-label="演奏表达"><button data-expression="legato" class="${expression==='legato'?'chosen':''}" aria-pressed="${expression==='legato'}"><span class="expression-line"></span>轻柔连贯</button><button data-expression="staccato" class="${expression==='staccato'?'chosen':''}" aria-pressed="${expression==='staccato'}"><span class="expression-dots"></span>轻快短促</button></div></section>`:'';}
function comparisonLabel(){if(!comparison)return '';const stage=comparison.version;return `${comparison.kind==='compare'?(comparison.phase==='A'?'A · 上一版':'B · 成长后的版本'):'正在试听'}：第 ${stage+1} 版「${versions[stage].title}」· 《${selected.song}》同句节选`;}
function tipView(){return `<div class="tip-view">${handIllustration()}<div><h2>放轻松，手指也会记住。</h2><p>${selected.tip}</p><p class="muted">实体琴练习时，坐在琴键中间附近，前臂大致与键面平行，肩膀放松。遇到疼痛时先停下休息。</p></div></div>`;}

function staffSVG(){
  const ev=performanceLesson().events,width=Math.max(800,ev.length*70+130), grand=selected.clef==='grand',height=grand?252:172;
  const left=130, spacing=(width-left-40)/Math.max(ev.reduce((sum,e)=>sum+e.beats+(e.gap||0),0),4);
  const bottom=clef=>clef==='bass'?(grand?205:109):99;
  const staffs=grand?['treble','bass']:[selected.clef];
  const diatonic=n=>Math.floor(n/12)*7+[0,0,1,1,2,3,3,4,4,5,5,6][n%12];
  const position=(n,clef)=>bottom(clef)-(diatonic(n)-diatonic(clef==='bass'?43:64))*6;
  let html=staffs.map(c=>{const b=bottom(c);return `<g class="staff-lines">${Array.from({length:5},(_,i)=>`<line x1="14" x2="${width-15}" y1="${b-i*12}" y2="${b-i*12}"/>`).join('')}</g><text x="24" y="${b-6}" class="clef">${c==='bass'?'𝄢':'𝄞'}</text><text x="76" y="${b-26}" class="time-sign">4</text><text x="76" y="${b-3}" class="time-sign">4</text>`;}).join('');
  const total=ev.reduce((s,e)=>s+e.beats+(e.gap||0),0);
  for(let at=4;at<total;at+=4)html+=staffs.map(c=>`<line class="bar-line" x1="${left+at*spacing-12}" x2="${left+at*spacing-12}" y1="${bottom(c)-48}" y2="${bottom(c)}"/>`).join('');
  html+=ev.map((e,i)=>{
    const x=left+e.at*spacing, done=practice&&i<practice.index, current=i===(demo?demoIndex:(practice?.index||0));
    const mark=`<g data-score="${i}" class="score-note ${done?'done':''} ${current?'target':''}">${current?`<rect class="note-highlight" x="${x-20}" y="22" width="42" height="${height-45}" rx="11"/>`:''}`;
    return mark+e.notes.map(n=>{
      const c=grand?(n<60?'bass':'treble'):selected.clef,y=position(n,c),b=bottom(c), hollow=e.beats>=2;
      let ledger='';for(let ly=b+12;ly<=y+1;ly+=12)ledger+=`<line class="ledger" x1="${x-12}" x2="${x+12}" y1="${ly}" y2="${ly}"/>`;
      for(let ly=b-60;ly>=y-1;ly-=12)ledger+=`<line class="ledger" x1="${x-12}" x2="${x+12}" y1="${ly}" y2="${ly}"/>`;
      return `${e.articulation==='staccato'?`<circle class="articulation-dot" cx="${x}" cy="${y+12}" r="2.1"/>`:''}${ledger}${isBlack(n)?`<text class="accidental" x="${x-22}" y="${y+6}">♯</text>`:''}<ellipse class="note-head ${hollow?'hollow':''}" cx="${x}" cy="${y}" rx="7" ry="5" transform="rotate(-18 ${x} ${y})"/>${e.beats<4?`<line class="note-stem" x1="${x+6}" x2="${x+6}" y1="${y-1}" y2="${y-32}"/>`:''}${e.beats===.5?`<path class="note-flag" d="M${x+6} ${y-32}q18 10 3 22q8-13-3-16"/>`:''}${e.beats===1.5?`<circle class="note-head" cx="${x+15}" cy="${y-3}" r="2.2"/>`:''}${names?`<text class="score-label" x="${x}" y="${b+39+(grand&&c==='treble'?0:0)}" text-anchor="middle">${noteName(n)}</text>`:''}`;
    }).join('')+(e.gap?`<text class="rest-symbol" x="${x+e.beats*spacing}" y="${bottom(staffs[0])-13}">𝄽</text>`:'')+`</g>`;
  }).join('');
  return `<svg class="score-svg" viewBox="0 0 ${width} ${height}" style="min-width:${Math.max(800,ev.length*70+130)}px" role="img" aria-label="第 ${selected.id} 关练习乐谱，${selected.clef==='bass'?'低音谱号':grand?'高低双谱表':'高音谱号'}，4/4 拍">${html}</svg>`;
}
function scoreView(){
  const e=target(), note=e?.notes||[], keys=note.map(keyFor).filter(Boolean);
  return `<div class="score-layout"><div class="score-area"><div class="score-meta"><span>${selected.clef==='bass'?'右手 · 低音谱表':selected.clef==='grand'?'双手 · 大谱表':'右手 · 高音谱表'}</span><span>${selected.timed?'跟随节拍':'不计速度，先弹对'} <span class="meta-separator">·</span> 4/4</span></div><div class="score-scroll">${staffSVG()}</div><div class="score-caption"><span class="current-dot"></span>${practice?.done?'旋律完成，准备乐理小测':countIn?'预备拍，听完再开始':active?(selected.timed?'绿色音符是下一个目标；按谱面节拍进入，休止处松键数拍。':'绿色音符就是现在要弹的音'):'从绿色音符开始，一个音一个音地认识'}</div></div><div class="target-card"><div class="target-label">${countIn?'准备进入':selected.timed?'下一目标':'当前目标'}<span>${selected.timed?'NEXT':'NOW'}</span></div><div class="target-name ${note.length>1?'chord-name':''}">${countIn|| (names?note.map(n=>noteName(n).replace(/(\d+)/,'<sub>$1</sub>')).join('<span class="plus"> + </span>'):'♪')}</div><div class="target-sol">${names?note.map(solfege).join(' · '):'看谱，找到这个音'}</div><div class="target-divider"></div><div class="target-key">${keys.length?keys.map(k=>`<kbd>${k}</kbd>`).join('<span>+</span>'):'点击对应琴键'}</div><span class="target-foot">${countIn?'听节拍，放松手指':`${e?.beats||1} 拍${selected.articulation?(e.articulation==='staccato'?' · 短促离键':' · 连贯保持'):selected.hold?' · 按住后再松开':' · 按下并松开'}`}</span></div></div>`;
}

function keyboardView(){
  const currentPool=pool(), low=mode==='free'?Math.max(21,48+octave*12):Math.min(...selected.pool,selected.rightShift+60), high=mode==='free'?Math.min(108,84+octave*12):selected.rightShift+72;
  const white=Array.from({length:high-low+1},(_,i)=>low+i).filter(n=>!isBlack(n));
  const keys=[];let pos=0;
  for(let n=low;n<=high;n++){const black=isBlack(n), allowed=currentPool.includes(n);if(!black){keys.push(`<button class="piano-key white-key ${allowed?'available':'unavailable'}" data-note="${n}" style="left:${pos/white.length*100}%;width:${100/white.length}%" aria-label="${noteName(n)}${keyFor(n)?'，键盘 '+keyFor(n):''}" ${!allowed?'disabled':''}><span class="key-note">${names||mode==='free'?noteName(n):''}</span>${allowed&&keyFor(n)?`<kbd>${keyFor(n)}</kbd>`:''}${n===60?'<i class="middle-c-dot"></i>':''}</button>`);pos++;}else keys.push(`<button class="piano-key black-key ${allowed?'available':'unavailable'}" data-note="${n}" style="left:${(pos-.31)/white.length*100}%;width:${.62/white.length*100}%" aria-label="${noteName(n)}${keyFor(n)?'，键盘 '+keyFor(n):''}" ${!allowed?'disabled':''}><span class="key-note">${names||mode==='free'?noteName(n):''}</span>${allowed&&keyFor(n)?`<kbd>${keyFor(n)}</kbd>`:''}</button>`);}
  return `<section class="keyboard-section"><div class="keyboard-top"><div><span class="section-label">你的琴键</span><span class="keyboard-detail">${mode==='free'?'完整 88 键 · 点击下方缩略图切换音区':`本关解锁 ${currentPool.length} 个音 · ${selected.leftHand?'双手':`右手 · C${selected.rightShift/12+4} 音区`}`}</span></div><div class="keyboard-settings">${mode==='free'?`<button class="octave-button" data-action="octave-down" aria-label="降低一个八度" ${octave<=-3?'disabled':''}>−</button><span class="octave-label">八度 ${octave>0?'+':''}${octave}</span><button class="octave-button" data-action="octave-up" aria-label="升高一个八度" ${octave>=2?'disabled':''}>+</button>`:''}${icon('volume',16)}<input id="volume" type="range" min="0" max="100" value="${Math.round(audio.volume*100)}" aria-label="音量"></div></div>
    <div class="piano-case"><div class="piano-felt"><span>QINYU <span class="case-subtitle">/ YOUR LITTLE PIANO</span></span><span class="case-led"></span></div><div class="piano-keyboard" style="--white-count:${white.length}">${keys.join('')}</div></div>
    <div class="keyboard-legend"><span><i class="legend-green"></i> 当前目标</span><span><i class="legend-pale"></i> 本关可用音</span><span class="keyboard-shortcut">${icon('keys',14)}${mode==='free'?'[ / ] 切换八度':'按琴键上的字母，或直接点击'} <span>·</span> 空格${active?'暂停':'开始'}</span></div>
    <div class="overview-heading"><span>88 键全景<span> A0 — C8</span></span><span>${mode==='free'?'每个键都可以弹':'亮起的部分，是你现在所在的音区'}</span></div><div class="overview" role="group" aria-label="88 键钢琴全景">${overview(low,high)}</div><div class="overview-labels"><span>A0</span><span>C1</span><span>C2</span><span>C3</span><span class="c4-label">C4 · 中央 C</span><span>C5</span><span>C6</span><span>C7</span><span>C8</span></div>
  </section>`;
}
function overview(low,high){let pos=0;return Array.from({length:88},(_,i)=>i+21).map(n=>{const black=isBlack(n);if(!black)pos++;return `<button class="mini-key ${black?'mini-black':'mini-white'} ${n>=low&&n<=high?'in-view':''} ${selected.pool.includes(n)&&mode==='learn'?'in-pool':''}" style="left:${(black?pos-.3:pos-1)/52*100}%;width:${(black?.6:1)/52*100}%" data-mini="${n}" aria-label="${noteName(n)}${mode==='learn'?'，查看位置':''}" title="${noteName(n)}"></button>`;}).join('');}
function freeView(){return `<section class="page-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span>THE PIANO ROOM</div><h1>没有关卡，只有音乐<span class="heading-dot">.</span></h1><p>在这里随意试试。一个音，一段和弦，都可以是开始。</p></div><div class="free-emblem">${icon('duet',58)}</div></section><section class="free-banner"><div class="free-banner-copy"><span class="eyebrow">ALL 88 KEYS. ALL YOURS.</span><h2>把好奇心，交给指尖。</h2><p>电脑上排 A—K 对应右手 C4—C5，下排 Z—M 对应左手 C3—B3。<br>黑键用 W、E、T、Y、U，点击 88 键全景可弹奏任意音。</p><button class="light-button" data-action="midi">${icon('midi',17)}${esc(midiStatus)}</button></div><div class="free-orbit"><span>♩</span><span>♫</span><span>𝄞</span><i></i></div></section><div class="free-readout"><span class="section-label">现在的声音</span><strong id="free-notes">等你落下第一声</strong><span>保持按键可延音 · 松开结束</span></div>${keyboardView()}<p class="free-note">声音由浏览器实时合成。连接支持的 MIDI 键盘，可用真实琴键弹奏与闯关；不需要上传录音。</p>`;}
function guideView(){return `<section class="page-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span>YOUR POCKET COMPANION</div><h1>随身乐理手册<span class="heading-dot">.</span></h1><p>练习中遇到疑问，就回来翻一翻。知识会慢慢连成旋律。</p></div>${icon('book',50)}</section><div class="guide-callout">${icon('sprout',24)}<p>5 首曲子，每首 6 个版本，共 30 关。下方保留完整基础乐理手册，可随时查阅。手型、触键、力度和真实跨度，请在实体琴上继续探索。</p></div><div class="guide-grid">${referenceChapters.map((ch,i)=>`<section class="guide-chapter"><div class="guide-chapter-title">${icon(ch.icon,23)}<div><span class="eyebrow">CHAPTER ${num(i+1)}</span><h2>${ch.title}</h2></div></div>${referenceLessons.filter(l=>l.chapter===i).map(l=>`<details><summary><span>${num(l.id)}</span>${l.title}${icon('chevron',14)}</summary><p>${l.theory}</p><div class="guide-tip">${l.tip}</div></details>`).join('')}</section>`).join('')}</div>`;}

function bind(){
  document.querySelector('.brand').onclick=e=>{e.preventDefault();setMode('learn');};
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
  document.querySelectorAll('[data-chapter]').forEach(b=>b.onclick=()=>{expanded=expanded===Number(b.dataset.chapter)?-1:Number(b.dataset.chapter);const scroll=window.scrollY;render();window.scrollTo(0,scroll);});
  document.querySelectorAll('[data-lesson]').forEach(b=>b.onclick=()=>chooseLesson(Number(b.dataset.lesson)));
  document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{selectedTab=b.dataset.tab;render();});
  document.querySelectorAll('[data-expression]').forEach(b=>b.onclick=()=>{stopSession();practice=null;expression=b.dataset.expression;render();toast(`已选择${expression==='legato'?'轻柔连贯':'轻快短促'}。示范与离键判定会采用这个版本。`);});
  const preview=document.querySelector('#preview-version');if(preview)preview.onchange=e=>{stopSession();previewStage=Number(e.target.value);render();};
  const volume=document.querySelector('#volume');if(volume)volume.oninput=e=>audio.setVolume(Number(e.target.value)/100);
  const tempo=document.querySelector('#bpm');if(tempo)tempo.oninput=e=>{if(comparison){stopSession();bpm=Number(e.target.value);render();return;}if(active||countIn||demo){stopSession();refreshPractice();const start=document.querySelector('[data-action="start"]');if(start)start.innerHTML=`${icon('play',16)}<span>重新练习</span>`;const listen=document.querySelector('[data-action="demo"]');if(listen)listen.innerHTML=`${icon('headphones',17)}<span>先听示范</span>`;toast('速度已调整，请重新开始练习。');}bpm=Number(e.target.value);document.querySelector('#bpm-label').textContent=bpm;if(metro)startClock();};
  const select=document.querySelector('#lesson-select');if(select)select.onchange=e=>chooseLesson(Number(e.target.value));
  const hint=document.querySelector('#names');if(hint)hint.onchange=e=>{names=e.target.checked;refreshPractice();document.querySelectorAll('.piano-key').forEach(b=>{b.querySelector('.key-note').textContent=names?noteName(Number(b.dataset.note)):'';});};
}
function setMode(next){stopSession();mode=next;practice=null;render();}
function chooseLesson(id){if(!unlocked(id))return;stopSession();selected=lessons[id-1];mode='learn';expanded=selected.chapter;practice=null;names=!selected.hideNames;bpm=selected.bpm;expression=preferredExpression(selected);previewStage=Math.max(1,selected.stage);selectedTab='practice';render();}
async function action(name){
  if(name==='start'){if(mode==='free'){await audio.init();toast('琴房已就绪，试着按 A、S、D。');return;}if(active||countIn){stopSession();render();toast('已暂停。再次开始会从本关开头练习。');}else await startSession();}
  if(name==='restart'){stopSession();practice=null;selectedTab='practice';render();}
  if(name==='demo')await playDemo();
  if(name==='compare'||name==='preview')await playListening(name);
  if(name==='metro'){await audio.init();metro=!metro;if(metro)startClock();else if(!active&&!countIn)clearClock();render();}
  if(name==='help')showHelp();
  if(name==='midi')await connectMidi();
  if(name==='octave-up'||name==='octave-down'){releaseAll();octave=Math.max(-3,Math.min(2,octave+(name==='octave-up'?1:-1)));render();}
}
function clearClock(){clearInterval(clockTimer);clockTimer=null;}
function startClock(){clearClock();beatNumber=0;const tick=()=>{audio.click(beatNumber%4===0);beatNumber++;const dot=document.querySelector('.beat-dot');if(dot){dot.classList.remove('tick');void dot.offsetWidth;dot.classList.add('tick');}};tick();clockTimer=setInterval(tick,60000/bpm);}
function cancelDemo(){demoTimers.forEach(clearTimeout);demoTimers=[];demo=false;comparison=null;audio.allOff();}
function stopSession(){sessionToken++;active=false;countIn=0;cancelDemo();releaseAll();if(!metro)clearClock();}
async function startSession(){
  stopSession();await audio.init();selectedTab='practice';practice=new Practice({...performanceLesson(),bpm});
  const token=++sessionToken;
  if(selected.timed){countIn=4;startClock();render();const wait=ms=>new Promise(resolve=>{const timer=setTimeout(resolve,ms);demoTimers.push(timer);});for(let i=4;i>0;i--){if(token!==sessionToken)return;countIn=i;refreshPractice();await wait(60000/bpm);}if(token!==sessionToken)return;countIn=0;}
  active=true;render();refreshPractice();
}
async function playDemo(){
  if(demo){stopSession();render();return;}
  metro=false;stopSession();await audio.init();demo=true;demoIndex=0;practice=null;selectedTab='practice';render();
  const duration=scheduleSequence(performanceLesson(),0,undefined,i=>{demoIndex=i;refreshPractice();},true);
  demoTimers.push(setTimeout(()=>{demo=false;audio.allOff();render();},duration+200));
}
function scheduleSequence(lesson,offset=0,limit=lesson.events.length,onEvent=()=>{},followKeys=false){
  const beat=60000/bpm,events=lesson.events.slice(0,limit);
  events.forEach((e,i)=>{
    demoTimers.push(setTimeout(()=>{onEvent(i);e.notes.forEach(n=>{audio.play(n,(e.velocity||.76)*(n<60&&lesson.leftHand ? .62 : 1));if(followKeys)document.querySelector(`[data-note="${n}"]`)?.classList.add('sounding');});},offset+e.at*beat));
    demoTimers.push(setTimeout(()=>e.notes.forEach(n=>{audio.stop(n);if(followKeys)document.querySelector(`[data-note="${n}"]`)?.classList.remove('sounding');}),offset+(e.at+e.beats*(e.gate||.78))*beat));
  });
  const last=events.at(-1);return offset+(last.at+last.beats+(last.gap||0))*beat;
}
async function playListening(kind){
  if(comparison?.kind===kind){stopSession();render();return;}
  metro=false;stopSession();await audio.init();practice=null;
  const before=previewStage===0?0:previewStage-1,after=previewStage===0?1:previewStage;
  const indices=kind==='compare'?[before,after]:[previewStage];let offset=0;
  comparison={kind,phase:'A',version:indices[0]};render();
  indices.forEach((stage,i)=>{
    const lesson=expressedLesson(lessons[selected.chapter*6+stage],expression);
    const start=offset;
    demoTimers.push(setTimeout(()=>{comparison={kind,phase:i===0?'A':'B',version:stage};const label=document.querySelector('#comparison-status');if(label)label.textContent=comparisonLabel();},start));
    offset=scheduleSequence(lesson,start,lesson.previewCount);
    if(i<indices.length-1)offset+=700;
  });
  demoTimers.push(setTimeout(()=>{comparison=null;audio.allOff();render();toast(kind==='compare'?'两版听完了。可以再对比一次，或开始弹当前关。':'试听结束。可以继续练习当前版本。');},offset+250));
}
function refreshPractice(){
  if(mode!=='learn')return;
  const area=document.querySelector('#practice-body');if(area)area.innerHTML=selectedTab==='tip'?tipView():scoreView();
  const feedback=document.querySelector('#feedback');if(feedback)feedback.textContent=demo?'正在示范：听一听旋律，看绿色音符和琴键怎样对应。':countIn?`预备 ${countIn} 拍：跟着节拍，准备开始。`:practice?.feedback|| (active?'按下绿色目标音，松开后进入下一个。':'准备好了吗？点击「开始练习」，或先听一遍示范。');
  const count=document.querySelector('#session-count');if(count)count.textContent=`${practice?.index||0} / ${selected.events.length} 个音组${practice?.index?` · 准确率 ${practice.accuracy}%`:''}`;
  refreshKeys();
  const scroll=document.querySelector('.score-scroll'),current=document.querySelector('.score-note.target');if(scroll&&current){const offset=current.getBoundingClientRect().left-scroll.getBoundingClientRect().left;if(offset>scroll.clientWidth-110||offset<50)scroll.scrollLeft+=offset-scroll.clientWidth*.35;}
}
function refreshKeys(){const targets=mode==='learn'&&!practice?.done?target().notes:[];document.querySelectorAll('[data-note]').forEach(b=>{const n=Number(b.dataset.note);b.classList.toggle('target',targets.includes(n));b.classList.toggle('sounding',[...pressed.values()].includes(n));});if(mode==='free'){const label=document.querySelector('#free-notes');if(label)label.textContent=[...new Set(pressed.values())].sort((a,b)=>a-b).map(noteName).join(' · ')||'等你落下第一声';}}
function noteDown(n,source,velocity=.8){
  if(pressed.has(source)||demo||comparison||countIn||document.querySelector('#modal')?.open)return;
  if(mode!=='free'&&mode!=='learn')return;
  if(mode==='learn'&&!selected.pool.includes(n)){if(active){practice.down(n,performance.now());practice.up(n,performance.now());refreshPractice();}return;}
  // Multiple devices may hold the same pitch. Score a pitch only once.
  const already=[...pressed.values()].includes(n);pressed.set(source,n);if(!already){const amount=source.startsWith('midi:')?velocity:(target()?.velocity||.76);audio.play(n,amount*(selected.leftHand&&n<60 ? .62 : 1));if(active){practice.down(n,performance.now());refreshPractice();}}refreshKeys();
}
function noteUp(source){const n=pressed.get(source);if(n===undefined)return;pressed.delete(source);if(![...pressed.values()].includes(n)){audio.stop(n);if(active){practice.up(n,performance.now());refreshPractice();if(practice.done)finish();}}refreshKeys();}
function releaseAll(){pressed.clear();pointers.clear();pendingKeys.clear();audio.allOff();refreshKeys();}
function finish(){active=false;if(!metro)clearClock();audio.allOff();releaseAll();const accuracy=practice.accuracy;render();if(accuracy>=80)showQuiz(accuracy);else openModal(`<div class="modal-symbol">${icon('sprout',30)}</div><span class="eyebrow">EVERY TRY COUNTS</span><h2 id="modal-title">再慢一点，就更好了。</h2><p>这次弹奏准确率为 <strong>${accuracy}%</strong>，达到 80% 就能进入乐理小测。${selected.timed?'可以先调慢速度，听一遍示范，再跟着节拍练习。':'先确认每个目标音，再轻轻落指。'}</p><button class="primary-button modal-main" data-dialog="retry">${icon('repeat',17)}再练一次</button>`);}
function showQuiz(accuracy){
  dialogState={accuracy};openModal(`<span class="eyebrow">ONE LAST LITTLE QUESTION</span><h2 id="modal-title">弹得不错！再想一想。</h2><p>弹奏准确率 <strong>${accuracy}%</strong>。答对这一题，就能解锁下一站。</p><h3 class="quiz-question">${selected.question}</h3><div class="quiz-options">${selected.options.map((o,i)=>`<button data-answer="${i}"><span>${String.fromCharCode(65+i)}</span>${o}</button>`).join('')}</div><p id="quiz-feedback" aria-live="polite" class="quiz-feedback"></p>`);
}
function passed(accuracy){
  const old=progress[selected.id];progress[selected.id]={accuracy:Math.max(old?.accuracy||0,accuracy),date:new Date().toISOString(),...(selected.articulation?{expression}:{})};
  try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));}catch{storageAvailable=false;}
  const last=selected.id===30;openModal(`<div class="modal-symbol">${icon(last?'flag':'star',32)}</div><span class="eyebrow">${last?'YOUR FIRST JOURNEY, COMPLETE':'A LITTLE STEP, A REAL ACHIEVEMENT'}</span><h2 id="modal-title">${last?'第一首，送给自己。':'又向音乐，靠近了一步。'}</h2><p>《${selected.song}》第 ${selected.stage+1} 版已完成。<br>弹奏准确率 <strong>${accuracy}%</strong> · 乐理小测通过</p><div class="achievement-strip">${icon('check',18)}${last?'五首作品的成长旅程已完成 · 继续在实体琴上练习吧':`已解锁：${lessons[selected.id].song} · ${lessons[selected.id].title}`}</div><button class="primary-button modal-main" data-dialog="next">${last?'去自由琴房':'走向下一关'}${icon('arrow',17)}</button>`);}
function openModal(content){const modal=document.querySelector('#modal');modal.innerHTML=`<button class="modal-close icon-button" aria-label="关闭弹窗" data-dialog="close">${icon('close')}</button>${content}`;if(!modal.open)modal.showModal();modal.onclick=e=>{const answer=e.target.closest('[data-answer]');if(answer){if(Number(answer.dataset.answer)===selected.answer)passed(dialogState.accuracy);else{answer.classList.add('wrong');document.querySelector('#quiz-feedback').textContent='还差一点。回想一下本关讲解，再试一次。';}return;}const b=e.target.closest('[data-dialog]');if(!b)return;if(b.dataset.dialog==='retry'){modal.close();startSession();}else if(b.dataset.dialog==='next'){modal.close();if(selected.id===30)setMode('free');else chooseLesson(selected.id+1);}else modal.close();};}
function showHelp(){openModal(`<span class="eyebrow">HELLO, LITTLE PIANIST</span><h2 id="modal-title">让第一声，简单一点。</h2><div class="help-content"><p><strong>01 / 先看，再弹。</strong><br>绿色音符和琴键是当前目标，按下对应电脑字母，或直接点琴键。每个音弹完要松开。关闭音名可练习独立读谱。</p><p><strong>02 / 让键盘慢慢长大。</strong><br>每首从三个音的轮廓版开始，补齐旋律，再换音区、加长短与奏法，最后合奏。右手 A S D F G H J K；黑键 W E T Y U；左手 Z X C V B N M。前两版右手映射 C3 音区，第 3 版起映射 C4。以琴键显示的音名为准。后期和弦需同时按键，可连接 MIDI 避免电脑键盘冲突。</p><p><strong>03 / 先练准确，再练稳定。</strong><br>每首曲子前 3 版先练音高；第 4 版起检查节奏和时值，并有四拍预备拍；第 5 版起按你选择的奏法检查离键。目标有多个音时一起按下并松开。空格开始或暂停。</p><p><strong>04 / 把知识带到真实琴键上。</strong><br>本项目用浏览器合成音色。网页适合乐理、读谱和节奏入门；触键、手型、力度与真实跨度需要在实体琴上练习。MIDI 需要浏览器支持，建议使用桌面版 Chrome 或 Edge，并通过 USB 连接设备。</p><p>无需注册。进度保存在当前浏览器；清理浏览器数据会清除进度。</p></div>`);}
let toastTimer;
function toast(message){const el=document.querySelector('#toast');if(!el)return;el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),4200);}
async function connectMidi(){
  if(!navigator.requestMIDIAccess){toast('当前浏览器不支持 Web MIDI，请在桌面版 Chrome 或 Edge 中使用。');return;}
  try{await audio.init();midiAccess??=await navigator.requestMIDIAccess({sysex:false});const update=()=>{for(const [id,input] of midiInputs){if(!midiAccess.inputs.has(id)||input.state==='disconnected'){input.onmidimessage=null;midiInputs.delete(id);for(const source of [...pressed.keys()])if(source.startsWith(`midi:${id}:`))noteUp(source);}}for(const input of midiAccess.inputs.values()){if(input.state==='disconnected')continue;midiInputs.set(input.id,input);input.onmidimessage=e=>{const [status,n,v]=e.data,cmd=status&0xf0;const source=`midi:${input.id}:${status&15}:${n}`;if(cmd===0x90&&v>0)noteDown(n,source,v/127);else if(cmd===0x80||(cmd===0x90&&v===0))noteUp(source);};}midiStatus=midiInputs.size?`MIDI 已连接 · ${midiInputs.size}`:'未发现 MIDI 设备';document.querySelectorAll('.midi-button span').forEach(el=>el.textContent=midiStatus);};midiAccess.onstatechange=update;update();toast(midiInputs.size?'MIDI 已就绪，可以使用真实琴键弹奏。':'权限已开通，请通过 USB 连接 MIDI 键盘。');}catch(error){toast(error.name==='NotAllowedError'?'MIDI 权限未允许，可以继续用电脑键盘练习。':'MIDI 暂时无法连接，请检查设备与浏览器支持。');}
}

document.addEventListener('keydown',async e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||e.repeat||document.querySelector('#modal')?.open||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
  if(e.code==='Space'){if(e.target.tagName==='BUTTON')return;e.preventDefault();await action('start');return;}
  if(mode==='free'&&(e.code==='BracketLeft'||e.code==='BracketRight')){e.preventDefault();action(e.code==='BracketLeft'?'octave-down':'octave-up');return;}
  const n=keyMap()[e.code];if(n!==undefined){e.preventDefault();pendingKeys.add(e.code);await audio.init();if(pendingKeys.has(e.code))noteDown(n,e.code);}
});
document.addEventListener('keyup',e=>{pendingKeys.delete(e.code);noteUp(e.code);});
document.addEventListener('pointerdown',async e=>{
  const b=e.target.closest('[data-note], [data-mini]');if(!b||b.disabled)return;
  if(b.dataset.mini&&mode!=='free'){toast(`${noteName(Number(b.dataset.mini))} · ${Number(b.dataset.mini)===60?'这就是中央 C':selected.pool.includes(Number(b.dataset.mini))?'本关正在学习的音':'后面的旅程会逐步探索更多音区'}`);return;}
  e.preventDefault();const n=Number(b.dataset.note||b.dataset.mini),source=`pointer:${e.pointerId}`;
  // Register before awaiting AudioContext so a quick tap can never leave a voice held.
  pointers.set(e.pointerId,{n,source});await audio.init();if(!pointers.has(e.pointerId))return;
  if(b.dataset.mini){octave=Math.max(-3,Math.min(2,Math.floor((n-60)/12)));render();}
  noteDown(n,source);
});
document.addEventListener('pointerup',e=>{const p=pointers.get(e.pointerId);if(p){noteUp(p.source);pointers.delete(e.pointerId);}});
document.addEventListener('pointercancel',e=>{const p=pointers.get(e.pointerId);if(p){noteUp(p.source);pointers.delete(e.pointerId);}});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-note]');if(b&&e.detail===0&&!b.disabled){await audio.init();const source=`accessible:${b.dataset.note}`;noteDown(Number(b.dataset.note),source);setTimeout(()=>noteUp(source),selected.hold&&active?(target().beats*60000/bpm*(target().gate||.78)):180);}});
window.addEventListener('blur',()=>{if(active||countIn){stopSession();render();toast('已暂停：返回后可重新开始。');}else releaseAll();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopSession();render();}});
render();
