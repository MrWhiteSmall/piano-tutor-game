export class Practice {
  constructor(lesson) { this.lesson=lesson;this.index=0;this.errors=0;this.attempts=0;this.held=new Map();this.released=new Set();this.collected=new Set();this.origin=null;this.onset=null;this.feedback='';this.done=false; }
  get current(){return this.lesson.events[this.index];}
  get accuracy(){return Math.max(0,Math.round(this.index/Math.max(1,this.index+this.errors)*100));}
  down(note,time){
    if(this.done||this.held.has(note))return;
    this.held.set(note,time);
    const e=this.current;
    if(!e.notes.includes(note)){this.errors++;this.feedback='再看一眼目标音，慢慢来';return;}
    if(this.collected.has(note)) return;
    if(this.released.size){this.errors++;this.feedback='和弦要同时按住，全部松开后重试';return;}
    if(this.onset===null)this.onset=time;
    if(time-this.onset>200&&e.notes.length>1&&!this.collected.has(note)){this.errors++;this.feedback='和弦要一起落下。松开全部琴键重试';return;}
    this.collected.add(note);
    if(this.collected.size===e.notes.length){
      const beat=60000/this.lesson.bpm;
      if(this.origin===null)this.origin=this.onset-e.at*beat;
      if(this.lesson.timed&&Math.abs(this.onset-(this.origin+e.at*beat))>beat*.48){this.errors++;this.feedback='音对了，下一次留意节拍';}
      else this.feedback='很好，松开后继续';
    }
  }
  up(note,time){
    if(!this.held.has(note)||this.done)return;
    const start=this.held.get(note);this.held.delete(note);
    if(!this.current.notes.includes(note))return;
    if(!this.collected.has(note)) { if(!this.held.size){this.collected.clear();this.released.clear();this.onset=null;} return; }
    this.released.add(note);
    const beat=60000/this.lesson.bpm;
    const target=this.current.beats*beat;
    const duration=time-start;
    const articulation=this.lesson.articulation?this.current.articulation:'normal';
    const min=articulation==='staccato'?target*.12:articulation==='legato'?target*.72:target*.55;
    const max=articulation==='staccato'?target*.5:target+beat*.6;
    if(this.lesson.hold&&(duration<min||duration>max)){
      this.errors++;
      this.feedback=articulation==='staccato'?'这一版试着短促离键，下一音仍按节拍进入':articulation==='legato'?'这一版让声音更连贯，接近下一音时再松开':duration<min?'松得早了一点，注意音符时值':'保持得太久了，注意音符时值';
    }
    if(this.collected.size===this.current.notes.length&&this.released.size===this.current.notes.length){this.index++;this.collected.clear();this.released.clear();this.onset=null;if(this.index===this.lesson.events.length)this.done=true;}
    else if(!this.held.size){this.collected.clear();this.released.clear();this.onset=null;this.feedback='一起按住所有目标音，再一起松开';}
  }
}
