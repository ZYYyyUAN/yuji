'use strict';
importScripts('ink.js','forms.js?v=paint15','sculpture.js?v=paint15');
self.onmessage=event=>{
  try{const model=InkSculpture.solve(event.data.source,event.data.target);self.postMessage({model});}
  catch(error){self.postMessage({error:error.message||'Unable to form artwork'});}
};
