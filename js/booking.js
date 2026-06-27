/* ============================================================
   BOOKING SYSTEM — Mylena Meira Site
   Integração com backend: /api/public/*
   ============================================================ */

const API = window.API_BASE || 'http://localhost:3000';

const BookingWidget = {
  // Estado
  state: {
    step: 1,
    services: [],
    selectedService: null,
    currentMonth: new Date(),
    selectedDate: null,
    slots: [],
    selectedSlot: null,
    loading: false,
  },

  // ─── Inicialização ──────────────────────────────────────────
  async init() {
    this.bindElements();
    this.bindEvents();
    await this.loadServices();
    this.renderCalendar();
  },

  bindElements() {
    this.el = {
      widget: document.getElementById('booking-widget'),
      tabs:   document.querySelectorAll('.booking-step-tab'),
      steps:  document.querySelectorAll('.booking-step'),
      // Step 1
      servicesList: document.getElementById('booking-services-list'),
      // Step 2
      calMonth: document.getElementById('cal-month'),
      calGrid:  document.getElementById('cal-grid'),
      slotContainer: document.getElementById('slots-container'),
      slotsGrid: document.getElementById('slots-grid'),
      // Step 3
      form:     document.getElementById('booking-form'),
      inputName:  document.getElementById('inp-name'),
      inputPhone: document.getElementById('inp-phone'),
      inputEmail: document.getElementById('inp-email'),
      inputNotes: document.getElementById('inp-notes'),
      // Resumo
      sumService: document.getElementById('sum-service'),
      sumDate:    document.getElementById('sum-date'),
      sumTime:    document.getElementById('sum-time'),
      sumPrice:   document.getElementById('sum-price'),
    };
  },

  bindEvents() {
    // Navegação mês no calendário
    document.getElementById('cal-prev')?.addEventListener('click', () => {
      this.state.currentMonth = new Date(
        this.state.currentMonth.getFullYear(),
        this.state.currentMonth.getMonth() - 1, 1
      );
      this.renderCalendar();
    });
    document.getElementById('cal-next')?.addEventListener('click', () => {
      this.state.currentMonth = new Date(
        this.state.currentMonth.getFullYear(),
        this.state.currentMonth.getMonth() + 1, 1
      );
      this.renderCalendar();
    });

    // Botões de navegação
    document.getElementById('btn-to-step2')?.addEventListener('click', () => this.goToStep(2));
    document.getElementById('btn-to-step3')?.addEventListener('click', () => this.goToStep(3));
    document.getElementById('btn-back-1')?.addEventListener('click',   () => this.goToStep(1));
    document.getElementById('btn-back-2')?.addEventListener('click',   () => this.goToStep(2));

    // Submissão
    document.getElementById('btn-submit')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.submitBooking();
    });

    // Máscara de telefone
    this.el.inputPhone?.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 11);
      if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
      else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
      e.target.value = v;
    });

    // Novo agendamento
    document.getElementById('btn-novo')?.addEventListener('click', () => {
      this.resetWidget();
    });

    // Botão WhatsApp do widget
    document.getElementById('btn-whatsapp')?.addEventListener('click', () => {
      const phone = document.getElementById('footer-whatsapp')?.dataset.phone || '';
      if (phone) window.open(`https://wa.me/55${phone.replace(/\D/g,'')}`, '_blank');
    });
  },

  // ─── Carrega serviços da API ─────────────────────────────────
  async loadServices() {
    this.el.servicesList.innerHTML = this.skeletonServices();
    try {
      const res = await fetch(`${API}/api/public/services`);
      const json = await res.json();
      const all = json.data || [];
      // Avaliação/gratuito sempre primeiro, depois por preço crescente
      this.state.services = all.sort((a, b) => {
        const aFree = parseFloat(a.price) === 0;
        const bFree = parseFloat(b.price) === 0;
        if (aFree && !bFree) return -1;
        if (!aFree && bFree) return 1;
        return parseFloat(a.price) - parseFloat(b.price);
      });
      this.renderServices();
    } catch {
      this.el.servicesList.innerHTML =
        `<p style="color:var(--gray-warm);font-size:.82rem">Erro ao carregar serviços. Tente novamente.</p>`;
    }
  },

  renderServices() {
    if (!this.state.services.length) {
      this.el.servicesList.innerHTML =
        `<p style="color:var(--gray-warm);font-size:.82rem">Nenhum serviço disponível no momento.</p>`;
      return;
    }

    const singleSession = this.state.services.find(s => s.sessions_count === 1 && parseFloat(s.price) > 0);
    const singlePrice   = singleSession ? parseFloat(singleSession.price) : 0;

    this.el.servicesList.innerHTML = this.state.services.map(s => {
      const price     = parseFloat(s.price);
      const isPackage = s.sessions_count > 1 && singlePrice > 0;
      const fullPrice = isPackage ? singlePrice * s.sessions_count : 0;
      const savings   = isPackage ? fullPrice - price : 0;
      const discPct   = isPackage ? Math.round((savings / fullPrice) * 100) : 0;

      const discountBlock = isPackage ? `
        <div class="bsi-desconto">
          <span class="bsi-preco-original">${this.formatPrice(fullPrice)}</span>
          <span class="bsi-economia">${discPct}% OFF · Economize ${this.formatPrice(savings)}</span>
        </div>` : '';

      return `
      <div class="booking-service-item" data-id="${s.id}" onclick="BookingWidget.selectService('${s.id}')">
        <div style="flex:1;min-width:0">
          <div class="bsi-name">${s.name}</div>
          <div class="bsi-meta">
            ${s.duration} min
            ${s.sessions_count > 1 ? ` · ${s.sessions_count} sessões` : ''}
            ${s.description ? ` · ${s.description.slice(0,60)}…` : ''}
          </div>
          ${discountBlock}
        </div>
        <div class="bsi-price" style="margin-left:.75rem;flex-shrink:0">${price > 0 ? this.formatPrice(price) : 'Gratuito'}</div>
      </div>`;
    }).join('');
  },

  selectService(id) {
    this.state.selectedService = this.state.services.find(s => s.id === id);
    document.querySelectorAll('.booking-service-item').forEach(el => {
      el.classList.toggle('selected', el.dataset.id === id);
    });
    document.getElementById('btn-to-step2').disabled = false;
    document.getElementById('btn-to-step2').style.opacity = '1';
  },

  // ─── Calendário ──────────────────────────────────────────────
  renderCalendar() {
    const now   = new Date();
    const month = this.state.currentMonth;
    const year  = month.getFullYear();
    const mon   = month.getMonth();
    const firstDay = new Date(year, mon, 1).getDay();
    const daysInMonth = new Date(year, mon + 1, 0).getDate();

    const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                        'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    this.el.calMonth.textContent = `${monthNames[mon]} ${year}`;

    // Não deixa navegar para meses passados
    const prevBtn = document.getElementById('cal-prev');
    prevBtn.disabled = year === now.getFullYear() && mon <= now.getMonth();
    prevBtn.style.opacity = prevBtn.disabled ? '0.3' : '1';

    let html = '';
    // Espaços em branco antes do dia 1
    for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, mon, d);
      const dateStr = this.formatDate(date);
      const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dow    = date.getDay();
      const isClosed = dow === 0; // domingo fechado
      const isToday  = dateStr === this.formatDate(now);
      const isSelected = dateStr === this.state.selectedDate;

      let cls = 'cal-day';
      if (isPast || isClosed) cls += isPast ? ' past' : ' closed';
      else cls += ' available';
      if (isToday) cls += ' today';
      if (isSelected) cls += ' selected';

      const onclick = (!isPast && !isClosed)
        ? `onclick="BookingWidget.selectDate('${dateStr}')"`
        : '';

      html += `<div class="${cls}" ${onclick}>${d}</div>`;
    }

    this.el.calGrid.innerHTML = html;
  },

  async selectDate(dateStr) {
    this.state.selectedDate = dateStr;
    this.state.selectedSlot = null;
    this.renderCalendar();

    // Mostra seção de slots
    this.el.slotContainer.style.display = 'block';
    this.el.slotsGrid.innerHTML = `<div class="slots-loading">Buscando horários disponíveis…</div>`;
    document.getElementById('btn-to-step3').disabled = true;

    try {
      const res = await fetch(
        `${API}/api/public/availability?date=${dateStr}&service_id=${this.state.selectedService.id}`
      );
      const json = await res.json();
      const slots = json.data?.slots || [];

      if (!slots.length) {
        this.el.slotsGrid.innerHTML =
          `<div class="slots-empty">Nenhum horário disponível nesta data.<br>Escolha outro dia.</div>`;
        return;
      }

      this.state.slots = slots;
      this.el.slotsGrid.innerHTML = slots.map(s =>
        `<button class="slot-btn" data-start="${s.start}" data-end="${s.end}"
           onclick="BookingWidget.selectSlot('${s.start}','${s.end}')">${s.start}</button>`
      ).join('');
    } catch {
      this.el.slotsGrid.innerHTML =
        `<div class="slots-empty">Erro ao carregar horários. Tente novamente.</div>`;
    }
  },

  selectSlot(start, end) {
    this.state.selectedSlot = { start, end };
    document.querySelectorAll('.slot-btn').forEach(el => {
      el.classList.toggle('selected', el.dataset.start === start);
    });
    document.getElementById('btn-to-step3').disabled = false;
    document.getElementById('btn-to-step3').style.opacity = '1';
  },

  // ─── Navegação entre steps ────────────────────────────────────
  goToStep(step) {
    // Validações
    if (step === 2 && !this.state.selectedService) return;
    if (step === 3 && (!this.state.selectedDate || !this.state.selectedSlot)) return;

    this.state.step = step;

    // Atualiza abas
    this.el.tabs.forEach((tab, i) => {
      tab.classList.remove('active', 'done');
      if (i + 1 === step) tab.classList.add('active');
      if (i + 1 < step)  tab.classList.add('done');
    });

    // Mostra step correto
    this.el.steps.forEach((el, i) => {
      el.style.display = i + 1 === step ? 'block' : 'none';
    });

    // Preenche resumo no step 3
    if (step === 3) this.fillSummary();

    // Scroll para o widget
    document.getElementById('agendamento')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  fillSummary() {
    const svc = this.state.selectedService;
    const [y, m, d] = this.state.selectedDate.split('-');
    const dateFormatted = `${d}/${m}/${y}`;

    if (this.el.sumService) this.el.sumService.textContent = svc.name;
    if (this.el.sumDate)    this.el.sumDate.textContent    = dateFormatted;
    if (this.el.sumTime)    this.el.sumTime.textContent    =
      `${this.state.selectedSlot.start} – ${this.state.selectedSlot.end}`;
    if (this.el.sumPrice)   this.el.sumPrice.textContent   =
      parseFloat(svc.price) > 0 ? this.formatPrice(svc.price) : 'Gratuito';
  },

  // ─── Envio do formulário ──────────────────────────────────────
  async submitBooking() {
    const name  = this.el.inputName?.value.trim();
    const phone = this.el.inputPhone?.value.trim();
    const email = this.el.inputEmail?.value.trim();
    const notes = this.el.inputNotes?.value.trim();

    // Validação
    let valid = true;
    if (!name)  { this.showError('err-name', 'Informe seu nome completo'); valid = false; }
    else          this.hideError('err-name');
    if (!phone) { this.showError('err-phone', 'Informe seu telefone'); valid = false; }
    else          this.hideError('err-phone');
    if (!valid) return;

    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.textContent = 'Confirmando…';

    try {
      const res = await fetch(`${API}/api/public/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          service_id: this.state.selectedService.id,
          date: this.state.selectedDate,
          start_time: this.state.selectedSlot.start,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Erro ao agendar');

      // Sucesso!
      this.showSuccess(name, json.data);
    } catch (err) {
      this.showError('err-submit', err.message || 'Não foi possível concluir o agendamento.');
      btn.disabled = false;
      btn.textContent = 'Confirmar Agendamento';
    }
  },

  showSuccess(name, data) {
    this.el.steps.forEach(el => el.style.display = 'none');
    this.el.tabs.forEach(tab => tab.classList.add('done'));

    const successEl = document.getElementById('booking-success');
    successEl.style.display = 'block';

    const [y, m, d] = data.date.split('-');
    document.getElementById('success-name').textContent    = name.split(' ')[0];
    document.getElementById('success-service').textContent = data.service_name;
    document.getElementById('success-date').textContent    = `${d}/${m}/${y}`;
    document.getElementById('success-time').textContent    = `${data.start_time} – ${data.end_time}`;
  },

  resetWidget() {
    this.state = {
      step: 1, services: this.state.services,
      selectedService: null, currentMonth: new Date(),
      selectedDate: null, slots: [], selectedSlot: null, loading: false,
    };
    document.getElementById('booking-success').style.display = 'none';
    this.el.steps.forEach((el, i) => { el.style.display = i === 0 ? 'block' : 'none'; });
    this.el.tabs.forEach((tab, i) => {
      tab.classList.remove('active', 'done');
      if (i === 0) tab.classList.add('active');
    });
    this.el.slotContainer.style.display = 'none';
    this.renderServices();
    this.renderCalendar();
  },

  // ─── Helpers ─────────────────────────────────────────────────
  formatPrice(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  },

  formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  },

  showError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.add('show'); }
  },

  hideError(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  },

  skeletonServices() {
    return Array(3).fill(0).map(() => `
      <div class="booking-service-item skeleton" style="opacity:.5">
        <div>
          <div class="bsi-name" style="width:180px;height:14px;background:var(--gray-light);margin-bottom:8px"></div>
          <div class="bsi-meta" style="width:120px;height:11px;background:var(--gray-light)"></div>
        </div>
      </div>
    `).join('');
  },
};

// Inicia quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('booking-widget')) BookingWidget.init();
});
