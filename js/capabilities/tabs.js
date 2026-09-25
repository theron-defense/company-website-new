/* The capability tab list: selection state, roving tabindex, arrow-key nav, and
   the screen-reader caption describing whichever drawing is on stage. */

export function createTabs(options) {
  var tabs = options.tabs;
  var viewer = options.viewer;
  var caption = options.caption;
  var designs = options.designs;
  var onSelect = options.onSelect;
  var active = 0;

  function updateCaption() {
    if (!caption) return;
    var design = designs[active];
    caption.textContent = design ? 'Line drawing of the ' + design.title.toLowerCase() + '.' : '';
  }

  function select(i) {
    if (i === active) return;
    active = i;
    tabs.forEach(function (tab, k) {
      var on = k === i;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
    });
    viewer.setAttribute('aria-labelledby', tabs[i].id);
    updateCaption();
    if (onSelect) onSelect(i);
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () {
      select(i);
    });
    tab.addEventListener('keydown', function (event) {
      var n = tabs.length;
      var next = null;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (i + 1) % n;
      else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (i + n - 1) % n;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = n - 1;
      if (next !== null) {
        event.preventDefault();
        select(next);
        tabs[next].focus();
      }
    });
  });

  updateCaption();

  return { select: select };
}
