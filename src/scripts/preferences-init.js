(() => {
  const root = document.documentElement;
  let theme = 'light';
  let motion = 'system';
  let layout = 'default';
  try {
    theme = localStorage.getItem('rsya:theme') || theme;
    motion = localStorage.getItem('rsya:motion') || motion;
    layout = localStorage.getItem('rsya:layout') || layout;
  } catch { /* Preferences are optional when storage is unavailable. */ }
  root.dataset.theme = theme === 'dark' ? 'dark' : 'light';
  root.dataset.motionSetting = ['on', 'off'].includes(motion) ? motion : 'system';
  root.dataset.motion = motion === 'off' || (motion !== 'on' && matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'reduce' : 'full';
  root.dataset.layout = ['wide', 'wider'].includes(layout) ? layout : 'default';
})();
