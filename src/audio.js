export class PianoAudio {
  constructor(){this.ctx=null;this.voices=new Map();this.volume=.65;this.master=null;}
  async init(){
    if(!this.ctx){this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=this.volume*.22;const limiter=this.ctx.createDynamicsCompressor();this.master.connect(limiter);limiter.connect(this.ctx.destination);}
    if(this.ctx.state==='suspended')await this.ctx.resume();
  }
  setVolume(value){this.volume=value;if(this.master)this.master.gain.setTargetAtTime(value*.22,this.ctx.currentTime,.03);}
  play(note,velocity=.8){
    if(!this.ctx||this.ctx.state!=='running')return;
    this.stop(note);const t=this.ctx.currentTime;const gain=this.ctx.createGain();gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(velocity,t+.008);gain.gain.exponentialRampToValueAtTime(.28*velocity,t+.3);gain.gain.exponentialRampToValueAtTime(.035,t+3);gain.connect(this.master);
    const frequency=440*2**((note-69)/12);const oscs=[1,2,3,4].map((harmonic,i)=>{const osc=this.ctx.createOscillator();const partial=this.ctx.createGain();osc.type='sine';osc.frequency.value=frequency*harmonic;partial.gain.value=[.75,.19,.07,.025][i];osc.connect(partial);partial.connect(gain);osc.start(t);return osc;});
    const voice={gain,oscs};this.voices.set(note,voice);
    voice.timer=setTimeout(()=>{if(this.voices.get(note)===voice)this.stop(note);},12000);
  }
  stop(note){const voice=this.voices.get(note);if(!voice||!this.ctx)return;clearTimeout(voice.timer);const t=this.ctx.currentTime;voice.gain.gain.cancelScheduledValues(t);voice.gain.gain.setTargetAtTime(.0001,t,.07);voice.oscs.forEach(o=>o.stop(t+.45));setTimeout(()=>voice.gain.disconnect(),550);this.voices.delete(note);}
  allOff(){for(const n of this.voices.keys())this.stop(n);}
  click(accent=false){if(!this.ctx||this.ctx.state!=='running')return;const t=this.ctx.currentTime;const o=this.ctx.createOscillator();const g=this.ctx.createGain();o.frequency.value=accent?1250:850;g.gain.setValueAtTime(.28,t);g.gain.exponentialRampToValueAtTime(.001,t+.055);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+.06);o.onended=()=>g.disconnect();}
}
