/* Local persistence for ungraded response fields. Studio still owns quizzes and navigation. */
(() => {
  if (window.__adtCompositionResponses) return;
  window.__adtCompositionResponses = true;
  // The reader uses arrow keys for page navigation. A focused wide table owns
  // those keys so keyboard users can read its remaining columns on this page.
  document.addEventListener('keydown', event => {
    const region = event.target.closest?.('#content.adt-composition .adt-table-scroll');
    if (!region || event.target !== region || event.altKey || event.ctrlKey || event.metaKey || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();event.stopPropagation();
    if (event.key === 'Home') region.scrollLeft = 0;
    else if (event.key === 'End') region.scrollLeft = region.scrollWidth;
    else region.scrollLeft += event.key === 'ArrowRight' ? 80 : -80;
  }, true);
  const attached = new WeakSet();
  let previousObserver;
  function attach() {
    const root = document.querySelector('#content.adt-composition');
    previousObserver?.disconnect();
    if (!root || attached.has(root) || root.querySelector('[data-correct-answers]')) return;
    const section = document.querySelector('meta[name="title-id"]')?.content;
    if (!section || !root.dataset.adtSource) return;
    const controls = [...root.querySelectorAll('input[data-activity-item],textarea[data-activity-item],select[data-activity-item]')]
      .filter(n => n.id && !['hidden', 'file', 'submit', 'button'].includes(n.type));
    if (!controls.length) return;
    attached.add(root);
    const key = 'adt-agent:responses:v1:' + root.dataset.adtSource + ':' + section;
    let saved = {}, restored = false, status;
    try { const value = JSON.parse(localStorage.getItem(key) || '{}'); if (value && typeof value === 'object' && !Array.isArray(value)) saved = value; } catch {}
    const restore = () => {
      if (restored || root.classList.contains('opacity-0')) return;
      restored = true;
      previousObserver?.disconnect();
      for (const field of controls) {
        if (!Object.hasOwn(saved, field.id)) continue;
        if (['radio', 'checkbox'].includes(field.type) && typeof saved[field.id] === 'boolean') field.checked = saved[field.id];
        else if (!field.value && typeof saved[field.id] === 'string') field.value = saved[field.id];
      }
    };
    const save = event => {
      if (!controls.includes(event.target)) return;
      const values = Object.fromEntries(controls.map(n => [n.id, ['radio', 'checkbox'].includes(n.type) ? n.checked : n.value]));
      let ok = true;
      try { localStorage.setItem(key, JSON.stringify(values)); } catch { ok = false; }
      if (!status) { status = document.createElement('p'); status.className = 'adt-save-status'; status.setAttribute('role', 'status'); root.querySelector('.adt-page').append(status); }
      const message = ok ? root.dataset.adtSavedMessage : root.dataset.adtSaveFailure;
      if (status.textContent !== message) status.textContent = message;
    };
    previousObserver = new MutationObserver(restore);
    previousObserver.observe(root, {attributes:true, attributeFilter:['class']});
    restore();root.addEventListener('input', save);root.addEventListener('change', save);
  }
  document.addEventListener('adt:page-changed', attach);
  attach();
})();
