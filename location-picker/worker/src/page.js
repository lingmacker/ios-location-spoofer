// 与 location-picker/server.js 的 PAGE 保持一致（地图选点 UI）
export const PAGE = `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>定位选点</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H" crossorigin="anonymous">
<style>
  html,body{margin:0;height:100%;font-family:-apple-system,BlinkMacSystemFont,sans-serif}
  .bar{padding:8px;display:flex;gap:6px;box-sizing:border-box}
  .bar input{flex:1;padding:10px;font-size:16px;border:1px solid #ccc;border-radius:8px}
  .bar button{padding:10px 14px;font-size:16px;border:0;border-radius:8px;background:#007aff;color:#fff}
  .favorites{margin:0 8px 16px;border:1px solid #e2e2e2;border-radius:10px;background:#fff;max-height:30vh;overflow:auto}
  .fav-head{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-bottom:1px solid #eee;font-size:15px;font-weight:600}
  .fav-add{border:0;border-radius:7px;background:#007aff;color:#fff;padding:7px 10px;font-size:14px}
  .fav-empty{padding:16px;text-align:center;font-size:14px;color:#8e8e93}
  .fav-row{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #eee}
  .fav-row:last-child{border-bottom:0}
  .fav-main{min-width:0;flex:1}
  .fav-name{font-size:15px;font-weight:600;color:#222;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .fav-coord{margin-top:3px;font-size:12px;color:#8e8e93}
  .fav-delete{border:0;background:transparent;color:#ff3b30;font-size:20px;padding:7px;line-height:1}
  .results{margin:0 8px;border:1px solid #e2e2e2;border-radius:8px;max-height:34vh;overflow:auto;display:none}
  .results.show{display:block}
  .rrow{padding:10px 12px;font-size:14px;border-bottom:1px solid #eee;color:#222}
  .rrow:last-child{border-bottom:0}
  .rrow:active{background:#f0f6ff}
  #map{height:52vh}
  #info{padding:12px 10px 8px}
  .coord-title{margin:0 0 9px;font-size:20px;font-weight:700;color:#111}
  .coord-card{display:flex;gap:22px;padding:17px 18px;border-radius:14px;background:#f2f2f7;color:#222;font-size:20px;line-height:1.25;font-variant-numeric:tabular-nums}
  .coord-item{white-space:nowrap}
  .coord-label{margin-right:8px;color:#555}
  .location-status{padding:9px 2px 0;font-size:13px;line-height:1.4}
  @media(max-width:430px){.coord-card{gap:12px;padding:15px 13px;font-size:17px}.coord-label{margin-right:5px}}
  .opts{padding:6px 10px 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end}
  .opts label{font-size:13px;color:#444;display:flex;flex-direction:column}
  .opts input{width:88px;padding:8px;font-size:15px;border:1px solid #ccc;border-radius:6px;margin-top:2px}
  #savebtn{padding:11px 20px;font-size:16px;border:0;border-radius:8px;background:#34c759;color:#fff;font-weight:600}
  #currentbtn{padding:11px 16px;font-size:15px;border:0;border-radius:8px;background:#007aff;color:#fff}
  #restorebtn{padding:11px 16px;font-size:15px;border:0;border-radius:8px;background:#8e8e93;color:#fff}
  .toast{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);
    background:rgba(0,0,0,.85);color:#fff;padding:10px 16px;border-radius:8px;
    font-size:14px;opacity:0;transition:opacity .3s;pointer-events:none;z-index:9999}
  .toast.show{opacity:1}
</style>
</head>
<body>
<div class="bar">
  <input id="q" placeholder="搜地名，回车列出候选（只预览，不改定位）">
  <button id="btn">搜</button>
</div>
<div class="results" id="results"></div>
<div id="map"></div>
<div id="info">
  <div class="coord-title">选择目标位置</div>
  <div class="coord-card">
    <div class="coord-item"><span class="coord-label">经度</span><span id="coord-lng">--</span></div>
    <div class="coord-item"><span class="coord-label">纬度</span><span id="coord-lat">--</span></div>
  </div>
  <div class="location-status" id="location-status">加载中…</div>
</div>
<div class="opts">
  <label>海拔(米)<input id="alt" type="number" inputmode="numeric"></label>
  <label>水平精度<input id="hacc" type="number" inputmode="numeric"></label>
  <label>垂直精度<input id="vacc" type="number" inputmode="numeric"></label>
  <button id="savebtn">保存定位</button>
  <button id="currentbtn">当前位置</button>
  <button id="restorebtn">恢复真实定位</button>
</div>
<div class="favorites" id="favorites"></div>
<div class="toast" id="toast"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH" crossorigin="anonymous"></script>
<script>
var token = new URLSearchParams(location.search).get("token") || "";

var GCJ = (function(){
  var PI = Math.PI, a = 6378245.0, ee = 0.00669342162296594323;
  function outOfChina(lat,lng){return (lng<72.004||lng>137.8347)||(lat<0.8293||lat>55.8271);}
  function tLat(x,y){
    var r=-100.0+2.0*x+3.0*y+0.2*y*y+0.1*x*y+0.2*Math.sqrt(Math.abs(x));
    r+=(20.0*Math.sin(6.0*x*PI)+20.0*Math.sin(2.0*x*PI))*2.0/3.0;
    r+=(20.0*Math.sin(y*PI)+40.0*Math.sin(y/3.0*PI))*2.0/3.0;
    r+=(160.0*Math.sin(y/12.0*PI)+320*Math.sin(y*PI/30.0))*2.0/3.0;return r;
  }
  function tLng(x,y){
    var r=300.0+x+2.0*y+0.1*x*x+0.1*x*y+0.1*Math.sqrt(Math.abs(x));
    r+=(20.0*Math.sin(6.0*x*PI)+20.0*Math.sin(2.0*x*PI))*2.0/3.0;
    r+=(20.0*Math.sin(x*PI)+40.0*Math.sin(x/3.0*PI))*2.0/3.0;
    r+=(150.0*Math.sin(x/12.0*PI)+300*Math.sin(x/30.0*PI))*2.0/3.0;return r;
  }
  function wgs2gcj(lat,lng){
    if(outOfChina(lat,lng))return [lat,lng];
    var dLat=tLat(lng-105.0,lat-35.0), dLng=tLng(lng-105.0,lat-35.0);
    var radLat=lat/180.0*PI, m=Math.sin(radLat); m=1-ee*m*m; var sm=Math.sqrt(m);
    dLat=(dLat*180.0)/((a*(1-ee))/(m*sm)*PI);
    dLng=(dLng*180.0)/(a/sm*Math.cos(radLat)*PI);
    return [lat+dLat,lng+dLng];
  }
  function gcj2wgs(lat,lng){ // 迭代反解，往返误差 <0.001 米
    if(outOfChina(lat,lng))return [lat,lng];
    var wlat=lat, wlng=lng;
    for(var i=0;i<3;i++){ var g=wgs2gcj(wlat,wlng); wlat+=lat-g[0]; wlng+=lng-g[1]; }
    return [wlat,wlng];
  }
  return {wgs2gcj:wgs2gcj, gcj2wgs:gcj2wgs};
})();

var map, marker;
var WGS = {lat:0, lng:0};
var datum = "wgs";
var saved = true;
var enabledState = true;  // true=伪造中；false=已恢复真实定位（脚本放行）
var enabledPending = false;
var FAVORITES_KEY = "location-picker-favorites-v1";

function $(id){return document.getElementById(id);}
function toast(t){var e=$("toast");e.textContent=t;e.classList.add("show");setTimeout(function(){e.classList.remove("show");},1800);}
function numOrNull(id){var v=$(id).value.trim();return v===""?null:Number(v);}
// Leaflet 在重复世界地图上可能返回 -239 这类经度，需要归一化。
function wrapLng(lng){return ((((Number(lng)+180)%360)+360)%360)-180;}

function getFavorites(){
  try { var v=JSON.parse(localStorage.getItem(FAVORITES_KEY)||"[]"); return Array.isArray(v)?v:[]; }
  catch(e){ return []; }
}
function setFavorites(items){
  try { localStorage.setItem(FAVORITES_KEY,JSON.stringify(items)); return true; }
  catch(e){ toast("收藏保存失败"); return false; }
}
function renderFavorites(){
  var box=$("favorites"), items=getFavorites(); box.innerHTML="";
  var head=document.createElement("div"); head.className="fav-head"; head.appendChild(document.createTextNode("收藏的位置"));
  var add=document.createElement("button"); add.className="fav-add"; add.type="button"; add.textContent="＋ 收藏当前位置"; add.addEventListener("click",addFavorite); head.appendChild(add); box.appendChild(head);
  if(!items.length){ var empty=document.createElement("div"); empty.className="fav-empty"; empty.textContent="暂无收藏"; box.appendChild(empty); return; }
  items.forEach(function(item,index){
    var row=document.createElement("div"); row.className="fav-row";
    var main=document.createElement("div"); main.className="fav-main";
    var name=document.createElement("div"); name.className="fav-name"; name.textContent=item.name;
    var coord=document.createElement("div"); coord.className="fav-coord"; coord.textContent=Number(item.lat).toFixed(5)+", "+Number(item.lng).toFixed(5);
    main.appendChild(name); main.appendChild(coord);
    main.addEventListener("click",function(){
      WGS={lat:Number(item.lat),lng:wrapLng(item.lng)}; saved=false;
      if(item.altitude!==null&&item.altitude!==undefined)$("alt").value=item.altitude;
      var p=dispPos(); marker.setLatLng(p); map.flyTo(p,15); info();
      toast("已选择 "+item.name);
    });
    var del=document.createElement("button"); del.className="fav-delete"; del.type="button"; del.setAttribute("aria-label","删除 "+item.name); del.textContent="×";
    del.addEventListener("click",function(e){e.stopPropagation(); var next=getFavorites(); next.splice(index,1); if(setFavorites(next)){renderFavorites();toast("已删除收藏");}});
    row.appendChild(main); row.appendChild(del); box.appendChild(row);
  });
}
function addFavorite(){
  var defaultName="位置 "+(getFavorites().length+1), name=prompt("收藏名称",defaultName);
  if(name===null)return; name=name.trim()||defaultName;
  var items=getFavorites();
  items.unshift({name:name,lat:WGS.lat,lng:WGS.lng,altitude:numOrNull("alt"),createdAt:Date.now()});
  if(setFavorites(items)){renderFavorites();toast("已收藏 "+name);}
}
function info(){
  $("coord-lng").textContent=WGS.lng.toFixed(6);
  $("coord-lat").textContent=WGS.lat.toFixed(6);
  if(!enabledState){
    $("location-status").innerHTML = "<b style='color:#ff9500'>已恢复真实定位 · 脚本放行不修改</b>　（关开定位后生效）";
    return;
  }
  var tag = saved ? "已保存 ✓" : "未保存 · 点“保存定位”生效";
  $("location-status").innerHTML = "<b style='color:"+(saved?"#34c759":"#ff9500")+"'>"+tag+"</b>　WGS-84　海拔 "+($("alt").value||"?")+"m";
}

// 切换按钮外观：伪造中(灰按钮“恢复真实定位”) / 已恢复(橙按钮“重新开启伪造”)
function updateEnabledUI(){
  var b=$("restorebtn");
  b.disabled=enabledPending;
  b.style.opacity=enabledPending?".6":"1";
  if(enabledPending){ b.textContent="切换中…"; }
  else if(enabledState){ b.textContent="恢复真实定位"; b.style.background="#8e8e93"; }
  else { b.textContent="● 重新开启伪造"; b.style.background="#ff9500"; }
  info();
}

// 一键切换 伪造/恢复真实
function toggleEnabled(){
  if(enabledPending)return;
  var want = !enabledState;
  enabledPending=true; updateEnabledUI();
  fetch("/enable?token="+encodeURIComponent(token),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled:want})})
    .then(function(r){return r.json().catch(function(){return {};}).then(function(d){return {ok:r.ok,status:r.status,data:d};});})
    .then(function(result){
      if(!result.ok)throw new Error("切换失败 "+result.status);
      if(typeof result.data.enabled!=="boolean")throw new Error("服务器返回状态异常");
      enabledState=result.data.enabled;
      toast(enabledState ? "已开启伪造，记得关开定位生效" : "已恢复真实定位，记得关开定位生效");
    })
    .catch(function(error){ toast(error.message||"网络错误"); })
    .then(function(){enabledPending=false;updateEnabledUI();});
}

function dispPos(){return datum==="gcj"?GCJ.wgs2gcj(WGS.lat,WGS.lng):[WGS.lat,WGS.lng];}
function toWgs(lat,lng){lng=wrapLng(lng);return datum==="gcj"?GCJ.gcj2wgs(lat,lng):[lat,lng];}

function fetchElevation(lat,lng){
  lng=wrapLng(lng);
  return fetch("https://api.open-meteo.com/v1/elevation?latitude="+lat+"&longitude="+lng)
    .then(function(r){return r.json();})
    .then(function(d){return (d&&d.elevation&&d.elevation.length)?d.elevation[0]:null;})
    .catch(function(){return null;});
}

function movePin(dispLat,dispLng){
  dispLng=wrapLng(dispLng);
  var w=toWgs(dispLat,dispLng);
  WGS={lat:w[0], lng:wrapLng(w[1])};
  saved=false;
  marker.setLatLng([dispLat,dispLng]);
  info();
  fetchElevation(WGS.lat,WGS.lng).then(function(el){ if(el!==null)$("alt").value=Math.round(el); info(); });
}

function locateCurrent(){
  if(!navigator.geolocation){toast("浏览器不支持定位");return;}
  var b=$("currentbtn"); b.disabled=true; b.style.opacity=".6"; b.textContent="定位中…";
  navigator.geolocation.getCurrentPosition(function(pos){
    WGS={lat:pos.coords.latitude,lng:wrapLng(pos.coords.longitude)};
    saved=false;
    if(Number.isFinite(pos.coords.altitude))$("alt").value=Math.round(pos.coords.altitude);
    if(Number.isFinite(pos.coords.accuracy))$("hacc").value=Math.round(pos.coords.accuracy);
    var p=dispPos(); marker.setLatLng(p); map.flyTo(p,16); info();
    fetchElevation(WGS.lat,WGS.lng).then(function(el){if(el!==null&&!Number.isFinite(pos.coords.altitude))$("alt").value=Math.round(el);info();});
    toast("已获取当前位置");
    b.disabled=false;b.style.opacity="1";b.textContent="当前位置";
  },function(error){
    var message=error.code===1?"请允许浏览器访问位置":error.code===3?"获取位置超时":"无法获取当前位置";
    toast(message); b.disabled=false;b.style.opacity="1";b.textContent="当前位置";
  },{enableHighAccuracy:true,timeout:10000,maximumAge:0});
}

function commit(){
  var payload={lat:WGS.lat, lng:WGS.lng,
    altitude:numOrNull("alt"), horizontalAccuracy:numOrNull("hacc"), verticalAccuracy:numOrNull("vacc")};
  fetch("/set?token="+encodeURIComponent(token),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})
    .then(function(r){ if(r.ok){ saved=true; enabledState=true; updateEnabledUI(); toast("已保存 ✓ Loon/小火箭约60秒内生效"); } else { toast("保存失败 "+r.status); } })
    .catch(function(){ toast("网络错误"); });
}

function search(){
  var q=$("q").value.trim(); if(!q) return;
  fetch("https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=8&q="+encodeURIComponent(q))
    .then(function(r){return r.json();})
    .then(function(a){
      var box=$("results"); box.innerHTML="";
      if(!a||!a.length){ box.classList.remove("show"); toast("没找到"); return; }
      a.forEach(function(it){
        var row=document.createElement("div");
        row.className="rrow";
        row.textContent=it.display_name;
        row.addEventListener("click",function(){
          box.classList.remove("show"); box.innerHTML="";
          var la=+it.lat, lo=+it.lon;
          var p = datum==="gcj"?GCJ.wgs2gcj(la,lo):[la,lo];
          map.setView(p,15);
          toast("已定位视野，在地图上点一下放置图钉");
        });
        box.appendChild(row);
      });
      box.classList.add("show");
    })
    .catch(function(){toast("搜索失败");});
}

function load(){
  fetch("/loc.json?token="+encodeURIComponent(token)).then(function(r){return r.json();}).then(function(d){
    WGS={lat:d.latitude, lng:d.longitude};
    saved=true;
    enabledState=(d.enabled!==false);
    $("alt").value=(d.altitude!==undefined?d.altitude:"");
    $("hacc").value=(d.horizontalAccuracy!==undefined?d.horizontalAccuracy:39);
    $("vacc").value=(d.verticalAccuracy!==undefined?d.verticalAccuracy:1000);

    var satellite=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"ArcGIS"});
    satellite.datum="wgs";
    var wgs84=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"ArcGIS WGS84"});
    wgs84.datum="wgs";
    var dark=L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{maxZoom:19,attribution:"© Carto"});
    dark.datum="wgs";
    var voyager=L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",{maxZoom:19,attribution:"© Carto"});
    voyager.datum="wgs";
    var amap=L.tileLayer("https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",{subdomains:"1234",maxZoom:18,attribution:"© 高德"});
    amap.datum="gcj";

    map=L.map("map");
    satellite.addTo(map); datum="wgs";
    map.setView(dispPos(),13);
    L.control.layers({"ArcGIS 卫星":satellite,"ArcGIS WGS84":wgs84,"Carto 彩色":voyager,"Carto 暗色":dark,"高德卫星":amap},null,{collapsed:false}).addTo(map);

    marker=L.marker(dispPos(),{draggable:true}).addTo(map);
    updateEnabledUI();

    map.on("baselayerchange",function(e){datum=e.layer.datum||"wgs"; var p=dispPos(); marker.setLatLng(p); map.setView(p,map.getZoom()); info();});
    map.on("click",function(e){movePin(e.latlng.lat,e.latlng.lng);});
    marker.on("dragend",function(){var p=marker.getLatLng(); movePin(p.lat,p.lng);});
  }).catch(function(){$("location-status").textContent="加载失败，检查 token 是否正确";});
}

$("btn").addEventListener("click",search);
$("q").addEventListener("keydown",function(e){if(e.key==="Enter")search();});
$("savebtn").addEventListener("click",commit);
$("currentbtn").addEventListener("click",locateCurrent);
$("restorebtn").addEventListener("click",toggleEnabled);
renderFavorites();
load();
</script>
</body>
</html>`;
