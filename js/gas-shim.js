/* ตัวเชื่อม: ให้โค้ดหน้าเว็บเรียก google.script.run ได้เหมือนเดิม แต่ส่งผ่าน fetch ไปที่ API_URL */
(function(){
  function call(fn, args, ok, fail){
    if(!window.API_URL || !/^https:\/\/script\.google\.com\//.test(window.API_URL)){
      fail(new Error('ยังไม่ได้ตั้งค่า API_URL ในไฟล์ js/config.js')); return;
    }
    fetch(window.API_URL, {method:'POST', body:JSON.stringify({fn:fn, args:args}), redirect:'follow'})
      .then(function(r){ return r.json(); })
      .then(function(j){ j && j.ok ? ok(j.data) : fail(new Error((j && j.error) || 'เกิดข้อผิดพลาด')); })
      .catch(function(){ fail(new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาตรวจสัญญาณอินเทอร์เน็ตแล้วลองใหม่')); });
  }
  function runner(){
    var ok=function(){}, fail=function(e){ console.error(e); };
    var p = new Proxy({}, {get:function(_, name){
      if(name==='withSuccessHandler') return function(f){ ok=f; return p; };
      if(name==='withFailureHandler') return function(f){ fail=f; return p; };
      return function(){ call(name, Array.prototype.slice.call(arguments), ok, fail); };
    }});
    return p;
  }
  window.google = {script:{}};
  Object.defineProperty(window.google.script, 'run', {get: runner});
  window.STAFF_KEY = {
    get: function(){ try{ return localStorage.getItem('pt_key')||''; }catch(e){ return ''; } },
    set: function(k){ try{ localStorage.setItem('pt_key', k); }catch(e){} },
    clear: function(){ try{ localStorage.removeItem('pt_key'); }catch(e){} }
  };
})();
