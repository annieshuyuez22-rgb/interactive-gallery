(() => {
  const cards = [...document.querySelectorAll('.project-card')];
  const filterButtons = [...document.querySelectorAll('[data-filter]')];
  const search = document.querySelector('#project-search');
  const count = document.querySelector('#result-count');
  const empty = document.querySelector('#empty-state');
  let activeFilter = 'all';

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      const categoryMatch = activeFilter === 'all' || card.dataset.category === activeFilter;
      const searchMatch = !query || card.dataset.search.includes(query);
      const show = categoryMatch && searchMatch;
      card.hidden = !show;
      if (show) visible += 1;
    });
    if (count) count.textContent = `${visible} project${visible === 1 ? '' : 's'}`;
    if (empty) empty.hidden = visible !== 0;
  };

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      filterButtons.forEach((item) => {
        item.classList.toggle('is-active', item === button);
        item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
      });
      applyFilters();
    });
  });
  search?.addEventListener('input', applyFilters);

  const dialog = document.querySelector('#video-dialog');
  const dialogVideo = dialog?.querySelector('video');
  const dialogTitle = dialog?.querySelector('#dialog-title');
  const dialogLink = dialog?.querySelector('#dialog-case-link');
  const closeButton = dialog?.querySelector('[data-close-dialog]');

  const closeDialog = () => {
    if (!dialog) return;
    dialogVideo?.pause();
    if (dialogVideo) dialogVideo.removeAttribute('src');
    dialog.close();
  };

  document.querySelectorAll('[data-play]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!dialog || !dialogVideo) return;
      dialogTitle.textContent = button.dataset.title;
      dialogLink.href = button.dataset.case;
      dialogVideo.poster = button.dataset.poster;
      dialogVideo.muted = true;
      dialogVideo.src = button.dataset.play;
      dialog.showModal();
      dialogVideo.play().catch(() => {});
    });
  });
  closeButton?.addEventListener('click', closeDialog);
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });
  dialog?.addEventListener('close', () => dialogVideo?.pause());

  document.querySelectorAll('video').forEach((video) => {
    video.addEventListener('play', () => {
      document.querySelectorAll('video').forEach((other) => {
        if (other !== video) other.pause();
      });
    });
  });

  applyFilters();
})();
