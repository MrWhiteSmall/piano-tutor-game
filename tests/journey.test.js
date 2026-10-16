import test from 'node:test';
import assert from 'node:assert/strict';
import { Practice } from '../src/engine.js';
import { lessons, songs, versions, lessonKeyMap, expressedLesson } from '../src/journey.js';

test('five songs each have six versions, with every note mapped for computer input',()=>{
  assert.equal(lessons.length,30);assert.equal(songs.length,5);assert.equal(versions.length,6);
  for(const lesson of lessons){
    assert.equal(lesson.chapter,Math.floor((lesson.id-1)/6));
    assert(lesson.answer>=0&&lesson.answer<lesson.options.length);
    const mapped=Object.values(lessonKeyMap(lesson));let at=0;
    for(const e of lesson.events){assert.equal(e.at,at);at+=e.beats+(e.gap||0);for(const n of e.notes){assert(lesson.pool.includes(n));assert(mapped.includes(n),`lesson ${lesson.id}, note ${n} needs a mapping`);assert(n>=21&&n<=108);}}
  }
});
test('each version changes only its intended musical layer',()=>{
  for(let ch=0;ch<5;ch++){
    const [outline,melody,register,rhythm,expression,duet]=lessons.slice(ch*6,ch*6+6);
    assert.equal(outline.pool.length,3);
    const pitches=l=>l.events.map(e=>e.notes.at(-1));
    const durations=l=>l.events.map(e=>[e.beats,e.gap]);
    assert.deepEqual(durations(outline),durations(melody));
    assert.deepEqual(pitches(register),pitches(melody).map(n=>n+12));
    assert.deepEqual(durations(register),durations(melody));
    assert.deepEqual(pitches(rhythm),pitches(register));
    assert.deepEqual(pitches(expression),pitches(rhythm));
    assert.deepEqual(durations(expression),durations(rhythm));
    assert.deepEqual(pitches(duet),pitches(expression));
    assert.deepEqual(durations(duet),durations(expression));
    assert(duet.events.some(e=>e.notes.length>1));
    assert(!outline.timed&&!melody.timed&&!register.timed);
    assert(rhythm.timed&&rhythm.hold);
  }
});
test('all 30 versions can pass with either expression choice',()=>{
  for(const base of lessons)for(const expression of ['staccato','legato']){
    const lesson=expressedLesson(base,expression),p=new Practice(lesson),beat=60000/lesson.bpm;
    for(const e of lesson.events){e.notes.forEach(n=>p.down(n,1000+e.at*beat));e.notes.forEach(n=>p.up(n,1000+(e.at+e.beats*e.gate)*beat));}
    assert(p.done);assert.equal(p.accuracy,100,`lesson ${lesson.id}, ${expression}`);
  }
});
test('short articulation is accepted when taught, sustained playing is rejected',()=>{
  const lesson=expressedLesson(lessons[4],'staccato'),p=new Practice(lesson),e=lesson.events[0],beat=60000/lesson.bpm;
  p.down(e.notes[0],1000);p.up(e.notes[0],1000+beat*.3);assert.equal(p.errors,0);
  const q=new Practice(lesson);q.down(e.notes[0],1000);q.up(e.notes[0],1000+beat*.9);assert.equal(q.errors,1);
  const untaught=new Practice(lessons[0]);untaught.down(48,1000);untaught.up(48,1050);assert.equal(untaught.errors,0,'do not score untaught articulation');
});
test('legato requires holding rather than a short tap',()=>{
  const lesson=expressedLesson(lessons[4],'legato'),p=new Practice(lesson),beat=60000/lesson.bpm;
  p.down(60,1000);p.up(60,1000+beat*.25);assert.equal(p.errors,1);
  const q=new Practice(lesson);q.down(60,1000);q.up(60,1000+beat*.93);assert.equal(q.errors,0);
});
test('double-hand notes must overlap and can recover from a delayed attack',()=>{
  const lesson=expressedLesson(lessons[5],'legato'),p=new Practice(lesson);
  p.down(48,100);p.up(48,150);p.down(60,160);p.up(60,170);assert.equal(p.index,0);
  p.down(48,200);p.down(60,500);p.up(48,600);p.up(60,610);assert.equal(p.index,0);
  p.down(48,1000);p.down(60,1010);p.up(48,1780);p.up(60,1790);assert.equal(p.index,1);
});
test('rushed rhythm and skipped rests are penalized after being introduced',()=>{
  const lesson=lessons[3],p=new Practice(lesson);
  for(const e of lesson.events){const t=1000+p.index*70;e.notes.forEach(n=>p.down(n,t));e.notes.forEach(n=>p.up(n,t+25));}
  assert(p.done);assert(p.accuracy<80);
  const rests=lessons[15],q=new Practice(rests),beat=60000/rests.bpm;let at=1000;
  for(const e of rests.events){e.notes.forEach(n=>q.down(n,at));e.notes.forEach(n=>q.up(n,at+e.beats*beat*.8));at+=e.beats*beat;}
  assert(q.errors>0);
});
test('notated durations do not cross 4/4 bars without ties',()=>{
  for(const lesson of lessons.filter(l=>l.stage>=3))for(const e of lesson.events){
    assert.equal(Math.floor(e.at/4),Math.floor((e.at+e.beats-.0001)/4),`${lesson.song}: duration crosses a bar at ${e.at}`);
  }
});
