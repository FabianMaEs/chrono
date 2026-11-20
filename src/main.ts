import './style.css';
import { db } from './db';
import { timerEngine } from './timer';
import { Icons } from './ui/icons';
import { Project, Activity, UserSettings } from './types';
import {
  formatTimeDigits,
  formatDurationHuman,
  formatCurrency,
  calculateProjectStats,
  enrichActivitiesWithEarnings,
  formatShortDate,
  formatTimeOfDay
} from './calculations';

type TabName = 'timer' | 'projects' | 'activities' | 'settings';

class ChronoApp {
  private currentTab: TabName = 'timer';
  private projects: Project[] = [];
  private activities: Activity[] = [];
  private settings: UserSettings = {
    alertIntervalMinutes: 60,
    soundEnabled: true,
    vibrationEnabled: true,
    currencySymbol: '$'
  };

  // Cached DOM elements
  private mainViewport = document.getElementById('main-viewport') as HTMLElement;
  private headerStatus = document.getElementById('header-status') as HTMLElement;
  private miniTimerBar = document.getElementById('mini-timer-bar') as HTMLElement;
  private miniTimerDigits = document.getElementById('mini-timer-digits') as HTMLElement;
  private miniTimerLabel = document.getElementById('mini-timer-label') as HTMLElement;
  private btnMiniTimerOpen = document.getElementById('btn-mini-timer-open') as HTMLButtonElement;

  // Modals
  private modalProject = document.getElementById('modal-project') as HTMLDialogElement;
  private formProject = document.getElementById('form-project') as HTMLFormElement;
  private modalActivity = document.getElementById('modal-activity') as HTMLDialogElement;
  private formActivity = document.getElementById('form-activity') as HTMLFormElement;
  private modalConfirm = document.getElementById('modal-confirm') as HTMLDialogElement;
  private inputRestoreFile = document.getElementById('input-restore-file') as HTMLInputElement;

  async init() {
    this.injectStaticIcons();
    this.registerServiceWorker();

    await timerEngine.init();
    this.settings = await db.getSettings();
    await this.refreshData();

    this.setupNavigation();
    this.setupModals();
    this.setupTimerSubscription();

    this.renderCurrentTab();
  }

  private injectStaticIcons() {
    const brandIcon = document.getElementById('brand-icon');
    if (brandIcon) brandIcon.innerHTML = Icons.timer;

    const iconTabTimer = document.getElementById('icon-tab-timer');
    if (iconTabTimer) iconTabTimer.innerHTML = Icons.timer;

    const iconTabProjects = document.getElementById('icon-tab-projects');
    if (iconTabProjects) iconTabProjects.innerHTML = Icons.folder;

    const iconTabActivities = document.getElementById('icon-tab-activities');
    if (iconTabActivities) iconTabActivities.innerHTML = Icons.list;

    const iconTabSettings = document.getElementById('icon-tab-settings');
    if (iconTabSettings) iconTabSettings.innerHTML = Icons.settings;

    const btnCloseProj = document.getElementById('btn-close-project-modal');
    if (btnCloseProj) btnCloseProj.innerHTML = Icons.close;

    const btnCloseAct = document.getElementById('btn-close-activity-modal');
    if (btnCloseAct) btnCloseAct.innerHTML = Icons.close;
  }

  private registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
  }

  private async refreshData() {
    this.projects = await db.getProjects();
    this.activities = await db.getActivities();
  }

  private setupNavigation() {
    const navButtons = document.querySelectorAll<HTMLButtonElement>('.nav-tab');
    navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab') as TabName;
        if (tab && tab !== this.currentTab) {
          navButtons.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.currentTab = tab;
          this.renderCurrentTab();
        }
      });
    });

    this.btnMiniTimerOpen.addEventListener('click', () => {
      const timerBtn = document.querySelector<HTMLButtonElement>('[data-tab="timer"]');
      if (timerBtn) timerBtn.click();
    });
  }

  private setupTimerSubscription() {
    timerEngine.subscribe((elapsedMs, session) => {
      // Update Header Status
      this.headerStatus.className = 'header-status-badge';
      if (session.status === 'running') {
        this.headerStatus.classList.add('running');
        this.headerStatus.textContent = 'Corriendo';
      } else if (session.status === 'paused') {
        this.headerStatus.classList.add('paused');
        this.headerStatus.textContent = 'En pausa';
      } else {
        this.headerStatus.textContent = 'Inactivo';
      }

      // Update Mini Timer Bar
      const isTimerActive = session.status !== 'idle';
      if (isTimerActive && this.currentTab !== 'timer') {
        this.miniTimerBar.hidden = false;
        this.miniTimerDigits.textContent = formatTimeDigits(elapsedMs);
        const project = this.projects.find((p) => p.id === session.projectId);
        const name = session.activityTitle || (project ? project.name : 'Cronómetro rápido');
        this.miniTimerLabel.textContent = name;
      } else {
        this.miniTimerBar.hidden = true;
      }

      // Update Timer View if active
      if (this.currentTab === 'timer') {
        const digitsEl = document.getElementById('timer-digits');
        const containerEl = document.getElementById('stopwatch-container');
        if (digitsEl) digitsEl.textContent = formatTimeDigits(elapsedMs);
        if (containerEl) {
          containerEl.className = 'stopwatch-display-container';
          if (session.status === 'running') containerEl.classList.add('running');
          if (session.status === 'paused') containerEl.classList.add('paused');
        }
      }
    });
  }

  // ==========================================================
  // RENDER VIEWS
  // ==========================================================
  private renderCurrentTab() {
    switch (this.currentTab) {
      case 'timer':
        this.renderTimerView();
        break;
      case 'projects':
        this.renderProjectsView();
        break;
      case 'activities':
        this.renderActivitiesView();
        break;
      case 'settings':
        this.renderSettingsView();
        break;
    }
  }

  // --- View: Timer ---
  private renderTimerView() {
    const session = timerEngine.getSession();
    const elapsedMs = timerEngine.getElapsedMs();

    const projectOptions = this.projects.map((p) => {
      const isSelected = session.projectId === p.id ? 'selected' : '';
      return `<option value="${p.id}" ${isSelected}>${p.name}</option>`;
    }).join('');

    let actionButtonsHtml = '';
    if (session.status === 'idle') {
      actionButtonsHtml = `
        <button class="btn-ctrl btn-start" id="btn-timer-start" type="button">
          ${Icons.play}
          <span>Iniciar Cronómetro Rápido</span>
        </button>
      `;
    } else if (session.status === 'running') {
      actionButtonsHtml = `
        <button class="btn-ctrl btn-pause" id="btn-timer-pause" type="button">
          ${Icons.pause}
          <span>Pausar</span>
        </button>
      `;
    } else if (session.status === 'paused') {
      actionButtonsHtml = `
        <button class="btn-ctrl btn-resume" id="btn-timer-resume" type="button">
          ${Icons.play}
          <span>Continuar</span>
        </button>
        <button class="btn-ctrl btn-stop" id="btn-timer-stop" type="button">
          ${Icons.stop}
          <span>Detener</span>
        </button>
      `;
    }

    this.mainViewport.innerHTML = `
      <div class="timer-view-container">
        <!-- Target selector card -->
        <div class="timer-target-card">
          <div class="timer-target-field">
            <label class="target-label" for="live-select-project">Proyecto Asignado</label>
            <select class="target-select" id="live-select-project">
              <option value="">(Sin asignar o asignar al detener)</option>
              ${projectOptions}
            </select>
          </div>
          <div class="timer-target-field">
            <label class="target-label" for="live-input-title">Actividad / Tarea</label>
            <input class="target-input" id="live-input-title" type="text" placeholder="¿En qué estás trabajando?" value="${session.activityTitle}" />
          </div>
        </div>

        <!-- Stopwatch Circle -->
        <div class="stopwatch-display-container ${session.status}" id="stopwatch-container">
          <div class="stopwatch-digits" id="timer-digits">${formatTimeDigits(elapsedMs)}</div>
          <div class="stopwatch-subtext" id="stopwatch-subtext">
            ${session.activityTitle || (session.projectId ? this.projects.find((p) => p.id === session.projectId)?.name || '' : 'Listo')}
          </div>
        </div>

        <!-- Actions Row -->
        <div class="timer-actions-row">
          ${actionButtonsHtml}
        </div>
      </div>
    `;

    // Event listeners
    const liveSelectProj = document.getElementById('live-select-project') as HTMLSelectElement;
    if (liveSelectProj) {
      liveSelectProj.addEventListener('change', () => {
        timerEngine.setAssignedProject(liveSelectProj.value || null);
      });
    }

    const liveInputTitle = document.getElementById('live-input-title') as HTMLInputElement;
    if (liveInputTitle) {
      liveInputTitle.addEventListener('input', () => {
        timerEngine.setAssignedTitle(liveInputTitle.value);
        const subtext = document.getElementById('stopwatch-subtext');
        if (subtext) subtext.textContent = liveInputTitle.value || 'Listo';
      });
    }

    const btnStart = document.getElementById('btn-timer-start');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        this.requestNotificationPermissionOnce();
        timerEngine.start(liveSelectProj?.value || null, liveInputTitle?.value || '');
        this.renderTimerView();
      });
    }

    const btnPause = document.getElementById('btn-timer-pause');
    if (btnPause) {
      btnPause.addEventListener('click', () => {
        timerEngine.pause();
        this.renderTimerView();
      });
    }

    const btnResume = document.getElementById('btn-timer-resume');
    if (btnResume) {
      btnResume.addEventListener('click', () => {
        timerEngine.resume();
        this.renderTimerView();
      });
    }

    const btnStop = document.getElementById('btn-timer-stop');
    if (btnStop) {
      btnStop.addEventListener('click', async () => {
        const stoppedSession = await timerEngine.stop();
        this.openSaveActivityModal(stoppedSession);
        this.renderTimerView();
      });
    }
  }

  private requestNotificationPermissionOnce() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  // --- View: Projects ---
  private renderProjectsView() {
    const cardsHtml = this.projects.length === 0
      ? `
        <div class="empty-state">
          <div class="empty-state-title">No hay proyectos todavía</div>
          <div class="empty-state-text">Crea un proyecto para definir el costo total y calcular automáticamente tu ganancia por hora.</div>
        </div>
      `
      : this.projects.map((project) => {
        const stats = calculateProjectStats(project, this.activities);
        const rateFormatted = stats.effectiveRatePerHour > 0
          ? `${formatCurrency(stats.effectiveRatePerHour, this.settings.currencySymbol)}/h`
          : '--';

        const hoursFormatted = `${stats.totalHours.toFixed(1)}h`;
        const costFormatted = formatCurrency(project.cost, this.settings.currencySymbol);

        return `
          <div class="project-card ${project.isCompleted ? 'completed' : ''}" data-id="${project.id}">
            <div class="project-card-top">
              <div>
                <h3 class="project-card-title">${project.name}</h3>
                ${project.description ? `<p class="project-card-desc">${project.description}</p>` : ''}
              </div>
            </div>

            <div class="project-card-meta-grid">
              <div class="meta-item">
                <span class="meta-item-label">Costo</span>
                <span class="meta-item-value">${costFormatted}</span>
              </div>
              <div class="meta-item">
                <span class="meta-item-label">Tiempo</span>
                <span class="meta-item-value">${hoursFormatted}</span>
              </div>
              <div class="meta-item">
                <span class="meta-item-label">Ganancia/h</span>
                <span class="meta-item-value rate">${rateFormatted}</span>
              </div>
            </div>

            <div class="project-card-actions">
              <button class="status-toggle-badge ${project.isCompleted ? 'done' : ''}" data-action="toggle-status" data-id="${project.id}" type="button">
                ${project.isCompleted ? 'Terminado' : 'En progreso'}
              </button>
              <div class="project-action-icons">
                <button class="btn-icon-sm" data-action="edit-project" data-id="${project.id}" type="button" aria-label="Editar">
                  ${Icons.edit}
                </button>
                <button class="btn-icon-sm danger" data-action="delete-project" data-id="${project.id}" type="button" aria-label="Eliminar">
                  ${Icons.trash}
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

    this.mainViewport.innerHTML = `
      <div>
        <div class="section-header">
          <h2 class="section-title">Proyectos</h2>
          <button class="btn-new-item" id="btn-new-project" type="button">
            ${Icons.plus}
            <span>Nuevo</span>
          </button>
        </div>
        <div class="cards-list">
          ${cardsHtml}
        </div>
      </div>
    `;

    // Event listeners
    const btnNew = document.getElementById('btn-new-project');
    if (btnNew) {
      btnNew.addEventListener('click', () => this.openProjectModal());
    }

    this.mainViewport.querySelectorAll<HTMLButtonElement>('[data-action="toggle-status"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const proj = this.projects.find((p) => p.id === id);
        if (proj) {
          proj.isCompleted = !proj.isCompleted;
          proj.updatedAt = Date.now();
          await db.saveProject(proj);
          await this.refreshData();
          this.renderProjectsView();
        }
      });
    });

    this.mainViewport.querySelectorAll<HTMLButtonElement>('[data-action="edit-project"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const proj = this.projects.find((p) => p.id === id);
        if (proj) this.openProjectModal(proj);
      });
    });

    this.mainViewport.querySelectorAll<HTMLButtonElement>('[data-action="delete-project"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const proj = this.projects.find((p) => p.id === id);
        if (proj) {
          this.confirmAction(
            'Eliminar Proyecto',
            `¿Seguro que deseas eliminar el proyecto "${proj.name}"? Sus actividades no se borrarán pero quedarán sin proyecto asignado.`,
            async () => {
              await db.deleteProject(proj.id);
              await this.refreshData();
              this.renderProjectsView();
            }
          );
        }
      });
    });
  }

  // --- View: Activities ---
  private renderActivitiesView() {
    const enriched = enrichActivitiesWithEarnings(this.activities, this.projects);

    const cardsHtml = enriched.length === 0
      ? `
        <div class="empty-state">
          <div class="empty-state-title">No hay actividades registradas</div>
          <div class="empty-state-text">Usa el cronómetro o agrega una entrada manual para comenzar a registrar tiempos y ganancias.</div>
        </div>
      `
      : enriched.map((act) => {
        const earnedFormatted = formatCurrency(act.earnedAmount, this.settings.currencySymbol);
        const rateFormatted = act.effectiveRatePerHour > 0
          ? `${formatCurrency(act.effectiveRatePerHour, this.settings.currencySymbol)}/h`
          : '--';

        return `
          <div class="activity-card" data-id="${act.id}">
            <div class="activity-card-top">
              <h3 class="activity-title">${act.title}</h3>
              <span class="activity-project-pill">${act.projectName}</span>
            </div>

            <div class="activity-meta-row">
              <div class="activity-time-info">
                <span class="activity-duration">${formatDurationHuman(act.durationMs)}</span>
                <span class="activity-date">${formatShortDate(act.startedAt)} • ${formatTimeOfDay(act.startedAt)}</span>
              </div>
              <div class="activity-earning-info">
                <span class="activity-earned-amount">${earnedFormatted}</span>
                <span class="activity-effective-rate">Tasa: ${rateFormatted}</span>
              </div>
            </div>

            <div class="project-card-actions">
              <span class="meta-item-label">${act.projectName}</span>
              <div class="project-action-icons">
                <button class="btn-icon-sm" data-action="edit-activity" data-id="${act.id}" type="button" aria-label="Editar">
                  ${Icons.edit}
                </button>
                <button class="btn-icon-sm danger" data-action="delete-activity" data-id="${act.id}" type="button" aria-label="Eliminar">
                  ${Icons.trash}
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

    this.mainViewport.innerHTML = `
      <div>
        <div class="section-header">
          <h2 class="section-title">Actividades</h2>
          <button class="btn-new-item" id="btn-new-manual-activity" type="button">
            ${Icons.plus}
            <span>Manual</span>
          </button>
        </div>
        <div class="cards-list">
          ${cardsHtml}
        </div>
      </div>
    `;

    // Event listeners
    const btnManual = document.getElementById('btn-new-manual-activity');
    if (btnManual) {
      btnManual.addEventListener('click', () => this.openManualActivityModal());
    }

    this.mainViewport.querySelectorAll<HTMLButtonElement>('[data-action="edit-activity"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const act = this.activities.find((a) => a.id === id);
        if (act) this.openEditActivityModal(act);
      });
    });

    this.mainViewport.querySelectorAll<HTMLButtonElement>('[data-action="delete-activity"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const act = this.activities.find((a) => a.id === id);
        if (act) {
          this.confirmAction(
            'Eliminar Actividad',
            `¿Seguro que deseas eliminar "${act.title}"?`,
            async () => {
              await db.deleteActivity(act.id);
              await this.refreshData();
              this.renderActivitiesView();
            }
          );
        }
      });
    });
  }

  // --- View: Settings ---
  private renderSettingsView() {
    this.mainViewport.innerHTML = `
      <div>
        <div class="section-header">
          <h2 class="section-title">Ajustes</h2>
        </div>

        <!-- Timer Alert Group -->
        <div class="settings-group">
          <h3 class="settings-group-title">Recordatorios de Cronómetro</h3>

          <div class="settings-item">
            <div>
              <div class="settings-item-label">Alerta por olvido</div>
              <div class="settings-item-hint">Avisar si el cronómetro sigue corriendo</div>
            </div>
            <select class="settings-select" id="setting-alert-interval">
              <option value="0" ${this.settings.alertIntervalMinutes === 0 ? 'selected' : ''}>Desactivado</option>
              <option value="30" ${this.settings.alertIntervalMinutes === 30 ? 'selected' : ''}>Cada 30 min</option>
              <option value="45" ${this.settings.alertIntervalMinutes === 45 ? 'selected' : ''}>Cada 45 min</option>
              <option value="60" ${this.settings.alertIntervalMinutes === 60 ? 'selected' : ''}>Cada 1 hora</option>
              <option value="90" ${this.settings.alertIntervalMinutes === 90 ? 'selected' : ''}>Cada 1.5 horas</option>
              <option value="120" ${this.settings.alertIntervalMinutes === 120 ? 'selected' : ''}>Cada 2 horas</option>
            </select>
          </div>

          <div class="settings-item">
            <div>
              <div class="settings-item-label">Sonido de alerta</div>
              <div class="settings-item-hint">Campana sutil al superar el límite</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="setting-sound-enabled" ${this.settings.soundEnabled ? 'checked' : ''} />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="settings-item">
            <div>
              <div class="settings-item-label">Vibración háptica</div>
              <div class="settings-item-hint">Respuesta táctil en móvil</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="setting-vibe-enabled" ${this.settings.vibrationEnabled ? 'checked' : ''} />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Currency Group -->
        <div class="settings-group">
          <h3 class="settings-group-title">Moneda</h3>
          <div class="settings-item">
            <div>
              <div class="settings-item-label">Símbolo</div>
              <div class="settings-item-hint">Prefijo para montos y ganancias</div>
            </div>
            <select class="settings-select" id="setting-currency">
              <option value="$" ${this.settings.currencySymbol === '$' ? 'selected' : ''}>$ (Dólar / Peso)</option>
              <option value="€" ${this.settings.currencySymbol === '€' ? 'selected' : ''}>€ (Euro)</option>
              <option value="£" ${this.settings.currencySymbol === '£' ? 'selected' : ''}>£ (Libra)</option>
            </select>
          </div>
        </div>

        <!-- Backup & Export Group -->
        <div class="settings-group">
          <h3 class="settings-group-title">Datos y Respaldo</h3>
          <button class="btn-full-action" id="btn-backup-export" type="button">
            ${Icons.export}
            <span>Exportar Copia de Seguridad (JSON)</span>
          </button>
          <button class="btn-full-action" id="btn-backup-import" type="button">
            ${Icons.import}
            <span>Restaurar Copia de Seguridad (JSON)</span>
          </button>
          <button class="btn-full-action" id="btn-csv-export" type="button">
            ${Icons.list}
            <span>Exportar Reporte a CSV</span>
          </button>
        </div>
      </div>
    `;

    // Event listeners
    const selInterval = document.getElementById('setting-alert-interval') as HTMLSelectElement;
    if (selInterval) {
      selInterval.addEventListener('change', async () => {
        this.settings.alertIntervalMinutes = parseInt(selInterval.value, 10);
        await timerEngine.updateSettings(this.settings);
      });
    }

    const chkSound = document.getElementById('setting-sound-enabled') as HTMLInputElement;
    if (chkSound) {
      chkSound.addEventListener('change', async () => {
        this.settings.soundEnabled = chkSound.checked;
        await timerEngine.updateSettings(this.settings);
      });
    }

    const chkVibe = document.getElementById('setting-vibe-enabled') as HTMLInputElement;
    if (chkVibe) {
      chkVibe.addEventListener('change', async () => {
        this.settings.vibrationEnabled = chkVibe.checked;
        await timerEngine.updateSettings(this.settings);
      });
    }

    const selCurrency = document.getElementById('setting-currency') as HTMLSelectElement;
    if (selCurrency) {
      selCurrency.addEventListener('change', async () => {
        this.settings.currencySymbol = selCurrency.value;
        await timerEngine.updateSettings(this.settings);
      });
    }

    const btnBackupExp = document.getElementById('btn-backup-export');
    if (btnBackupExp) {
      btnBackupExp.addEventListener('click', () => this.handleExportBackup());
    }

    const btnBackupImp = document.getElementById('btn-backup-import');
    if (btnBackupImp) {
      btnBackupImp.addEventListener('click', () => {
        this.inputRestoreFile.click();
      });
    }

    const btnCsvExp = document.getElementById('btn-csv-export');
    if (btnCsvExp) {
      btnCsvExp.addEventListener('click', () => this.handleExportCSV());
    }
  }

  // ==========================================================
  // MODALS & ACTIONS
  // ==========================================================
  private setupModals() {
    // Project Modal Cancel
    const btnCancelProj = document.getElementById('btn-cancel-project');
    const btnCloseProj = document.getElementById('btn-close-project-modal');
    const closeProjModal = () => this.modalProject.close();
    if (btnCancelProj) btnCancelProj.addEventListener('click', closeProjModal);
    if (btnCloseProj) btnCloseProj.addEventListener('click', closeProjModal);

    // Project Form Submit
    this.formProject.addEventListener('submit', async (e) => {
      e.preventDefault();
      const idInput = document.getElementById('project-field-id') as HTMLInputElement;
      const nameInput = document.getElementById('project-field-name') as HTMLInputElement;
      const descInput = document.getElementById('project-field-desc') as HTMLTextAreaElement;
      const costInput = document.getElementById('project-field-cost') as HTMLInputElement;
      const compSelect = document.getElementById('project-field-completed') as HTMLSelectElement;

      const now = Date.now();
      const project: Project = {
        id: idInput.value || `proj_${now}_${Math.random().toString(36).substring(2, 7)}`,
        name: nameInput.value.trim(),
        description: descInput.value.trim(),
        cost: parseFloat(costInput.value) || 0,
        isCompleted: compSelect.value === 'true',
        createdAt: idInput.value ? (this.projects.find((p) => p.id === idInput.value)?.createdAt || now) : now,
        updatedAt: now
      };

      await db.saveProject(project);
      await this.refreshData();
      this.modalProject.close();
      if (this.currentTab === 'projects') this.renderProjectsView();
    });

    // Activity Modal Cancel
    const btnCancelAct = document.getElementById('btn-cancel-activity');
    const btnCloseAct = document.getElementById('btn-close-activity-modal');
    const closeActModal = () => this.modalActivity.close();
    if (btnCancelAct) btnCancelAct.addEventListener('click', closeActModal);
    if (btnCloseAct) btnCloseAct.addEventListener('click', closeActModal);

    // Activity Form Submit
    this.formActivity.addEventListener('submit', async (e) => {
      e.preventDefault();
      const idInput = document.getElementById('activity-field-id') as HTMLInputElement;
      const projSelect = document.getElementById('activity-field-project') as HTMLSelectElement;
      const titleInput = document.getElementById('activity-field-title') as HTMLInputElement;
      const durInput = document.getElementById('activity-field-duration') as HTMLInputElement;

      const minutes = parseInt(durInput.value, 10) || 1;
      const durationMs = minutes * 60 * 1000;
      const now = Date.now();

      const existing = idInput.value ? this.activities.find((a) => a.id === idInput.value) : null;
      const startedAt = existing ? existing.startedAt : now - durationMs;
      const endedAt = existing ? startedAt + durationMs : now;

      const activity: Activity = {
        id: idInput.value || `act_${now}_${Math.random().toString(36).substring(2, 7)}`,
        projectId: projSelect.value,
        title: titleInput.value.trim() || 'Actividad general',
        durationMs,
        startedAt,
        endedAt,
        createdAt: existing ? existing.createdAt : now
      };

      await db.saveActivity(activity);
      await this.refreshData();
      this.modalActivity.close();

      if (this.currentTab === 'activities') this.renderActivitiesView();
      if (this.currentTab === 'projects') this.renderProjectsView();
    });

    // File restore handler
    this.inputRestoreFile.addEventListener('change', async () => {
      const file = this.inputRestoreFile.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const result = await db.importBackup(text);
        await this.refreshData();
        alert(`Respaldo restaurado: ${result.projectsCount} proyectos y ${result.activitiesCount} actividades.`);
        this.renderCurrentTab();
      } catch (err) {
        alert('Error al leer el archivo de respaldo: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        this.inputRestoreFile.value = '';
      }
    });
  }

  private openProjectModal(project?: Project) {
    const titleEl = document.getElementById('modal-project-title') as HTMLElement;
    const idInput = document.getElementById('project-field-id') as HTMLInputElement;
    const nameInput = document.getElementById('project-field-name') as HTMLInputElement;
    const descInput = document.getElementById('project-field-desc') as HTMLTextAreaElement;
    const costInput = document.getElementById('project-field-cost') as HTMLInputElement;
    const compSelect = document.getElementById('project-field-completed') as HTMLSelectElement;

    if (project) {
      titleEl.textContent = 'Editar Proyecto';
      idInput.value = project.id;
      nameInput.value = project.name;
      descInput.value = project.description || '';
      costInput.value = project.cost.toString();
      compSelect.value = project.isCompleted ? 'true' : 'false';
    } else {
      titleEl.textContent = 'Nuevo Proyecto';
      idInput.value = '';
      nameInput.value = '';
      descInput.value = '';
      costInput.value = '';
      compSelect.value = 'false';
    }

    this.modalProject.showModal();
  }

  private populateActivityProjectSelect(selectedProjectId: string | null = null) {
    const projSelect = document.getElementById('activity-field-project') as HTMLSelectElement;
    if (this.projects.length === 0) {
      projSelect.innerHTML = `<option value="">(Sin proyectos creados)</option>`;
      return;
    }

    projSelect.innerHTML = this.projects.map((p) => {
      const isSel = p.id === selectedProjectId ? 'selected' : '';
      return `<option value="${p.id}" ${isSel}>${p.name}</option>`;
    }).join('');
  }

  private openSaveActivityModal(sessionResult: {
    durationMs: number;
    startedAt: number;
    endedAt: number;
    projectId: string | null;
    activityTitle: string;
  }) {
    const titleEl = document.getElementById('modal-activity-title') as HTMLElement;
    const idInput = document.getElementById('activity-field-id') as HTMLInputElement;
    const titleInput = document.getElementById('activity-field-title') as HTMLInputElement;
    const durInput = document.getElementById('activity-field-duration') as HTMLInputElement;

    titleEl.textContent = 'Guardar Actividad Terminada';
    idInput.value = '';
    titleInput.value = sessionResult.activityTitle || '';
    const minutes = Math.max(1, Math.round(sessionResult.durationMs / (1000 * 60)));
    durInput.value = minutes.toString();

    this.populateActivityProjectSelect(sessionResult.projectId);
    this.modalActivity.showModal();
  }

  private openManualActivityModal() {
    const titleEl = document.getElementById('modal-activity-title') as HTMLElement;
    const idInput = document.getElementById('activity-field-id') as HTMLInputElement;
    const titleInput = document.getElementById('activity-field-title') as HTMLInputElement;
    const durInput = document.getElementById('activity-field-duration') as HTMLInputElement;

    titleEl.textContent = 'Nueva Entrada Manual';
    idInput.value = '';
    titleInput.value = '';
    durInput.value = '30';

    this.populateActivityProjectSelect();
    this.modalActivity.showModal();
  }

  private openEditActivityModal(activity: Activity) {
    const titleEl = document.getElementById('modal-activity-title') as HTMLElement;
    const idInput = document.getElementById('activity-field-id') as HTMLInputElement;
    const titleInput = document.getElementById('activity-field-title') as HTMLInputElement;
    const durInput = document.getElementById('activity-field-duration') as HTMLInputElement;

    titleEl.textContent = 'Editar Actividad';
    idInput.value = activity.id;
    titleInput.value = activity.title;
    const minutes = Math.max(1, Math.round(activity.durationMs / (1000 * 60)));
    durInput.value = minutes.toString();

    this.populateActivityProjectSelect(activity.projectId);
    this.modalActivity.showModal();
  }

  private confirmAction(title: string, message: string, onConfirm: () => void | Promise<void>) {
    const titleEl = document.getElementById('modal-confirm-title') as HTMLElement;
    const msgEl = document.getElementById('modal-confirm-message') as HTMLElement;
    const btnOk = document.getElementById('btn-confirm-ok') as HTMLButtonElement;
    const btnCancel = document.getElementById('btn-confirm-cancel') as HTMLButtonElement;

    titleEl.textContent = title;
    msgEl.textContent = message;

    const cleanup = () => {
      this.modalConfirm.close();
      btnOk.onclick = null;
      btnCancel.onclick = null;
    };

    btnCancel.onclick = () => cleanup();
    btnOk.onclick = async () => {
      cleanup();
      await onConfirm();
    };

    this.modalConfirm.showModal();
  }

  private async handleExportBackup() {
    const jsonStr = await db.exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];

    const a = document.createElement('a');
    a.href = url;
    a.download = `chrono-backup-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private handleExportCSV() {
    const enriched = enrichActivitiesWithEarnings(this.activities, this.projects);
    const headers = ['ID', 'Proyecto', 'Actividad', 'Minutos', 'Horas', 'Ganancia', 'Tasa_Hora', 'Fecha_Inicio'];
    const rows = enriched.map((a) => {
      const minutes = Math.round(a.durationMs / (1000 * 60));
      const hours = (a.durationMs / (1000 * 60 * 60)).toFixed(2);
      return [
        `"${a.id}"`,
        `"${a.projectName.replace(/"/g, '""')}"`,
        `"${a.title.replace(/"/g, '""')}"`,
        minutes,
        hours,
        a.earnedAmount.toFixed(2),
        a.effectiveRatePerHour.toFixed(2),
        `"${new Date(a.startedAt).toISOString()}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];

    const a = document.createElement('a');
    a.href = url;
    a.download = `chrono-reporte-${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Start application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new ChronoApp();
  app.init().catch(console.error);
});
