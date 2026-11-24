// Local test video only. Recording masks are injected into the test browser;
// they never change application files or the production build.
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { openBrowser } from './browser-support.mjs'

export async function createDemoRecorder(browser, directory, origin) {
  const encoder = await openBrowser(directory, 'video-encoder', origin)
  const privacy = `(() => {
    const install = () => {
      if (document.querySelector('#demo-recording-mask')) return;
      const style = document.createElement('style'); style.id='demo-recording-mask';
      style.textContent='body:has(#username) #root { filter:blur(45px)!important; } [role="dialog"]:has(input[aria-label^="Chữ số PIN"]) { filter:blur(45px)!important; } svg[aria-label="Mã QR đăng nhập FinVault"] { filter:blur(45px)!important; }';
      (document.head || document.documentElement).appendChild(style);
    };
    if (document.documentElement) install();
    new MutationObserver(install).observe(document,{childList:true,subtree:true});
  })()`
  await browser.cdp('Page.addScriptToEvaluateOnNewDocument', { source: privacy })
  await browser.evaluate(privacy)
  await encoder.evaluate(`(() => {
    const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=1040;document.body.append(canvas);
    const context=canvas.getContext('2d');context.fillStyle='#081422';context.fillRect(0,0,1280,1040);
    context.fillStyle='white';context.font='26px Arial';context.fillText('FinVault — chuẩn bị diễn tập tự động',30,90);
    const stream=canvas.captureStream(5);const type=['video/webm;codecs=vp9','video/webm;codecs=vp8'].find(MediaRecorder.isTypeSupported);
    if(!type)throw Error('WebM recording not supported');
    const chunks=[];const recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:650000});
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.start(1000);
    window.demoVideo={canvas,context,stream,recorder,chunks,type};return type;
  })()`)
  const started = Date.now()
  let frames = 0, failure, pending, latestFrame = null
  browser.on('Page.screencastFrame', event => {
    latestFrame = event.data
    void browser.cdp('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(error => { failure = error })
  })
  // Screencast frames do not compete with the harness's evidence screenshots.
  // Concurrent Page.captureScreenshot calls can stall Chromium at navigation.
  await browser.cdp('Page.startScreencast', { format: 'jpeg', quality: 65,
    maxWidth: 1280, maxHeight: 1000, everyNthFrame: 1 })
  async function capture() {
    if (pending || failure) return
    pending = (async () => {
      // Discard sensitive screens entirely in addition to the persistent blur
      // (which protects a navigation that races screenshot capture).
      const sensitive = await browser.has('#username, input[aria-label^="Chữ số PIN"], svg[aria-label="Mã QR đăng nhập FinVault"]')
      const shot = sensitive ? null : latestFrame
      const afterSensitive = await browser.has('#username, input[aria-label^="Chữ số PIN"], svg[aria-label="Mã QR đăng nhập FinVault"]')
      const data = afterSensitive ? null : shot
      const seconds = Math.floor((Date.now() - started) / 1000)
      await encoder.evaluate(`(async () => {
        const {canvas,context}=window.demoVideo;
        const data=${JSON.stringify(data)};
        let image;
        if(data){image=new Image();image.src='data:image/jpeg;base64,'+data;await image.decode();}
        // Decode first: yielding after clearing the canvas records black
        // intermediate frames. Paint each complete frame in one JS task.
        context.fillStyle='#081422';context.fillRect(0,0,1280,1040);
        if(image){context.drawImage(image,0,0,1280,1000);}
        else{context.fillStyle='white';context.font='28px Arial';context.fillText('Đăng nhập / PIN / QR: không ghi nội dung nhạy cảm',35,170);}
        context.fillStyle='#081422';context.fillRect(0,1000,1280,40);context.fillStyle='#99F6E4';context.font='18px Arial';
        context.fillText('FinVault | Diễn tập tự động | IPN tổng hợp; payout mô phỏng | '+${seconds}+' giây',20,1026);
      })()`)
      frames++
    })().catch(error => { failure = error }).finally(() => { pending = null })
    await pending
  }
  await capture()
  const timer = setInterval(() => { void capture() }, 1000)
  const progress = setInterval(() => console.log('Demo video: ' + Math.floor((Date.now() - started) / 1000) + ' seconds recorded'), 30000)
  return {
    async stop() {
      clearInterval(timer); clearInterval(progress)
      if (pending) await pending
      try {
        await browser.cdp('Page.stopScreencast')
        if (failure) throw failure
        const encoded = await encoder.evaluate(`(async()=>{
          const v=window.demoVideo;await new Promise(done=>{v.recorder.onstop=done;v.recorder.stop()});v.stream.getTracks().forEach(t=>t.stop());
          const blob=new Blob(v.chunks,{type:v.type});const bytes=new Uint8Array(await blob.arrayBuffer());let raw='';for(let i=0;i<bytes.length;i+=16384)raw+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(raw);
        })()`)
        const bytes = Buffer.from(encoded, 'base64')
        assert.ok(bytes.length > 1000 && frames > 0, 'Empty rehearsal video')
        assert.equal(bytes.subarray(0, 4).toString('hex'), '1a45dfa3', 'Expected a WebM container')
        writeFileSync(resolve(directory, 'demo.webm'), bytes)
        const metadata = { file: 'demo.webm', seconds: Math.round((Date.now() - started) / 1000),
          frames, bytes: bytes.length, sensitiveScreensExcluded: true, continuousTimeline: true,
          note: 'Automated technical rehearsal; no voice narration. Real Gateway/DB, synthetic balances/IPN and simulated provider.' }
        writeFileSync(resolve(directory, 'demo-video.json'), JSON.stringify(metadata, null, 2))
        return metadata
      } finally { await encoder.close() }
    },
  }
}
