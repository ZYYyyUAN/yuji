package com.yuji.game;

import android.app.*;
import android.content.*;
import android.content.res.AssetFileDescriptor;
import android.net.Uri;
import android.os.*;
import android.util.Base64;
import android.util.Log;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.JSONObject;
import java.io.*;
import java.util.*;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    static final String HOME = "https://"+HOST+"/assets/index.html?v=entry21";
    private WebView web;
    private FrameLayout root;
    private View custom;
    private WebChromeClient.CustomViewCallback customCallback;
    private byte[] pendingPng;
    private boolean saving;
    private final Map<String,byte[]> mediaCache=new HashMap<>();
    private FrameLayout filmLayer;
    private VideoView film;
    private MediaController filmControls;
    private final Handler filmHandler=new Handler(Looper.getMainLooper());
    private final Runnable filmTick=new Runnable(){public void run(){if(film==null)return;publishFilm();filmHandler.postDelayed(this,250);}};
    private final java.util.concurrent.ExecutorService io = Executors.newSingleThreadExecutor();

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        root = new FrameLayout(this);
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(-1,-1));
        setContentView(root);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if(Build.VERSION.SDK_INT>=28){WindowManager.LayoutParams attrs=getWindow().getAttributes();attrs.layoutInDisplayCutoutMode=WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;getWindow().setAttributes(attrs);}
        if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::handleBack);
        WebSettings settings=web.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setUseWideViewPort(true);settings.setLoadWithOverviewMode(true);
        settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.NORMAL);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true); settings.setSupportMultipleWindows(false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web.addJavascriptInterface(new SaveBridge(), "YujiAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !isLocal(request.getUrl());
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return asset(request);
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage msg) {
                Log.d("YujiWeb", msg.message()+" @"+msg.lineNumber()); return true;
            }
            @Override public void onShowCustomView(View view, CustomViewCallback callback) {
                if(custom!=null) { callback.onCustomViewHidden(); return; }
                custom=view; customCallback=callback; web.setVisibility(View.GONE);
                root.addView(view, new FrameLayout.LayoutParams(-1,-1)); immersive();
            }
            @Override public void onHideCustomView() { hideCustom(); }
        });
        immersive();
        boolean verify=BuildConfig.DEBUG && getIntent().getBooleanExtra("verify",false);
        web.loadUrl(HOME+(verify?"&check=1&allBots=1&seed=73":""));
    }
    private static boolean isLocal(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) && uri.getPort()==-1;
    }
    private WebResourceResponse response(int code, String reason, String mime, InputStream stream, Map<String,String> headers) {
        return new WebResourceResponse(mime, mime.startsWith("text/")||mime.contains("javascript")||mime.contains("json")?"UTF-8":null, code, reason, headers, stream);
    }
    private WebResourceResponse error(int code, String reason) {
        return response(code,reason,"text/plain",new ByteArrayInputStream(reason.getBytes(java.nio.charset.StandardCharsets.UTF_8)),Collections.singletonMap("Cache-Control","no-store"));
    }
    private WebResourceResponse asset(WebResourceRequest request) {
        Uri uri=request.getUrl();
        if(!isLocal(uri)) return error(403,"Forbidden");
        String path=uri.getPath();
        if(path==null || !path.startsWith("/assets/") || path.contains("..") || path.contains("\\") || path.indexOf('\0')>=0) return error(404,"Not Found");
        String file="web/"+path.substring(8);
        if(!"GET".equals(request.getMethod()) && !"HEAD".equals(request.getMethod())) return error(405,"Method Not Allowed");
        try {
            String suffix=file.substring(file.lastIndexOf('.')+1).toLowerCase(Locale.ROOT);
            String mime=switch(suffix) {case "html"->"text/html";case "css"->"text/css";case "js"->"text/javascript";case "json"->"application/json";case "png"->"image/png";case "jpg","jpeg"->"image/jpeg";case "mp4"->"video/mp4";case "wav"->"audio/wav";default->"application/octet-stream";};
            Map<String,String> headers=new HashMap<>();
            headers.put("Cache-Control","no-store"); headers.put("X-Content-Type-Options","nosniff");
            headers.put("Content-Security-Policy","default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; worker-src 'self' blob:; connect-src 'self' blob:; frame-src 'none'");
            InputStream stream=getAssets().open(file);
            String range=request.getRequestHeaders().get("Range");
            if(range==null) range=request.getRequestHeaders().get("range");
            if("mp4".equals(suffix)||"wav".equals(suffix)) {
                stream.close();
                byte[] media;
                synchronized(mediaCache) {
                    media=mediaCache.get(file);
                    if(media==null) {
                        try(InputStream input=getAssets().open(file);ByteArrayOutputStream bytes=new ByteArrayOutputStream()) {
                            byte[] buffer=new byte[32768];int count;
                            while((count=input.read(buffer))!=-1)bytes.write(buffer,0,count);
                            media=bytes.toByteArray();mediaCache.put(file,media);
                        }
                    }
                }
                long length=media.length;
                headers.put("Accept-Ranges","bytes");
                if(range!=null) {
                    long[] span=ByteRange.parse(range,length);
                    if(span==null) {headers.put("Content-Range","bytes */"+length);return response(416,"Range Not Satisfiable",mime,new ByteArrayInputStream(new byte[0]),headers);}
                    headers.put("Content-Range","bytes "+span[0]+"-"+span[1]+"/"+length);
                    return response(206,"Partial Content",mime,new ByteArrayInputStream(media,(int)span[0],(int)(span[1]-span[0]+1)),headers);
                }
                return response(200,"OK",mime,new ByteArrayInputStream(media),headers);
            }
            return response(200,"OK",mime,stream,headers);
        } catch(Exception e) {return error(404,"Not Found");}
    }
    final class SaveBridge {
        @JavascriptInterface public void playVideo(boolean muted) {
            io.execute(()->{
                File local=new File(getCacheDir(),"emergence-19.mp4");
                try {
                    long expected;try(AssetFileDescriptor fd=getAssets().openFd("web/assets/media/emergence.mp4")){expected=fd.getLength();}
                    if(!local.exists()||local.length()!=expected)try(InputStream input=getAssets().open("web/assets/media/emergence.mp4");OutputStream output=new FileOutputStream(local)){byte[] data=new byte[32768];int n;while((n=input.read(data))!=-1)output.write(data,0,n);}
                    runOnUiThread(()->{if(!isFinishing()&&!isDestroyed())showFilm(local,muted);});
                }catch(Exception e){runOnUiThread(()->web.evaluateJavascript("window.YujiNativeFilmDone&&window.YujiNativeFilmDone('error')",null));}
            });
        }
        @JavascriptInterface public void seekVideo(int ms){if(BuildConfig.DEBUG)runOnUiThread(()->{if(film!=null)film.seekTo(Math.max(0,Math.min(ms,film.getDuration())));});}
        @JavascriptInterface public void savePng(String data, String name) {
            if(data==null||data.length()>32*1024*1024||!data.startsWith("data:image/png;base64,")) {saveNotice("未能生成图片，请重试。");return;}
            try {
                byte[] bytes=Base64.decode(data.substring(22),Base64.DEFAULT);
                byte[] signature={(byte)137,80,78,71,13,10,26,10};
                if(bytes.length<8 || !Arrays.equals(Arrays.copyOf(bytes,8),signature)) throw new IOException("PNG required");
                String filename=(name==null?"余迹.png":name).replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]","_");
                if(!filename.endsWith(".png")) filename+=".png";
                final String clean=filename;
                runOnUiThread(()->{
                    if(saving){saveNotice("请先完成当前图片的保存。");return;}
                    saving=true;pendingPng=bytes;
                    Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("image/png").putExtra(Intent.EXTRA_TITLE,clean);
                    try {startActivityForResult(intent,19);} catch(Exception e) {saving=false;pendingPng=null;saveNotice("无法打开保存窗口，请重试。");}
                });
            } catch(Exception e) {saveNotice("未能生成图片，请重试。");}
        }
    }
    private void saveNotice(String message) {
        runOnUiThread(()->{if(isFinishing())return;Toast.makeText(this,message,Toast.LENGTH_SHORT).show();web.evaluateJavascript("window.YujiSaveResult&&window.YujiSaveResult("+JSONObject.quote(message)+")",null);});
    }
    private void showFilm(File file,boolean muted){
        closeFilm(null);
        filmLayer=new FrameLayout(this);filmLayer.setBackgroundColor(android.graphics.Color.BLACK);
        film=new VideoView(this);filmLayer.addView(film,new FrameLayout.LayoutParams(-1,-1,Gravity.CENTER));
        Button skip=new Button(this);skip.setText("跳过视频");FrameLayout.LayoutParams skipLayout=new FrameLayout.LayoutParams(-2,-2,Gravity.TOP|Gravity.END);skipLayout.setMargins(16,16,16,16);filmLayer.addView(skip,skipLayout);skip.setOnClickListener(v->closeFilm("skipped"));
        root.addView(filmLayer,new FrameLayout.LayoutParams(-1,-1));
        filmControls=new MediaController(this);filmControls.setAnchorView(film);film.setMediaController(filmControls);
        film.setOnPreparedListener(player->{player.setVolume(muted?0:1,muted?0:1);player.setOnSeekCompleteListener(p->publishFilm());film.start();filmControls.show(3000);filmHandler.removeCallbacks(filmTick);filmHandler.post(filmTick);});
        film.setOnCompletionListener(player->closeFilm("ended"));film.setOnErrorListener((player,what,extra)->{closeFilm("error");return true;});film.setVideoPath(file.getAbsolutePath());immersive();
    }
    private void publishFilm(){if(film==null)return;try{String state="{\"active\":true,\"time\":"+(film.getCurrentPosition()/1000.0)+",\"duration\":"+(film.getDuration()/1000.0)+",\"paused\":"+!film.isPlaying()+"}";web.evaluateJavascript("window.YujiNativeFilmState&&window.YujiNativeFilmState("+state+")",null);}catch(Exception ignored){}}
    private void closeFilm(String reason){filmHandler.removeCallbacks(filmTick);if(film!=null)film.stopPlayback();film=null;if(filmLayer!=null)root.removeView(filmLayer);filmLayer=null;filmControls=null;if(reason!=null)web.evaluateJavascript("window.YujiNativeFilmDone&&window.YujiNativeFilmDone("+JSONObject.quote(reason)+")",null);immersive();}
    @Override protected void onActivityResult(int req,int result,Intent data) {
        super.onActivityResult(req,result,data);
        if(req!=19)return;
        byte[] bytes=pendingPng;pendingPng=null;
        if(result!=RESULT_OK || data==null || data.getData()==null || bytes==null) {saving=false;saveNotice("已取消保存。");return;}
        Uri target=data.getData();
        io.execute(()->{
            String message;
            try(OutputStream out=getContentResolver().openOutputStream(target,"wt")) {if(out==null)throw new IOException();out.write(bytes);message="图片已保存。";}
            catch(Exception e) {message="未能保存图片，请重试。";}
            final String finalMessage=message;
            runOnUiThread(()->{saving=false;saveNotice(finalMessage);});
        });
    }
    private void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }
    private void hideCustom(){if(custom==null)return;root.removeView(custom);custom=null;web.setVisibility(View.VISIBLE);if(customCallback!=null)customCallback.onCustomViewHidden();customCallback=null;immersive();}
    @Override public void onWindowFocusChanged(boolean focus){super.onWindowFocusChanged(focus);if(focus)immersive();}
    @Override protected void onPause(){if(film!=null){film.pause();publishFilm();}web.evaluateJavascript("window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('pagehide'));document.querySelectorAll('video,audio').forEach(e=>e.pause())",null);web.onPause();super.onPause();}
    @Override protected void onResume(){super.onResume();if(web!=null){web.onResume();web.setVisibility(View.VISIBLE);web.requestFocus();web.invalidate();web.evaluateJavascript("window.dispatchEvent(new Event('pageshow'))",null);}if(film!=null&&filmControls!=null)filmControls.show(0);immersive();}
    @Override public boolean onKeyUp(int key,KeyEvent event){if(Build.VERSION.SDK_INT<33&&key==KeyEvent.KEYCODE_BACK){handleBack();return true;}return super.onKeyUp(key,event);}
    private void handleBack(){
        if(filmLayer!=null){closeFilm("skipped");return;}
        if(custom!=null){hideCustom();return;}
        web.evaluateJavascript("window.YujiAndroidBack?window.YujiAndroidBack():false", result->{if(!"true".equals(result))new AlertDialog.Builder(this).setMessage("退出余迹？").setNegativeButton("继续",null).setPositiveButton("退出",(d,w)->finish()).show();});
    }
    @Override protected void onDestroy(){closeFilm(null);web.removeJavascriptInterface("YujiAndroid");web.destroy();io.shutdown();super.onDestroy();}
}

