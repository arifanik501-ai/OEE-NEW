/**
 * OEE Report Portal - Client Logic
 * Strict adherence to XSS prevention and safe DOM manipulation.
 */

(function () {
  'use strict';

  // Default state structure
  const DEFAULT_STATE = {
    portalTitle: 'OEE Report',
    portalSubtitle: 'Centralized Operational Equipment Effectiveness Reports & Logs',
    openInNewTab: true,
    adminPasswordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // sha256 of 'admin123'
    lastPublished: new Date().toISOString(),
    reports: {
      anwar: {
        id: 'anwar',
        name: 'Anwar',
        title: "Anwar's OEE Report",
        department: 'Production & Efficiency',
        description: 'Daily production rates, line availability, and machine efficiency logs.',
        url: '',
        notes: 'Primary tracking sheet managed by Anwar',
        updatedAt: new Date().toISOString()
      },
      monir: {
        id: 'monir',
        name: 'Monir',
        title: "Monir's OEE Report",
        department: 'Maintenance & Downtime',
        description: 'Machine breakdown analysis, speed loss records, and operational quality data.',
        url: '',
        notes: 'Primary tracking sheet managed by Monir',
        updatedAt: new Date().toISOString()
      }
    }
  };

  // State in memory
  let appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  let isConnectedToServer = false;
  let authenticatedAdminPassword = ''; // cached in session

  // DOM Elements - Navigation & Status
  const displayPortalTitle = document.getElementById('displayPortalTitle');
  const displayPortalSubtitle = document.getElementById('displayPortalSubtitle');
  const connectionStatus = document.getElementById('connectionStatus');
  const openGithubModalBtn = document.getElementById('openGithubModalBtn');
  const openSettingsBtn = document.getElementById('openSettingsBtn');

  // DOM Elements - Anwar Card
  const anwarCardTitle = document.getElementById('anwarCardTitle');
  const anwarCardDept = document.getElementById('anwarCardDept');
  const anwarStatusBadge = document.getElementById('anwarStatusBadge');
  const anwarCardDesc = document.getElementById('anwarCardDesc');
  const anwarUrlPreview = document.getElementById('anwarUrlPreview');
  const anwarLaunchBtn = document.getElementById('anwarLaunchBtn');
  const anwarCopyBtn = document.getElementById('anwarCopyBtn');
  const anwarUpdatedTime = document.getElementById('anwarUpdatedTime');

  // DOM Elements - Monir Card
  const monirCardTitle = document.getElementById('monirCardTitle');
  const monirCardDept = document.getElementById('monirCardDept');
  const monirStatusBadge = document.getElementById('monirStatusBadge');
  const monirCardDesc = document.getElementById('monirCardDesc');
  const monirUrlPreview = document.getElementById('monirUrlPreview');
  const monirLaunchBtn = document.getElementById('monirLaunchBtn');
  const monirCopyBtn = document.getElementById('monirCopyBtn');
  const monirUpdatedTime = document.getElementById('monirUpdatedTime');

  // DOM Elements - Password Modal
  const passwordModal = document.getElementById('passwordModal');
  const passwordForm = document.getElementById('passwordForm');
  const adminPasswordInput = document.getElementById('adminPasswordInput');
  const togglePasswordVisibilityBtn = document.getElementById('togglePasswordVisibilityBtn');
  const passwordError = document.getElementById('passwordError');
  const closePasswordModalBtn = document.getElementById('closePasswordModalBtn');
  const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');

  // DOM Elements - Settings Modal & Form
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
  const settingsForm = document.getElementById('settingsForm');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');

  // Form Input Fields
  const inputPortalTitle = document.getElementById('inputPortalTitle');
  const inputPortalSubtitle = document.getElementById('inputPortalSubtitle');
  const checkNewTab = document.getElementById('checkNewTab');
  const inputNewPassword = document.getElementById('inputNewPassword');

  const inputAnwarTitle = document.getElementById('inputAnwarTitle');
  const inputAnwarUrl = document.getElementById('inputAnwarUrl');
  const inputAnwarDept = document.getElementById('inputAnwarDept');
  const inputAnwarDesc = document.getElementById('inputAnwarDesc');
  const testAnwarUrlBtn = document.getElementById('testAnwarUrlBtn');
  const anwarUrlError = document.getElementById('anwarUrlError');

  const inputMonirTitle = document.getElementById('inputMonirTitle');
  const inputMonirUrl = document.getElementById('inputMonirUrl');
  const inputMonirDept = document.getElementById('inputMonirDept');
  const inputMonirDesc = document.getElementById('inputMonirDesc');
  const testMonirUrlBtn = document.getElementById('testMonirUrlBtn');
  const monirUrlError = document.getElementById('monirUrlError');

  const downloadDataJsonBtn = document.getElementById('downloadDataJsonBtn');
  const exportConfigBtn = document.getElementById('exportConfigBtn');
  const importConfigFile = document.getElementById('importConfigFile');
  const toastContainer = document.getElementById('toastContainer');

  // DOM Elements - GitHub Guide Modal
  const githubModal = document.getElementById('githubModal');
  const closeGithubModalBtn = document.getElementById('closeGithubModalBtn');
  const gotItGithubBtn = document.getElementById('gotItGithubBtn');

  /**
   * Browser-native SHA-256 hashing
   */
  async function computeSha256(text) {
    if (!text) return '';
    try {
      const msgUint8 = new TextEncoder().encode(text.trim());
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (_) {
      return '';
    }
  }

  /**
   * Safe URL validation helper
   */
  function isValidHttpUrl(string) {
    if (!string || typeof string !== 'string') return false;
    const trimmed = string.trim();
    if (trimmed === '') return true;
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  /**
   * Safe URL format check for non-empty input
   */
  function isStrictHttpUrl(string) {
    if (!string || typeof string !== 'string') return false;
    const trimmed = string.trim();
    if (trimmed === '') return false;
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  /**
   * Format ISO date to human readable string
   */
  function formatFriendlyDate(isoString) {
    if (!isoString) return 'Recently';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return 'Recently';
    }
  }

  /**
   * Non-intrusive Toast Notification
   */
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.textContent = type === 'error' ? '✕' : '✓';

    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;

    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode === toastContainer) {
          toastContainer.removeChild(toast);
        }
      }, 300);
    }, 3400);
  }

  /**
   * Update the UI with the active appState
   */
  function renderUI() {
    displayPortalTitle.textContent = appState.portalTitle || 'OEE Report';
    displayPortalSubtitle.textContent = appState.portalSubtitle || 'Centralized Operational Equipment Effectiveness Reports & Logs';

    const targetAttribute = appState.openInNewTab ? '_blank' : '_self';

    // Render Anwar Card
    const anwar = appState.reports.anwar;
    anwarCardTitle.textContent = anwar.title || "Anwar's OEE Report";
    anwarCardDept.textContent = anwar.department || 'Production & Efficiency';
    anwarCardDesc.textContent = anwar.description || 'Daily production rates, line availability, and machine efficiency logs.';
    anwarUpdatedTime.textContent = `Last updated: ${formatFriendlyDate(anwar.updatedAt)}`;

    if (isStrictHttpUrl(anwar.url)) {
      anwarUrlPreview.textContent = anwar.url;
      anwarUrlPreview.title = anwar.url;
      anwarStatusBadge.textContent = 'Link Active';
      anwarStatusBadge.className = 'status-badge';
      anwarLaunchBtn.setAttribute('href', anwar.url);
      anwarLaunchBtn.setAttribute('target', targetAttribute);
      anwarLaunchBtn.removeAttribute('data-unconfigured');
    } else {
      anwarUrlPreview.textContent = 'Not configured yet — click Settings to set';
      anwarUrlPreview.title = '';
      anwarStatusBadge.textContent = 'No Link Set';
      anwarStatusBadge.className = 'status-badge pending';
      anwarLaunchBtn.setAttribute('href', '#');
      anwarLaunchBtn.removeAttribute('target');
      anwarLaunchBtn.setAttribute('data-unconfigured', 'true');
    }

    // Render Monir Card
    const monir = appState.reports.monir;
    monirCardTitle.textContent = monir.title || "Monir's OEE Report";
    monirCardDept.textContent = monir.department || 'Maintenance & Downtime';
    monirCardDesc.textContent = monir.description || 'Machine breakdown analysis, speed loss records, and operational quality data.';
    monirUpdatedTime.textContent = `Last updated: ${formatFriendlyDate(monir.updatedAt)}`;

    if (isStrictHttpUrl(monir.url)) {
      monirUrlPreview.textContent = monir.url;
      monirUrlPreview.title = monir.url;
      monirStatusBadge.textContent = 'Link Active';
      monirStatusBadge.className = 'status-badge';
      monirLaunchBtn.setAttribute('href', monir.url);
      monirLaunchBtn.setAttribute('target', targetAttribute);
      monirLaunchBtn.removeAttribute('data-unconfigured');
    } else {
      monirUrlPreview.textContent = 'Not configured yet — click Settings to set';
      monirUrlPreview.title = '';
      monirStatusBadge.textContent = 'No Link Set';
      monirStatusBadge.className = 'status-badge pending';
      monirLaunchBtn.setAttribute('href', '#');
      monirLaunchBtn.removeAttribute('target');
      monirLaunchBtn.setAttribute('data-unconfigured', 'true');
    }
  }

  /**
   * Fetch latest report configurations from Server, static data.json, or LocalStorage
   */
  async function loadData() {
    // 1. Try API endpoint
    try {
      const response = await fetch('/api/reports', {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.reports) {
          appState = data;
          isConnectedToServer = true;
          connectionStatus.textContent = 'Live Server';
          renderUI();
          return;
        }
      }
    } catch (_) {
      // API unreachable
    }

    // 2. Try static data.json (for GitHub Pages hosting)
    try {
      const staticResp = await fetch('data.json', { cache: 'no-store' });
      if (staticResp.ok) {
        const staticData = await staticResp.json();
        if (staticData && staticData.reports) {
          appState = staticData;
          isConnectedToServer = false;
          connectionStatus.textContent = 'GitHub / Static';
          renderUI();
          return;
        }
      }
    } catch (_) {
      // Static data.json unreachable
    }

    // 3. Fallback: Check localStorage
    isConnectedToServer = false;
    connectionStatus.textContent = 'Local Mode';
    try {
      const local = localStorage.getItem('oee_reports_config');
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed && parsed.reports) {
          appState = parsed;
        }
      }
    } catch (err) {
      console.warn('LocalStorage error:', err);
    }
    renderUI();
  }

  /**
   * Save configuration to Server and LocalStorage
   */
  async function saveData(payload) {
    try {
      localStorage.setItem('oee_reports_config', JSON.stringify(payload));
    } catch (err) {
      console.warn('Could not write to localStorage:', err);
    }

    if (isConnectedToServer) {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Admin-Password': authenticatedAdminPassword
        },
        body: JSON.stringify({
          ...payload,
          adminPassword: authenticatedAdminPassword
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to save to server');
      }

      const resData = await response.json();
      if (resData.data) {
        appState = resData.data;
      } else {
        appState = payload;
      }
    } else {
      appState = payload;
    }

    renderUI();
  }

  /**
   * Open Password Modal
   */
  function openPasswordModal() {
    passwordError.textContent = '';
    passwordError.classList.remove('active');
    adminPasswordInput.value = '';
    passwordModal.removeAttribute('hidden');
    passwordModal.classList.add('is-open');
    passwordModal.style.display = 'flex';
    setTimeout(() => {
      adminPasswordInput.focus();
    }, 50);
  }

  /**
   * Close Password Modal
   */
  function closePasswordModal() {
    passwordModal.setAttribute('hidden', '');
    passwordModal.classList.remove('is-open');
    passwordModal.style.display = 'none';
    adminPasswordInput.value = '';
    passwordError.textContent = '';
    passwordError.classList.remove('active');
  }

  /**
   * Open Settings Drawer
   */
  function openSettings() {
    inputPortalTitle.value = appState.portalTitle || 'OEE Report';
    inputPortalSubtitle.value = appState.portalSubtitle || '';
    checkNewTab.checked = appState.openInNewTab !== false;
    inputNewPassword.value = '';

    const anwar = appState.reports.anwar || {};
    inputAnwarTitle.value = anwar.title || "Anwar's OEE Report";
    inputAnwarUrl.value = anwar.url || '';
    inputAnwarDept.value = anwar.department || 'Production & Efficiency';
    inputAnwarDesc.value = anwar.description || '';

    const monir = appState.reports.monir || {};
    inputMonirTitle.value = monir.title || "Monir's OEE Report";
    inputMonirUrl.value = monir.url || '';
    inputMonirDept.value = monir.department || 'Maintenance & Downtime';
    inputMonirDesc.value = monir.description || '';

    anwarUrlError.textContent = '';
    anwarUrlError.classList.remove('active');
    monirUrlError.textContent = '';
    monirUrlError.classList.remove('active');

    settingsModal.removeAttribute('hidden');
    settingsModal.classList.add('is-open');
    settingsModal.style.display = 'flex';
    openSettingsBtn.setAttribute('aria-expanded', 'true');
    setTimeout(() => {
      inputAnwarUrl.focus();
    }, 50);
  }

  /**
   * Close Settings Drawer
   */
  function closeSettings() {
    settingsModal.setAttribute('hidden', '');
    settingsModal.classList.remove('is-open');
    settingsModal.style.display = 'none';
    openSettingsBtn.setAttribute('aria-expanded', 'false');
    openSettingsBtn.focus();
    authenticatedAdminPassword = '';
  }

  /**
   * Handle Password Submit (Verification)
   */
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const enteredPass = adminPasswordInput.value.trim();

    if (!enteredPass) {
      passwordError.textContent = 'Please enter password.';
      passwordError.classList.add('active');
      return;
    }

    // Try server verification if connected
    if (isConnectedToServer) {
      try {
        const resp = await fetch('/api/verify-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: enteredPass })
        });
        if (resp.ok) {
          authenticatedAdminPassword = enteredPass;
          closePasswordModal();
          openSettings();
          return;
        } else {
          passwordError.textContent = 'Incorrect password. Please try again.';
          passwordError.classList.add('active');
          return;
        }
      } catch (_) {
        // Fallback to client-side hash check
      }
    }

    // Client-side SHA-256 verification (for offline / GitHub Pages)
    const enteredHash = await computeSha256(enteredPass);
    const expectedHash = appState.adminPasswordHash || DEFAULT_STATE.adminPasswordHash;

    if (enteredHash === expectedHash) {
      authenticatedAdminPassword = enteredPass;
      closePasswordModal();
      openSettings();
    } else {
      passwordError.textContent = 'Incorrect password. Please try again.';
      passwordError.classList.add('active');
    }
  });

  /**
   * Toggle Password Visibility
   */
  togglePasswordVisibilityBtn.addEventListener('click', () => {
    if (adminPasswordInput.type === 'password') {
      adminPasswordInput.type = 'text';
      togglePasswordVisibilityBtn.textContent = 'Hide';
    } else {
      adminPasswordInput.type = 'password';
      togglePasswordVisibilityBtn.textContent = 'Show';
    }
  });

  /**
   * Validate URL input
   */
  function validateField(inputEl, errorEl) {
    const val = inputEl.value.trim();
    if (val !== '' && !isValidHttpUrl(val)) {
      errorEl.textContent = 'Please enter a valid URL beginning with http:// or https://';
      errorEl.classList.add('active');
      return false;
    }
    errorEl.textContent = '';
    errorEl.classList.remove('active');
    return true;
  }

  /**
   * Handle Settings Submit (Publish Links)
   */
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const anwarUrlValid = validateField(inputAnwarUrl, anwarUrlError);
    const monirUrlValid = validateField(inputMonirUrl, monirUrlError);

    if (!anwarUrlValid || !monirUrlValid) {
      showToast('Please fix URL errors before publishing.', 'error');
      return;
    }

    const originalText = saveSettingsBtn.textContent;
    saveSettingsBtn.disabled = true;
    saveSettingsBtn.textContent = 'Publishing...';

    const now = new Date().toISOString();
    const newPass = inputNewPassword.value.trim();

    let newHash = appState.adminPasswordHash;
    if (newPass.length >= 4) {
      newHash = await computeSha256(newPass);
      authenticatedAdminPassword = newPass;
      sessionStorage.setItem('oee_cached_pwd', newPass);
    }

    const updatedPayload = {
      portalTitle: inputPortalTitle.value.trim() || 'OEE Report',
      portalSubtitle: inputPortalSubtitle.value.trim() || 'Centralized Operational Equipment Effectiveness Reports & Logs',
      openInNewTab: checkNewTab.checked,
      adminPasswordHash: newHash,
      newPassword: newPass.length >= 4 ? newPass : undefined,
      lastPublished: now,
      reports: {
        anwar: {
          id: 'anwar',
          name: 'Anwar',
          title: inputAnwarTitle.value.trim() || "Anwar's OEE Report",
          department: inputAnwarDept.value.trim() || 'Production & Efficiency',
          description: inputAnwarDesc.value.trim() || 'Daily production rates, line availability, and machine efficiency logs.',
          url: inputAnwarUrl.value.trim(),
          notes: 'Primary tracking sheet managed by Anwar',
          updatedAt: now
        },
        monir: {
          id: 'monir',
          name: 'Monir',
          title: inputMonirTitle.value.trim() || "Monir's OEE Report",
          department: inputMonirDept.value.trim() || 'Maintenance & Downtime',
          description: inputMonirDesc.value.trim() || 'Machine breakdown analysis, speed loss records, and operational quality data.',
          url: inputMonirUrl.value.trim(),
          notes: 'Primary tracking sheet managed by Monir',
          updatedAt: now
        }
      }
    };

    try {
      await saveData(updatedPayload);
      closeSettings();
      if (newPass.length >= 4) {
        showToast('Links published & admin password changed successfully!');
      } else {
        showToast('OEE report links published successfully!');
      }
    } catch (err) {
      showToast(`Error publishing: ${err.message}`, 'error');
    } finally {
      saveSettingsBtn.disabled = false;
      saveSettingsBtn.textContent = originalText;
    }
  });

  // Settings button click: ALWAYS ask for password!
  openSettingsBtn.addEventListener('click', () => {
    openPasswordModal();
  });

  closePasswordModalBtn.addEventListener('click', closePasswordModal);
  cancelPasswordBtn.addEventListener('click', closePasswordModal);

  closeSettingsBtn.addEventListener('click', closeSettings);
  cancelSettingsBtn.addEventListener('click', closeSettings);

  // GitHub Modal Listeners
  function openGithubModal() {
    githubModal.removeAttribute('hidden');
    githubModal.classList.add('is-open');
    githubModal.style.display = 'flex';
  }

  function closeGithubModal() {
    githubModal.setAttribute('hidden', '');
    githubModal.classList.remove('is-open');
    githubModal.style.display = 'none';
  }

  openGithubModalBtn.addEventListener('click', openGithubModal);
  closeGithubModalBtn.addEventListener('click', closeGithubModal);
  gotItGithubBtn.addEventListener('click', closeGithubModal);

  // Test URL buttons
  testAnwarUrlBtn.addEventListener('click', () => {
    const val = inputAnwarUrl.value.trim();
    if (!isStrictHttpUrl(val)) {
      anwarUrlError.textContent = 'Enter a valid http:// or https:// URL first to test.';
      anwarUrlError.classList.add('active');
      return;
    }
    anwarUrlError.classList.remove('active');
    window.open(val, '_blank', 'noopener,noreferrer');
  });

  testMonirUrlBtn.addEventListener('click', () => {
    const val = inputMonirUrl.value.trim();
    if (!isStrictHttpUrl(val)) {
      monirUrlError.textContent = 'Enter a valid http:// or https:// URL first to test.';
      monirUrlError.classList.add('active');
      return;
    }
    monirUrlError.classList.remove('active');
    window.open(val, '_blank', 'noopener,noreferrer');
  });

  // Launch link handlers
  function handleLaunchClick(e, reportOwner) {
    const target = e.currentTarget;
    if (target.hasAttribute('data-unconfigured')) {
      e.preventDefault();
      showToast(`${reportOwner}'s report link is not configured yet. Opening settings...`);
      openPasswordModal();
    }
  }

  anwarLaunchBtn.addEventListener('click', (e) => handleLaunchClick(e, 'Anwar'));
  monirLaunchBtn.addEventListener('click', (e) => handleLaunchClick(e, 'Monir'));

  // Copy Link handlers
  function copyLinkToClipboard(url, name) {
    if (!isStrictHttpUrl(url)) {
      showToast(`${name}'s report does not have a configured link yet.`, 'error');
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url)
        .then(() => showToast(`Copied ${name}'s link to clipboard!`))
        .catch(() => showToast(`Link: ${url}`));
    } else {
      showToast(`Link: ${url}`);
    }
  }

  anwarCopyBtn.addEventListener('click', () => copyLinkToClipboard(appState.reports.anwar.url, 'Anwar'));
  monirCopyBtn.addEventListener('click', () => copyLinkToClipboard(appState.reports.monir.url, 'Monir'));

  // Download updated data.json (for GitHub update)
  downloadDataJsonBtn.addEventListener('click', () => {
    const cleanData = {
      portalTitle: appState.portalTitle,
      portalSubtitle: appState.portalSubtitle,
      openInNewTab: appState.openInNewTab,
      adminPasswordHash: appState.adminPasswordHash,
      lastPublished: appState.lastPublished,
      reports: appState.reports
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cleanData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', 'data.json');
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showToast('Downloaded data.json for GitHub update!');
  });

  // Export full settings backup
  exportConfigBtn.addEventListener('click', () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appState, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', 'oee-report-backup.json');
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showToast('Configuration backup downloaded!');
  });

  // Import Settings
  importConfigFile.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (!imported.reports || !imported.reports.anwar || !imported.reports.monir) {
          throw new Error('Invalid OEE configuration format');
        }
        await saveData(imported);
        openSettings();
        showToast('Configuration imported successfully!');
      } catch (err) {
        showToast(`Import failed: ${err.message}`, 'error');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  // Backdrop clicks
  passwordModal.addEventListener('click', (e) => {
    if (e.target === passwordModal) closePasswordModal();
  });
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettings();
  });
  githubModal.addEventListener('click', (e) => {
    if (e.target === githubModal) closeGithubModal();
  });

  // Keyboard shortcut: Escape and 'S'
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePasswordModal();
      closeSettings();
      closeGithubModal();
      return;
    }
    if ((e.key === 's' || e.key === 'S') && settingsModal.hasAttribute('hidden') && passwordModal.hasAttribute('hidden')) {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag !== 'input' && activeTag !== 'textarea') {
        e.preventDefault();
        openPasswordModal();
      }
    }
  });

  // Init
  loadData();

})();
