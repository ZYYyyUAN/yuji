'use strict';
document.addEventListener('DOMContentLoaded',()=>{
  const copy=document.querySelector('.setup-copy'),start=document.getElementById('start-button');
  if(!copy||!start)return;
  const options=document.createElement('div'),launch=document.createElement('div'),note=copy.querySelector('.equal-note');
  options.className='setup-options';options.setAttribute('aria-label','交战设置');
  launch.className='setup-launch';
  for(const child of [...copy.children])if(child!==start&&child!==note)options.append(child);
  launch.append(start);if(note)launch.append(note);copy.append(options,launch);
});
