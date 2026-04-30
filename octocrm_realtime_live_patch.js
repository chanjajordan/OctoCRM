// OctoCRM Real-time Sync + Live UI Update + Conflict Visualizer Patch
(function(){
  if (!window.fbDB || !window.mergeCloudIntoLocal || !window._dbFingerprint) {
    console.warn('OctoCRM patch: prerequisites not found'); return;
  }

  const FB_DB_NODE = window.FB_DB_NODE || 'octoCRM_v4';
  let _fbInitialLoad = true;
  let _fbApplyingRemote = false;
  window.LAST_SYNC_CONFLICTS = [];

  // Wrap merge to capture conflicts
  const _origMerge = window.mergeCloudIntoLocal;
  window.mergeCloudIntoLocal = function(local, cloud){
    window.LAST_SYNC_CONFLICTS = [];
    if (cloud && cloud.records && local && local.records) {
      for (const id in cloud.records) {
        const c = cloud.records[id];
        const l = local.records[id];
        if (l && c && c._modifiedAt && l._modifiedAt && c._modifiedAt !== l._modifiedAt) {
          window.LAST_SYNC_CONFLICTS.push({ id, local: l, cloud: c });
        }
      }
    }
    return _origMerge(local, cloud);
  };

  const saveLocal = window.saveLocal || function(){ try{ localStorage.setItem('ocrm4', JSON.stringify(window.DB)); }catch(e){} };
  const updSync = window.updSync || function(){};

  // ✅ Live UI refresh without reload
  function refresh(){
    try {
      if (window.renderDashboard) window.renderDashboard();
      if (window.renderList) window.renderList();
      if (window.renderCalendar) window.renderCalendar();
      if (window.renderStats) window.renderStats();
      if (window.renderConflictBadge) window.renderConflictBadge();
    } catch(e) {
      console.warn('Render failed, fallback reload', e);
      try { window.location.reload(); } catch(e){}
    }
  }

  // Firebase real-time listener
  window.fbDB.ref(FB_DB_NODE).on('value', snap => {
    const cloud = snap.val();
    if (!cloud) return;

    if (_fbInitialLoad) {
      _fbInitialLoad = false;
      window.DB = window.mergeCloudIntoLocal(window.DB, cloud);
      saveLocal();
      refresh();
      updSync('ok');
      return;
    }

    if (_fbApplyingRemote) return;

    try {
      const cloudFp = window._dbFingerprint(cloud);
      const localFp = window._dbFingerprint(window.DB);
      if (cloudFp === localFp) return;

      _fbApplyingRemote = true;
      window.DB = window.mergeCloudIntoLocal(window.DB, cloud);
      saveLocal();
      refresh();
      updSync('ok');
    } finally {
      _fbApplyingRemote = false;
    }
  });

  // Conflict badge renderer
  window.renderConflictBadge = function(){
    const el = document.getElementById('syncConflicts');
    if (!el) return;
    if (!window.LAST_SYNC_CONFLICTS.length) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'inline-block';
    el.textContent = '⚠ ' + window.LAST_SYNC_CONFLICTS.length;
  };

  // Conflict inspector modal
  window.showSyncConflicts = function(){
    let html = '<h3>Sync Conflicts</h3>';
    window.LAST_SYNC_CONFLICTS.forEach(c => {
      html += `<div style="border:1px solid #f99;padding:8px;margin:6px">
        <b>ID:</b> ${c.id}<br>
        <b>Local:</b> ${new Date(c.local._modifiedAt).toLocaleString()}<br>
        <b>Cloud:</b> ${new Date(c.cloud._modifiedAt).toLocaleString()}<br>
        <button onclick="resolveConflict('${c.id}','local')">Keep Local</button>
        <button onclick="resolveConflict('${c.id}','cloud')">Use Cloud</button>
      </div>`;
    });
    if (window.showModal) window.showModal(html);
    else alert(html.replace(/<[^>]+>/g,''));
  };

  // Conflict resolver
  window.resolveConflict = function(id, choice){
    const c = window.LAST_SYNC_CONFLICTS.find(x => x.id === id);
    if (!c) return;
    window.DB.records[id] = (choice === 'local') ? c.local : c.cloud;
    saveLocal();
    if (window.pushToCloud) window.pushToCloud();
    refresh();
  };

  console.log('✅ OctoCRM real-time live-sync patch loaded');
})();
