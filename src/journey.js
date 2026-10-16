import { rightMap, leftMap } from './curriculum.js';

export const PROGRESS_KEY = 'qinyu-song-journey-v2';
export const versions = [
  { title:'认出轮廓', short:'轮廓', concept:'少量音', change:'只用三个音，先让旋律有一个轮廓。', listen:'留意重复与起伏。这里有些旋律音被简化了。' },
  { title:'补全旋律', short:'旋律', concept:'更准确的音高', change:'补回简化的旋律音，音区、速度与奏法保持不变。', listen:'哪些音原来挤在一起，现在分开了？' },
  { title:'让旋律亮起来', short:'音区', concept:'高一个八度', change:'每个旋律音都升高一个八度，顺序和节奏保持不变。', listen:'还是同一段旋律，整体的声音更高、更明亮了。' },
  { title:'给句子留一点时间', short:'长短', concept:'时值与节奏', change:'在原来的音高上，加入这段曲子的长短音与停顿。', listen:'注意句尾怎样停下来，或让声音多留一会儿。' },
  { title:'试出自己的语气', short:'奏法', concept:'连贯或短促', change:'音高与落键节奏保持不变，试着改变每个音的离键时机。', listen:'同一句话，可以像轻声讲述，也可以像小步跳跃。' },
  { title:'给旋律一个陪伴', short:'合奏', concept:'左手伴奏', change:'保留上一版旋律，在部分落键处加一个左手低音。', listen:'听一听下方的低音，怎样托住原来的旋律。' },
];

const song = (title, subtitle, icon, notes, beats, phraseEnds, bass, extra={}) => ({title,subtitle,icon,notes,beats,phraseEnds,bass,...extra});
export const songs = [
  song('小星星','从三个音，到一闪一闪的旋律','sprout',
    [60,60,67,67,69,69,67,65,65,64,64,62,62,60],
    [1,1,1,1,1,1,2,1,1,1,1,1,1,2],[6,13],{0:48,4:53,7:53,11:55,13:48},
    {anchors:[60,64,67], previewCount:7, mood:'staccato', tip:'电脑按 A、D、G。音之间有跨度，实体琴上可以移动手位，不必强行撑开五指。'}),
  song('欢乐颂','让熟悉的一句，渐渐有了呼吸','pulse',
    [64,64,65,67,67,65,64,62,60,60,62,64,64,62,62],
    [1,1,1,1,1,1,1,1,1,1,1,1,1.5,.5,2],[7,14],{0:48,4:55,8:48,12:55,14:48},
    {anchors:[60,64,67],previewCount:8,mood:'legato',tip:'从 Mi Mi Fa Sol 开始。先看下一个目标，再落指；附点节奏可以数“1 和 2 和”。'}),
  song('两只老虎','重复、八分音符，还有一拍安静','duet',
    [60,62,64,60,60,62,64,60,64,65,67,64,65,67,67,69,67,65,64,60],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,.5,.5,.5,.5,1,1],[3,7,10,13,19],{0:48,4:48,8:48,11:55,14:55,19:48},
    {anchors:[60,64,67],previewCount:8,mood:'staccato',gaps:{10:1,13:1},tip:'同一句会出现两次。第四版起，两个半拍要均匀，标有休止时继续数拍。'}),
  song('玛丽有只小羊羔','在五个白键里，把故事讲清楚','hand',
    [64,62,60,62,64,64,64,62,62,62,64,67,67,64,62,60,62,64,64,64,64,62,62,64,62,60],
    [1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2],[6,9,12,25],{0:48,4:48,7:55,10:48,13:48,17:48,21:55,25:48},
    {anchors:[60,64,67],previewCount:7,mood:'legato',tip:'右手以 C—G 五指位置为主，拇指到小指是 1—5 指。句尾稍留空间，像讲完一句话。'}),
  song('铃儿响叮当','带着已有的本领，完成最后一段','flag',
    [64,64,64,64,64,64,64,67,60,62,64,65,65,65,65,65,64,64,64,64,62,62,64,62,67],
    [1,1,2,1,1,2,1,1,1.5,.5,4,1,1,1.5,.5,1,1,1,1,.5,.5,1,1,1,1],
    [2,5,10,19,24],{0:48,3:48,6:48,8:48,11:53,15:53,19:55,24:55},
    {anchors:[60,64,67],previewCount:11,mood:'staccato',tip:'重复音每次都要重新落键。左手用 Z、V、B 加低音；不要用肩膀或手腕用力顶住琴键。'}),
];

function timeline(events){let at=0;return events.map(e=>{const next={...e,at};at+=e.beats+(e.gap||0);return next;});}
const nearest=(n,anchors)=>anchors.reduce((best,a)=>Math.abs(a-n)<Math.abs(best-n)?a:best);
export const chapters=songs.map((s,i)=>({title:s.title,subtitle:s.subtitle,icon:s.icon,range:`${String(i*6+1).padStart(2,'0')}—${String(i*6+6).padStart(2,'0')}`}));

const quizFor=(s,stage)=>[
  ['轮廓版与完整旋律相比，有什么特点？',['有些音被简化了，先练少量音','已经包含曲子的全部音高','一定要弹得特别快'],0],
  ['补回旋律音后，主要改变了什么？',['音量','音高的走向与细节','钢琴换成了别的乐器'],1],
  ['把每个音升高一个八度，改变的是？',['音色，换了一种乐器','音区，整段旋律更高','每个音都必须弹更久'],1],
  [s.gaps?'看到休止符时应该怎样做？':s.title==='欢乐颂'?'附点四分音符加一个八分音符，共占几拍？':'本课的二分音符占几拍？',s.gaps?['保持按住前一个音','松键，继续数拍','跳过这段时间']:['一拍','两拍','四拍'],1],
  ['同一段旋律，可以用不同奏法表达吗？',['可以，连贯与短促能带出不同感觉','不可以，只有一种好听的弹法','只要换音色就不必注意节奏'],0],
  ['加入左手低音后，适合怎样练习？',['立刻用最快速度合手','先分手慢练，再把同时落键的位置合起来','让左手盖过全部旋律'],1],
][stage];

export const lessons=songs.flatMap((s,chapter)=>versions.map((v,stage)=>{
  const shift=stage<2?-12:0;
  let events=timeline(s.notes.map((n,i)=>({
    notes:stage===5&&s.bass[i]!==undefined?[s.bass[i],n]:[(stage===0?nearest(n,s.anchors):n)+shift],
    beats:stage>=3?s.beats[i]:1, gap:stage>=3?(s.gaps?.[i]||0):0,
    articulation:stage>=4&&s.mood==='staccato'&&s.beats[i]<2?'staccato':stage>=4?'legato':'normal',
    gate:stage>=4?(s.mood==='staccato'&&s.beats[i]<2?.3:.93):.78,
    velocity:stage>=4?(s.phraseEnds.includes(i)?.5:.76):.76,
  })));
  const [question,options,answer]=quizFor(s,stage);
  const octaveTheory='A、B、C 是音名，数字是音区编号。C3 到 C4 相差一个八度，频率翻倍。它们同叫 C，但音高不同；这次改变的是音区，乐器音色仍然是钢琴。';
  const theories=[
    `这是《${s.title}》的旋律节选。先把它简化成三个音，在中央 C 左侧的 C3 音区慢慢弹；电脑 A 对应 C3。先听轮廓，按对顺序即可，暂时不考节奏。这个版本还不是完整旋律。`,
    `还是同一句《${s.title}》。这次补回原来的旋律音，其他部分保持不变。C D E F G A B 是音名，在 C 大调里对应 Do Re Mi Fa Sol La Si。听听新增的音怎样让旋律更清晰；先慢慢弹对。`,
    `${octaveTheory} 琴键上的音名已更新，同一个电脑字母仍对应旋律中的同一个位置。`,
    `音高与上一版相同。这次加入原曲节选的长短音${s.gaps?'和练习用休止':''}：四分音符一拍，二分音符两拍，八分音符半拍${s.beats.includes(1.5)?'，附点四分音符一拍半':''}。听四拍预备拍后开始，按标记时长保持并松开。`,
    '同一旋律，可以有不同语气。连贯时在接近下个音时松开；短促时较早松开，让音与音之间有空隙，但下一音仍按原节拍进入。这里可以试两种表达，按你选择的奏法练习。电脑按键没有力度感应，轻重由下方表达选择控制；MIDI 可感知输入力度。',
    `保留刚才的旋律与奏法，在部分音上同时加一个左手低音。低音谱号下方读左手，高音谱号上方读右手；左手用 Z、V、B 等下排按键。先分手练，再合起来。这里是《${s.title}》的入门节选编配，可以继续带到实体琴上练习。`,
  ];
  return {id:chapter*6+stage+1,chapter,stage,song:s.title,title:v.title,goal:`《${s.title}》· 第 ${stage+1} 版`,change:v.change,listenFor:v.listen,
    events,pool:[...new Set(events.flatMap(e=>e.notes))].sort((a,b)=>a-b),theory:theories[stage],question,options,answer,
    tip:stage===2?'音高上移后，实体琴上的手位也需要上移一个八度；电脑按键已随本版映射，不必记一套新字母。':s.tip,
    bpm:72,timed:stage>=3,hold:stage>=3,articulation:stage>=4,expression:s.mood,rightShift:shift,leftHand:stage===5,hideNames:chapter>=3&&stage===5,
    clef:stage===5?'grand':stage<2?'bass':'treble',previewCount:s.previewCount,
  };
}));

export function lessonKeyMap(lesson){return {...(lesson.leftHand?leftMap:{}),...Object.fromEntries(Object.entries(rightMap).map(([key,n])=>[key,n+lesson.rightShift]))};}
export function expressedLesson(lesson,expression=lesson.expression){
  if(!lesson.articulation)return lesson;
  return {...lesson,expression,events:lesson.events.map((e,i)=>({...e,
    articulation:expression==='staccato'&&e.beats<2?'staccato':'legato',
    gate:expression==='staccato'&&e.beats<2?.3:.93,
    velocity:expression==='staccato'?.8:(songs[lesson.chapter].phraseEnds.includes(i)?.44:.62),
  }))};
}
