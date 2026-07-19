/* Photo upload, compression, preview, and gallery helpers for the MVP. */
const CropPassportPhoto = {
  maxDimension: 1280,
  targetBytes: 420 * 1024,
  isPhotoData(value) {
    return typeof value === 'string' && /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value);
  },
  async compress(file) {
    if (!file || !file.type.startsWith('image/')) throw new Error('Please choose an image file.');
    const source = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('The photo could not be read.'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('The photo could not be opened.'));
        image.onload = () => resolve(image);
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
    let scale = Math.min(1, this.maxDimension / Math.max(source.width, source.height));
    let quality = 0.78;
    let output = '';
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(source.width * scale));
      canvas.height = Math.max(1, Math.round(source.height * scale));
      canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
      output = canvas.toDataURL('image/jpeg', quality);
      if (output.length * 0.75 <= this.targetBytes) return output;
      quality -= 0.1;
      if (quality < 0.45) { quality = 0.7; scale *= 0.75; }
    }
    if (output.length * 0.75 > 650 * 1024) throw new Error('This image is still too large after compression. Choose a smaller photo.');
    return output;
  },
  thumbnail(activity) {
    if (!this.isPhotoData(activity.photoData)) return '';
    return `<button type="button" class="photo-preview-trigger timeline-photo" aria-label="Open larger photo preview"><img src="${activity.photoData}" alt="${this.escape(activity.title || 'Crop photo')}"></button>`;
  },
  renderGallery(photos, escape) {
    if (!photos.length) return '';
    return `<section class="passport-section photo-gallery-section"><p class="section-number">06</p><h2>Photo Gallery</h2><div class="photo-gallery">${photos.map((activity) => `<article class="gallery-photo"><button type="button" class="photo-preview-trigger" aria-label="Open larger photo preview"><img src="${this.isPhotoData(activity.photoData) ? activity.photoData : ''}" alt="${escape(activity.title || 'Crop photo')}"></button><div><strong>${escape(activity.title || 'Crop photo')}</strong>${activity.description ? `<p>${escape(activity.description)}</p>` : ''}<small>${CropPassport.formatDate(activity.date)}</small></div></article>`).join('')}</div></section>`;
  },
  escape(value) {
    const element = document.createElement('div');
    element.textContent = value || '';
    return element.innerHTML;
  },
  enablePreviews() {
    if (document.documentElement.dataset.photoPreviewsReady) return;
    document.documentElement.dataset.photoPreviewsReady = 'true';
    const dialog = document.createElement('dialog');
    dialog.className = 'photo-lightbox';
    dialog.innerHTML = '<button type="button" class="photo-lightbox-close" aria-label="Close photo preview">×</button><img alt="Expanded crop photo">';
    document.body.append(dialog);
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
    dialog.querySelector('button').addEventListener('click', () => dialog.close());
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('.photo-preview-trigger');
      if (!trigger) return;
      const image = trigger.querySelector('img');
      if (!image || !this.isPhotoData(image.src)) return;
      dialog.querySelector('img').src = image.src;
      dialog.querySelector('img').alt = image.alt;
      dialog.showModal();
    });
  },
  initUpload({ harvest, onSaved }) {
    const openButton = document.querySelector('#upload-photo');
    const modal = document.querySelector('#photo-upload-modal');
    const form = document.querySelector('#photo-upload-form');
    if (!openButton || !modal || !form || !harvest) return;
    const fileInput = form.querySelector('[name="photo"]');
    const preview = form.querySelector('#photo-upload-preview');
    const message = form.querySelector('#photo-upload-message');
    let photoData = '';
    const setMessage = (text = '') => { message.textContent = text; };
    openButton.addEventListener('click', () => {
      form.reset(); photoData = ''; preview.hidden = true; preview.removeAttribute('src'); setMessage();
      form.elements.date.value = new Date().toISOString().split('T')[0]; modal.showModal();
    });
    form.querySelector('#close-photo-modal').addEventListener('click', () => modal.close());
    form.querySelector('#cancel-photo-upload').addEventListener('click', () => modal.close());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0]; photoData = ''; preview.hidden = true;
      if (!file) return;
      setMessage('Compressing photo for browser storage…');
      try { photoData = await this.compress(file); preview.src = photoData; preview.hidden = false; setMessage('Photo ready to save.'); }
      catch (error) { setMessage(error.message); }
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!photoData) { setMessage('Choose a photo before saving.'); return; }
      const data = Object.fromEntries(new FormData(form));
      const description = data.description.trim();
      const activity = { id: CropPassport.createActivityId(), harvestId: harvest.id, type: 'photo', title: description || 'Crop photo', description, date: data.date, photoData, createdAt: new Date().toISOString() };
      try { CropPassport.saveActivity(activity); modal.close(); onSaved(); }
      catch (error) { setMessage('There is not enough browser storage for this photo. Delete an older photo or choose a smaller one.'); }
    });
  }
};
CropPassportPhoto.enablePreviews();
