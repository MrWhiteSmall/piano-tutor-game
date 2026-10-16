import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { lessons, lessonKeyMap, PROGRESS_KEY } from '../src/journey.js';
const base=process.env.PIANO_URL||'http://127.0.0.1:5190';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1,reducedMotion:'reduce'});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
await mkdir('.local',{recursive:true});
await mkdir('.impeccable/review',{recursive:true});
await page.addInitScript(()=>{localStorage.setItem('qinyu-progress',JSON.stringify({1:{accuracy:100}}));window.pianoAudioEvents=[];const native=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){const o=native.call(this),start=o.start.bind(o);o.start=(...args)=>{window.pianoAudioEvents.push(o.frequency.value);return start(...args);};return o;};});
try{
  await page.goto(base);await page.locator('h1').waitFor();await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.mini-key').count(),88);
  assert.equal(await page.locator('.piano-key.available').count(),3);
  assert.equal(await page.locator('.version-step').count(),6);
  assert.equal(await page.locator('#preview-version option').count(),6);
  assert(await page.locator('[data-lesson="2"]').first().isDisabled());
  await page.screenshot({path:'.local/desktop.png',fullPage:true});
  await page.screenshot({path:'.impeccable/review/desktop.png',fullPage:true});
  await page.getByRole('button',{name:'开始练习',exact:true}).click();
  // Keep focus on the start button: piano letters must still work.
  for(const e of lessons[0].events){const key=Object.entries(lessonKeyMap(lessons[0])).find(([,n])=>n===e.notes[0])[0];await page.keyboard.down(key);await page.waitForTimeout(50);await page.keyboard.up(key);}
  await page.getByRole('dialog').waitFor({state:'visible'});
  await page.locator('[data-answer="1"]').click();assert.match(await page.locator('#quiz-feedback').textContent(),/再试/);
  await page.locator('[data-answer="0"]').click();assert.match(await page.getByRole('dialog').textContent(),/已解锁/);
  await page.locator('[data-dialog="next"]').click();assert.match(await page.locator('h1').textContent(),/补全旋律/);
  assert.equal(await page.locator('.piano-key.available').count(),6);
  await page.reload();assert.match(await page.locator('h1').textContent(),/补全旋律/);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('qinyu-song-journey-v2')));assert.equal(saved['1'].accuracy,100);
  await page.locator('[data-action="demo"]').click();assert.equal(await page.locator('[data-action="demo"]').textContent(),'停止示范');
  await page.locator('[data-action="demo"]').click();assert.equal(await page.locator('[data-action="demo"]').textContent(),'先听示范');
  await page.locator('.hint-toggle').click();assert.equal(await page.locator('.score-label').count(),0);assert.equal(await page.locator('.white-key.available .key-note').first().textContent(),'');
  await page.locator('[data-tab="tip"]').click();assert.match(await page.locator('.tip-view').textContent(),/A、D、G/);
  await page.locator('[data-mode="free"]').click();assert.equal(await page.locator('.mini-key').count(),88);
  await page.keyboard.down('a');assert.match(await page.locator('#free-notes').textContent(),/C4/);await page.keyboard.up('a');
  await page.keyboard.press('BracketRight');await page.keyboard.down('a');assert.match(await page.locator('#free-notes').textContent(),/C5/);await page.keyboard.up('a');
  // Measure the generated signal through Web Audio, beyond visual feedback.
  const audioResult=await page.evaluate(async()=>{const {PianoAudio}=await import('/src/audio.js');const a=new PianoAudio();await a.init();const analyser=a.ctx.createAnalyser();analyser.fftSize=2048;a.master.connect(analyser);a.play(60);await new Promise(r=>setTimeout(r,120));const samples=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(samples);const rms=Math.sqrt(samples.reduce((s,v)=>s+v*v,0)/samples.length);a.allOff();const voices=a.voices.size;await a.ctx.close();return {rms,voices};});assert(audioResult.rms>.001);assert.equal(audioResult.voices,0);
  await page.screenshot({path:'.local/free.png',fullPage:true});
  await page.locator('[data-mode="guide"]').click();assert.equal(await page.locator('details').count(),30);await page.locator('summary').first().click();assert(await page.locator('details').first().evaluate(el=>el.open));
  await page.locator('[data-mode="learn"]').click();await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'.local/mobile.png',fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'no horizontal page overflow');
  await page.getByRole('button',{name:'开始练习',exact:true}).click();
  for(const note of lessons[1].events.map(e=>e.notes[0])){const b=page.locator(`[data-note="${note}"]`);await b.scrollIntoViewIfNeeded();const box=await b.boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.85);await page.mouse.down();await page.waitForTimeout(90);await page.mouse.up();}
  await page.getByRole('dialog').waitFor({state:'visible'});assert.match(await page.getByRole('dialog').textContent(),/100%/);
  await page.locator('[data-answer="1"]').click();await page.locator('[data-dialog="next"]').click();
  assert.match(await page.locator('.song-heading-stage').textContent(),/亮起来/);
  assert(await page.locator('[data-note="69"]').isEnabled(),'octave shift exposes higher melody pitches');
  assert.equal(await page.locator('[data-note="48"]').count(),0);
  await page.locator('#preview-version').selectOption('5');
  await page.locator('[data-action="preview"]').click();assert.match(await page.locator('#comparison-status').textContent(),/第 6 版/);
  await page.locator('[data-action="preview"]').click();
  const beforeCancel=await page.evaluate(()=>window.pianoAudioEvents.length);await page.waitForTimeout(900);assert.equal(await page.evaluate(()=>window.pianoAudioEvents.length),beforeCancel,'stopped preview must cancel future notes');
  await page.clock.install({time:new Date('2026-10-16T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-16T00:00:01Z'));
  await page.locator('#preview-version').selectOption('1');
  await page.locator('[data-action="compare"]').click();await page.clock.runFor(10);assert.match(await page.locator('#comparison-status').textContent(),/A · 上一版/);
  await page.clock.runFor(6700);assert.match(await page.locator('#comparison-status').textContent(),/B · 成长后的版本/);
  await page.clock.runFor(6500);assert.equal(await page.locator('[data-action="compare"]').textContent(),'前后对比');
  const audioLog=await page.evaluate(()=>window.pianoAudioEvents);assert(audioLog.some(f=>Math.abs(f-220)<1),'current playback includes A3 restored in complete melody');
  // Resume after the first three versions, then actually play all timed versions.
  await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({1:{accuracy:100},2:{accuracy:100},3:{accuracy:100}})),PROGRESS_KEY);await page.reload();
  await page.clock.install({time:new Date('2026-10-16T01:00:00Z')});await page.clock.pauseAt(new Date('2026-10-16T01:00:01Z'));
  await page.setViewportSize({width:1440,height:1080});
  for(const index of [3,4,5]){
    const lesson=lessons[index];
    if(index===4){await page.locator('[data-expression="legato"]').click();assert.equal(await page.locator('[data-expression="legato"]').getAttribute('aria-pressed'),'true');await page.clock.runFor(4500);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'.impeccable/review/expression-desktop.png',fullPage:true});}
    if(index===5)assert.equal(await page.locator('[data-expression="legato"]').getAttribute('aria-pressed'),'true','duet preserves selected expression');
    await page.locator('[data-action="start"]').click();await page.waitForFunction(()=>document.querySelector('#feedback').textContent.includes('预备'));
    const beat=60000/lesson.bpm;await page.clock.runFor(beat*4+10);let cursor=0;
    for(const e of lesson.events){const onset=e.at*beat;if(onset>cursor)await page.clock.runFor(onset-cursor);const codes=e.notes.map(n=>Object.entries(lessonKeyMap(lesson)).find(([,pitch])=>pitch===n)[0]);for(const code of codes)await page.keyboard.down(code);const gate=index>=4?.93:e.gate;const duration=e.beats*gate*beat;await page.clock.runFor(duration);for(const code of codes)await page.keyboard.up(code);cursor=onset+duration;}
    await page.getByRole('dialog').waitFor({state:'visible'});assert.match(await page.getByRole('dialog').textContent(),/100%/);
    await page.locator(`[data-answer="${lesson.answer}"]`).click();await page.locator('[data-dialog="next"]').click();
  }
  assert.match(await page.locator('h1').textContent(),/欢乐颂/);
  assert(await page.locator('[data-lesson="7"]').first().isEnabled());
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'.impeccable/review/mobile.png',fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  console.log('PASS: six-version song progression, legacy progress isolation, before/after audio and cancellation, keyboard/pointer input, rhythm and expression and duet played through at 100%, quizzes, next-song unlock, persistence, MIDI-free audio signal, mobile layout; no page errors.');
}finally{await browser.close();}
