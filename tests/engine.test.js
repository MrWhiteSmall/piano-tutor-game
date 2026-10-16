import test from 'node:test';
import assert from 'node:assert/strict';
import { Practice } from '../src/engine.js';
import { lessons, noteName, isBlack, rightMap, leftMap } from '../src/curriculum.js';

test('88-key boundary, stable mappings, and all curriculum notes are valid',()=>{
  assert.equal(noteName(21),'A0');assert.equal(noteName(108),'C8');
  assert.equal(Array.from({length:88},(_,i)=>i+21).filter(n=>!isBlack(n)).length,52);
  assert.equal(lessons.length,30);
  const mapped=Object.values({...rightMap,...leftMap});
  for(const lesson of lessons){
    assert.equal(lesson.chapter,Math.floor((lesson.id-1)/5));
    assert(lesson.answer>=0&&lesson.answer<lesson.options.length);
    let at=0;
    for(const event of lesson.events){assert.equal(event.at,at);at+=event.beats+(event.gap||0);for(const n of event.notes){assert(lesson.pool.includes(n),`lesson ${lesson.id}: ${n} must be unlocked`);assert(mapped.includes(n),`lesson ${lesson.id}: ${n} needs a computer mapping`);}}
  }
});
test('every lesson can be completed with correct timing, release duration and simultaneous chords',()=>{
  for(const lesson of lessons){const p=new Practice(lesson);const beat=60000/lesson.bpm;
    for(const e of lesson.events){e.notes.forEach(n=>p.down(n,1000+e.at*beat));e.notes.forEach(n=>p.up(n,1000+(e.at+e.beats*.85)*beat));}
    assert(p.done,`lesson ${lesson.id} must finish`);assert.equal(p.accuracy,100,`lesson ${lesson.id} should score 100`);
  }
});
test('wrong notes do not advance, repeated keydown cannot advance without release',()=>{
  const p=new Practice(lessons[0]);p.down(62,0);assert.equal(p.index,0);p.up(62,100);
  p.down(60,200);p.down(60,250);assert.equal(p.index,0);p.up(60,300);assert.equal(p.index,1);assert(p.accuracy<100);
});
test('a chord must overlap and cannot be played as separate consecutive notes',()=>{
  const p=new Practice(lessons[18]);p.down(48,100);p.up(48,150);p.down(52,160);p.up(52,170);p.down(55,180);p.up(55,190);assert.equal(p.index,0);
  p.down(48,200);p.down(52,210);p.up(48,220);p.down(55,230);p.up(52,240);p.up(55,250);assert.equal(p.index,0);
  p.down(48,1000);p.down(52,1010);p.down(55,1020);p.up(48,2400);p.up(52,2410);p.up(55,2420);assert.equal(p.index,1);
});
test('late chord attacks require releasing and retrying, without getting stuck',()=>{
  const p=new Practice(lessons[17]);p.down(48,100);p.down(52,500);p.up(48,600);p.up(52,610);assert.equal(p.index,0);
  p.down(48,1000);p.down(52,1010);p.up(48,2400);p.up(52,2410);assert.equal(p.index,1);
});
test('timing and hold checks catch a rushed performance',()=>{
  const lesson=lessons[7],p=new Practice(lesson);
  for(const e of lesson.events){const time=1000+p.index*70;e.notes.forEach(n=>p.down(n,time));e.notes.forEach(n=>p.up(n,time+25));}
  assert(p.done);assert(p.accuracy<80);
});
test('rests preserve the silent beat before the next onset',()=>{
  const lesson=lessons[8],p=new Practice(lesson),beat=60000/lesson.bpm;
  p.down(60,1000);p.up(60,1000+beat*.85);
  p.down(64,1000+beat);p.up(64,1000+beat*1.85);
  assert(p.errors>0,'playing through the rest is a timing error');
});
