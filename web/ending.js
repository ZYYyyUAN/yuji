'use strict';
window.YujiEnding=class {
  constructor({eligible,onOpen,onReturn,onAgain,sound}){
    this.eligible=eligible;this.onOpen=onOpen;this.onReturn=onReturn;this.onAgain=onAgain;this.sound=sound;
    this.dialog=document.getElementById('ending-dialog');this.video=document.getElementById('emergence-film');this.playButton=document.getElementById('ending-play');this.message=document.getElementById('ending-media-status');this.phase='idle';this.timer=null;this.seen=false;this.pending=false;this.watched=0;
    this.advanceButton=document.getElementById('ending-advance');this.lineTimer=null;this.lineIndex=-1;this.lineElapsed=0;this.leaving=false;this.pagePaused=false;this.motion=matchMedia('(prefers-reduced-motion: reduce)');
    try{this.seen=localStorage.getItem('yujiFirstEndingV1')==='done';}catch{}
    this.preview=new URLSearchParams(location.search).get('endingPreview')==='1';if(this.preview)this.seen=false;
    document.getElementById('ending-watch').addEventListener('click',()=>this.play());
    this.playButton.addEventListener('click',()=>this.play());
    document.getElementById('ending-skip').addEventListener('click',()=>this.phase==='video'?this.setPhase('outro'):this.complete(false));
    document.getElementById('ending-again').addEventListener('click',()=>this.complete(true));
    document.getElementById('ending-return').addEventListener('click',()=>this.complete(false));
    this.advanceButton.addEventListener('click',()=>this.advanceSentence());
    this.dialog.addEventListener('cancel',e=>{e.preventDefault();if(this.phase==='video')this.setPhase('outro');else this.complete(false);});
    this.video.addEventListener('ended',()=>this.setPhase('outro'));
    this.video.addEventListener('playing',()=>{this.playButton.hidden=true;this.message.textContent='';});
    this.video.addEventListener('pause',()=>{if(this.phase==='video'&&!this.video.ended){this.playButton.hidden=false;this.playButton.textContent='继续播放 ↗';}});
    this.video.addEventListener('error',()=>this.mediaFailure());
    document.addEventListener('visibilitychange',()=>{this.pauseCopy(document.hidden);if(document.hidden&&this.phase==='video')this.video.pause();});
    window.addEventListener('pagehide',()=>{this.pauseCopy(true);this.video.pause();});
    window.addEventListener('pageshow',()=>this.pauseCopy(document.hidden));
  }
  schedule(){
    if(this.seen||this.pending||this.dialog.open)return;
    this.pending=true;this.watched=0;let last=performance.now();
    this.timer=setInterval(()=>{const now=performance.now();if(this.eligible())this.watched+=Math.min(300,now-last);last=now;if(this.watched>=4000){clearInterval(this.timer);this.timer=null;this.pending=false;this.open();}},250);
  }
  open(){
    if(this.seen||!this.eligible())return;
    this.onOpen();document.body.classList.add('ending-open');this.dialog.showModal();
    this.video.removeAttribute('src');this.video.preload='none';this.setPhase('intro');
  }
  setPhase(phase){
    if(!this.dialog.open)return;
    this.stopCopy();
    this.phase=phase;this.dialog.dataset.phase=phase;
    for(const section of this.dialog.querySelectorAll('[data-ending-phase]'))section.hidden=section.dataset.endingPhase!==phase;
    document.getElementById('ending-skip').textContent=phase==='video'?'跳过视频':phase==='outro'?'关闭':'跳过';
    this.dialog.setAttribute('aria-labelledby',phase==='intro'?'ending-intro-title':phase==='outro'?'ending-outro-title':'ending-video-title');
    if(phase!=='video')this.video.pause();
    if(phase==='intro'||phase==='outro')this.startCopy(phase);
    else document.getElementById('ending-skip').focus({preventScroll:true});
  }
  startCopy(phase){
    this.copy=this.dialog.querySelector('[data-ending-phase="'+phase+'"]');this.lines=[...this.copy.querySelectorAll('[data-ending-sentence]')];this.actions=this.copy.querySelector('[data-ending-actions]');this.actions.hidden=true;
    this.showSentence(0);this.advanceButton.focus({preventScroll:true});this.pauseCopy(document.hidden);
    this.lineTimer=setInterval(()=>{
      const now=performance.now(),dt=Math.min(150,now-this.lineStamp);this.lineStamp=now;
      if(document.hidden||this.pagePaused||!this.dialog.open)return;
      this.lineElapsed+=dt;
      if(this.leaving){if(this.lineElapsed>=450||this.motion.matches)this.showSentence(this.lineIndex+1);return;}
      if(this.lineIndex===this.lines.length-1){
        if(this.actions.hidden&&this.lineElapsed>=(this.motion.matches?0:800)){
          const hadAdvanceFocus=document.activeElement===this.advanceButton;this.actions.hidden=false;this.advanceButton.hidden=true;
          if(hadAdvanceFocus)document.getElementById(this.phase==='intro'?'ending-watch':'ending-again').focus({preventScroll:true});
          clearInterval(this.lineTimer);this.lineTimer=null;
        }
      }else if(this.lineElapsed>=3800)this.advanceSentence();
    },50);
  }
  showSentence(index){
    this.lineIndex=index;this.lineElapsed=0;this.leaving=false;this.lineStamp=performance.now();
    this.lines.forEach((line,i)=>{line.hidden=i!==index;line.classList.remove('is-leaving','is-visible');});
    this.sentence=this.lines[index];void this.sentence.offsetWidth;this.sentence.classList.add('is-visible');
    this.advanceButton.hidden=false;document.getElementById('ending-progress').textContent=(index+1)+' / '+this.lines.length;
  }
  advanceSentence(){
    if(!this.dialog.open||!['intro','outro'].includes(this.phase)||this.leaving||this.lineIndex>=this.lines.length-1)return;
    if(this.motion.matches){this.showSentence(this.lineIndex+1);return;}
    this.leaving=true;this.lineElapsed=0;this.sentence.classList.remove('is-visible');this.sentence.classList.add('is-leaving');
  }
  pauseCopy(paused){this.pagePaused=paused;this.lineStamp=performance.now();this.dialog.classList.toggle('ending-paused',paused);}
  stopCopy(){
    clearInterval(this.lineTimer);this.lineTimer=null;this.lineIndex=-1;this.advanceButton.hidden=true;
    for(const actions of this.dialog.querySelectorAll('[data-ending-actions]'))actions.hidden=true;
  }
  async play(){if(this.dialog.open)this.setPhase('outro');}
  mediaFailure(){if(this.phase!=='video')return;this.playButton.hidden=false;this.playButton.textContent='重试播放 ↗';this.message.textContent='短片暂时无法播放。可以重试，或跳过视频。';}
  complete(again){
    this.seen=true;if(!this.preview)try{localStorage.setItem('yujiFirstEndingV1','done');}catch{}
    this.cancel();if(again)this.onAgain();else this.onReturn();
  }
  cancel(){clearInterval(this.timer);this.timer=null;this.stopCopy();this.pending=false;this.phase='idle';this.video.pause();if(this.dialog.open)this.dialog.close();this.video.removeAttribute('src');this.video.load();document.body.classList.remove('ending-open');}
  snapshot(){return {seen:this.seen,preview:this.preview,pending:this.pending,open:this.dialog.open,phase:this.phase,watched:this.watched,line:this.lineIndex,lineElapsed:this.lineElapsed,lineLeaving:this.leaving,copyPaused:this.pagePaused,videoTime:this.video.currentTime,videoPaused:this.video.paused};}
};
