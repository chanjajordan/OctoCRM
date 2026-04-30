// OctoCRM Patch: Auto-create Customer & Machine on Job creation (Realtime-safe)
(function(){
  if (!window.DB) {
    console.warn('OctoCRM Job auto-create patch: DB not found');
    return;
  }

  // --- Helpers ---
  function norm(s){ return (s||'').trim().toLowerCase(); }

  function ensureCustomer(name){
    if (!name) return null;
    DB.customers = DB.customers || {};
    const n = norm(name);
    for (const id in DB.customers) {
      if (norm(DB.customers[id].name) === n) return id;
    }
    const id = 'C' + Date.now();
    DB.customers[id] = {
      id, name,
      _createdAt: Date.now(),
      _modifiedAt: Date.now()
    };
    return id;
  }

  function ensureMachine(name, customerId){
    if (!name) return null;
    DB.machines = DB.machines || {};
    const n = norm(name);
    for (const id in DB.machines) {
      const m = DB.machines[id];
      if (norm(m.name) === n && m.customerId === customerId) return id;
    }
    const id = 'M' + Date.now();
    DB.machines[id] = {
      id, name,
      customerId,
      _createdAt: Date.now(),
      _modifiedAt: Date.now()
    };
    return id;
  }

  // --- Patch job creation ---
  const origSaveJob = window.saveJob || window.createJob || null;
  window.saveJob = function(job){
    try {
      if (job && job.customerName && !job.customerId) {
        job.customerId = ensureCustomer(job.customerName);
      }
      if (job && job.machineName && !job.machineId) {
        job.machineId = ensureMachine(job.machineName, job.customerId);
      }
    } catch(e){ console.warn('Auto-create customer/machine failed', e); }

    const res = origSaveJob ? origSaveJob.apply(this, arguments) : null;
    try {
      if (window.saveLocal) saveLocal();
      if (window.pushToCloud) pushToCloud();
    } catch(e){}
    return res;
  };

  console.log('✅ OctoCRM auto-create Customer & Machine patch loaded');
})();
