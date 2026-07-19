/* Browser voice recording and presentation helpers for the hackathon MVP. */
const CropPassportVoice = {
  maxSeconds: 45,
  maxBytes: 380 * 1024,
  isAudioData(value) {
    return typeof value === 'string' && /^data:audio\/(webm|ogg|mp4|mpeg|wav)(?:;[^,]+)*;base64,/i.test(value);
  },
  getMimeType() {
    if (!window.MediaRecorder) return '';
    return ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/mp4']
      .find((type) => !MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(type)) || '';
  },
  toDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('The recording could not be prepared for saving.'));
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  },
  pcmToSpeechWav(chunks, sourceRate) {
    const sampleRate = 8000;
    const sourceLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
    const sampleCount = Math.floor(sourceLength * sampleRate / sourceRate);
    if (!sampleCount) throw new Error('The recording contains no playable audio.');
    const source = new Float32Array(sourceLength);
    let offset = 0;
    chunks.forEach((chunk) => { source.set(chunk, offset); offset += chunk.length; });
    const wav = new ArrayBuffer(44 + sampleCount);
    const view = new DataView(wav);
    const writeText = (position, value) => { for (let index = 0; index < value.length; index += 1) view.setUint8(position + index, value.charCodeAt(index)); };
    writeText(0, 'RIFF'); view.setUint32(4, 36 + sampleCount, true); writeText(8, 'WAVE'); writeText(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true); writeText(36, 'data'); view.setUint32(40, sampleCount, true);
    for (let index = 0; index < sampleCount; index += 1) {
      const sourceIndex = Math.min(source.length - 1, Math.floor(index * sourceRate / sampleRate));
      view.setUint8(44 + index, Math.round((Math.max(-1, Math.min(1, source[sourceIndex])) + 1) * 127.5));
    }
    return new Blob([wav], { type: 'audio/wav' });
  },
  player(activity, className = 'timeline-audio') {
    if (!this.isAudioData(activity.audioData)) return '';
    return `<audio class="${className}" controls preload="metadata" data-audio-data="${activity.audioData}">Your browser cannot play this audio note.</audio>`;
  },
  dataToBlob(dataUrl) {
    const separator = dataUrl.indexOf(',');
    const mimeMatch = dataUrl.slice(0, separator).match(/^data:([^;]+(?:;[^;]+)*);base64$/i);
    if (separator < 0 || !mimeMatch) throw new Error('Invalid saved audio data.');
    const binary = atob(dataUrl.slice(separator + 1));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mimeMatch[1] });
  },
  hydratePlayers(container = document) {
    container.querySelectorAll('audio[data-audio-data]').forEach((player) => {
      if (player.dataset.audioHydrated) return;
      try {
        const audioData = player.dataset.audioData;
        if (!this.isAudioData(audioData)) throw new Error('Invalid saved audio data.');

        // Bind the persisted data URL only after this audio element has been
        // rendered.  Do not create and immediately revoke a Blob URL here:
        // calling load() emits `emptied`, which previously revoked the URL
        // before the browser could read its metadata or play it.
        player.src = audioData;
        player.dataset.audioHydrated = 'true';
        player.load();
      } catch (error) {
        player.outerHTML = '<p class="audio-playback-error">This voice note could not be loaded.</p>';
      }
    });
  },
  renderNotes(notes, escape) {
    const validNotes = notes.filter((note) => this.isAudioData(note.audioData));
    if (!validNotes.length) return '';
    return `<section class="passport-section voice-notes-section"><p class="section-number">07</p><h2>Voice Notes</h2><div class="voice-notes-list">${validNotes.map((note) => `<article class="voice-note"><span class="voice-note-icon">🎤</span><div><strong>${escape(note.title || 'Field voice note')}</strong>${note.description ? `<p>${escape(note.description)}</p>` : ''}<small>${CropPassport.formatDate(note.date)}</small>${this.player(note, 'voice-note-player')}</div></article>`).join('')}</div></section>`;
  },
  initRecorder({ harvest, onSaved }) {
    const openButton = document.querySelector('#record-voice-note');
    const modal = document.querySelector('#voice-note-modal');
    const form = document.querySelector('#voice-note-form');
    if (!openButton || !modal || !form || !harvest) return;
    const message = form.querySelector('#voice-note-message');
    const player = form.querySelector('#voice-note-preview');
    const elapsed = form.querySelector('#voice-note-elapsed');
    const startButton = form.querySelector('#start-voice-recording');
    const stopButton = form.querySelector('#stop-voice-recording');
    const rerecordButton = form.querySelector('#rerecord-voice-note');
    let recorder = null;
    let stream = null;
    let audioData = '';
    let audioMimeType = '';
    let startedAt = 0;
    let timer = null;
    let capTimer = null;
    let previewUrl = '';
    let captureContext = null;
    let captureSource = null;
    let captureProcessor = null;
    let captureGain = null;
    let pcmChunks = [];

    const setMessage = (text = '') => { message.textContent = text; };
    const resetTimer = () => { elapsed.textContent = '0:00'; };
    const stopTracks = () => { if (stream) stream.getTracks().forEach((track) => track.stop()); stream = null; };
    const clearTimers = () => { window.clearInterval(timer); window.clearTimeout(capTimer); timer = null; capTimer = null; };
    const stopCapture = (context = captureContext, source = captureSource, processor = captureProcessor, gain = captureGain) => {
      processor?.disconnect(); source?.disconnect(); gain?.disconnect();
      if (context?.state !== 'closed') context?.close();
      if (context === captureContext) { captureContext = null; captureSource = null; captureProcessor = null; captureGain = null; }
    };
    const clearPreview = () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = '';
      player.hidden = true;
      player.removeAttribute('src');
      player.load();
    };
    const resetRecording = () => {
      clearTimers();
      if (recorder?.state === 'recording') recorder.stop();
      recorder = null; stopCapture(); stopTracks(); pcmChunks = []; audioData = ''; audioMimeType = ''; clearPreview();
      startButton.hidden = false; stopButton.hidden = true; rerecordButton.hidden = true; resetTimer();
    };
    const setElapsed = () => {
      const seconds = Math.min(this.maxSeconds, Math.floor((Date.now() - startedAt) / 1000));
      elapsed.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    };
    const startRecording = async () => {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        setMessage('Voice recording is not supported by this browser. Try a current version of Chrome, Edge, Firefox, or Safari.');
        return;
      }
      resetRecording();
      setMessage('Requesting microphone access…');
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass || !window.MediaRecorder) throw new Error('Recording is not supported.');
        captureContext = new AudioContextClass();
        await captureContext.resume();
        captureSource = captureContext.createMediaStreamSource(stream);
        captureProcessor = captureContext.createScriptProcessor(4096, 1, 1);
        captureGain = captureContext.createGain();
        captureGain.gain.value = 0;
        pcmChunks = [];
        captureProcessor.onaudioprocess = (event) => pcmChunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
        captureSource.connect(captureProcessor); captureProcessor.connect(captureGain); captureGain.connect(captureContext.destination);
        audioMimeType = this.getMimeType();
        recorder = new MediaRecorder(stream, audioMimeType ? { mimeType: audioMimeType, audioBitsPerSecond: 48000 } : { audioBitsPerSecond: 48000 });
        const activeRecorder = recorder;
        const activeContext = captureContext;
        const activeSource = captureSource;
        const activeProcessor = captureProcessor;
        const activeGain = captureGain;
        const activePcm = pcmChunks;
        recorder.addEventListener('stop', async () => {
          if (activeRecorder !== recorder) return;
          clearTimers(); stopTracks(); stopCapture(activeContext, activeSource, activeProcessor, activeGain); startButton.hidden = false; stopButton.hidden = true;
          let blob;
          try {
            blob = this.pcmToSpeechWav(activePcm, activeContext.sampleRate);
          } catch (error) {
            setMessage('No audio was captured. Check your microphone and try recording again.');
            rerecordButton.hidden = false;
            return;
          }
          if (blob.size > this.maxBytes) {
            setMessage('This recording is too large to save in this browser. Please re-record a shorter note.');
            rerecordButton.hidden = false;
            return;
          }
          try {
            audioData = await this.toDataUrl(blob);
            audioMimeType = 'audio/wav';
            clearPreview();
            previewUrl = URL.createObjectURL(blob);
            player.src = previewUrl;
            player.hidden = false;
            player.load();
            rerecordButton.hidden = false;
            setMessage('Recording ready. Play it back, then save or re-record.');
          } catch (error) { setMessage(error.message); }
        });
        recorder.start(1000); startedAt = Date.now(); setElapsed();
        timer = window.setInterval(setElapsed, 250);
        capTimer = window.setTimeout(() => { if (recorder?.state === 'recording') { setMessage('Maximum 45-second length reached. Preparing your recording…'); recorder.requestData?.(); recorder.stop(); } }, this.maxSeconds * 1000);
        startButton.hidden = true; stopButton.hidden = false; rerecordButton.hidden = true;
        setMessage(`Recording… maximum ${this.maxSeconds} seconds.`);
      } catch (error) {
        stopTracks();
        setMessage(error.name === 'NotAllowedError' ? 'Microphone access was denied. Allow it in your browser settings and try again.' : 'We could not start the microphone. Check that another app is not using it.');
      }
    };
    const closeModal = () => { resetRecording(); modal.close(); };
    openButton.addEventListener('click', () => {
      form.reset(); resetRecording(); setMessage('Record a short field observation (up to 45 seconds).');
      form.elements.date.value = new Date().toISOString().split('T')[0]; modal.showModal();
    });
    startButton.addEventListener('click', startRecording);
    stopButton.addEventListener('click', () => { if (recorder?.state === 'recording') { setMessage('Preparing your recording…'); recorder.requestData?.(); recorder.stop(); } });
    rerecordButton.addEventListener('click', () => { resetRecording(); setMessage('Recording discarded. Start again when ready.'); });
    form.querySelector('#close-voice-modal').addEventListener('click', closeModal);
    form.querySelector('#cancel-voice-note').addEventListener('click', closeModal);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!audioData) { setMessage('Record and review a voice note before saving.'); return; }
      const data = Object.fromEntries(new FormData(form));
      const description = data.description.trim();
      const activity = { id: CropPassport.createActivityId(), harvestId: harvest.id, type: 'voice', title: description || 'Field voice note', description, date: data.date, audioData, audioMimeType, createdAt: new Date().toISOString() };
      try { CropPassport.saveActivity(activity); closeModal(); onSaved(); }
      catch (error) { setMessage('There is not enough browser storage for this recording. Re-record a shorter note or remove an older file.'); }
    });
  }
};
