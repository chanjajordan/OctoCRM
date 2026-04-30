// ✅ OctoCRM Job Auto‑Create Customer & Machine (Correct Save Hook)
(function () {
  if (!window.DB) {
    console.warn('OctoCRM patch: DB not ready');
    return;
  }

  function norm(s) {
    return (s || '').trim().toLowerCase();
  }

  function ensureCustomerByName(name) {
    if (!name) return null;
    DB.customers = DB.customers || {};
    const key = norm(name);

    for (const id in DB.customers) {
      if (norm(DB.customers[id].name) === key) return id;
    }

    const id = 'C' + Date.now();
    DB.customers[id] = {
      id,
      name,
      _createdAt: Date.now(),
      _modifiedAt: Date.now()
    };
    return id;
  }

  function ensureMachineByName(name, customerId) {
    if (!name || !customerId) return null;
    DB.machines = DB.machines || {};
    const key = norm(name);

    for (const id in DB.machines) {
      const m = DB.machines[id];
      if (norm(m.name) === key && m.customerId === customerId) return id;
    }

    const id = 'M' + Date.now();
    DB.machines[id] = {
      id,
      name,
      customerId,
      _createdAt: Date.now(),
      _modifiedAt: Date.now()
    };
    return id;
  }

  function patch(fnName) {
    if (typeof window[fnName] !== 'function') return;

    const original = window[fnName];
    window[fnName] = function () {
      try {
        const custInput =
          document.querySelector('#jobCustomer') ||
          document.querySelector('[name=customer]');

        const machInput =
          document.querySelector('#jobMachine') ||
          document.querySelector('[name=machine]');

        const custName = custInput?.value?.trim();
        const machName = machInput?.value?.trim();

        if (custName) {
          const cid = ensureCustomerByName(custName);
          window._jobAutoCustomerId = cid;
        }

        if (machName && window._jobAutoCustomerId) {
          const mid = ensureMachineByName(machName, window._jobAutoCustomerId);
          window._jobAutoMachineId = mid;
        }
      } catch (e) {
        console.warn('Auto-create customer/machine failed', e);
      }

      return original.apply(this, arguments);
    };
  }

  patch('onSaveJob');
  patch('saveJobForm');
  patch('jobSaveClick');

  console.log('✅ OctoCRM job auto-create patch ACTIVE');
})();
